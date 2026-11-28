#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Bind a maintainer's private review record to an exact release operation."""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from check_release_docs import REVIEWERS, inventory, verification_errors
from package_candidate import package
from package_identity import channel_for

REPO = "senyo888/thermal-intelligence"
REPO_ID = 1433216630
WEB = "https://github.com/" + REPO
BRANCH = {"stable": "main", "rc": "develop", "beta": "senyo888-patch-1"}
OPERATIONS = ("tag", "beta-distribute", "closeout", "beta-closeout")


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def blob(sha, path):
    return subprocess.check_output(["git", "show", sha + ":" + path])


def api(path, *args):
    return json.loads(subprocess.check_output(["gh", "api", "repos/" + REPO + "/" + path, *args]))


def checked_sha(value):
    require(isinstance(value, str) and re.fullmatch("[0-9a-f]{40}", value), "Expected a full commit SHA")
    return value


def target(source, docs, note, operation, assets):
    identity = inventory(checked_sha(source), checked_sha(docs))
    require(identity["release_commit"] == source and identity["documentation_commit"] == docs,
            "The identities must be commits")
    require(operation in OPERATIONS, "Unknown release operation")
    if operation.startswith("beta-"):
        require(identity["release_channel"] == "beta", "Untagged delivery is only available for betas")
    require(re.fullmatch(r"docs/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.md", note),
            "Expected a release note under docs/")
    require(subprocess.check_output(["git", "ls-tree", docs, "--", note]).startswith(b"100644 blob "),
            "Expected a tracked regular release note")
    package(source, assets, marketplace=True)
    return identity, {
        "schema": 1, "repository_id": REPO_ID, "operation": operation,
        "version": identity["release_version"], "channel": identity["release_channel"],
        "source": source, "docs": docs, "note": note, "note_sha256": sha256(blob(docs, note)),
        "files": {p.name: sha256(p.read_bytes()) for p in sorted(assets.iterdir())},
    }


def attest(record, identity, expected):
    errors = verification_errors(identity, record, expected["operation"].endswith("closeout"))
    require(not errors, "\n".join(errors))
    record_hash = sha256(json.dumps(record, sort_keys=True, separators=(",", ":")).encode())
    title = record.get("release_title")
    require(isinstance(title, str) and bool(title.strip()), "Enter the approved release_title in the private record")
    findings = {role: sha256(record["reviews"][role]["finding"].encode()) for role in REVIEWERS}
    return {**expected, "title": title, "record_sha256": record_hash, "reviews": findings}


def validate_attestation(receipt, expected):
    require(isinstance(receipt, dict), "Missing maintainer attestation")
    reviews = receipt.get("reviews")
    require(isinstance(reviews, dict) and set(reviews) == set(REVIEWERS)
            and all(isinstance(s, str) and re.fullmatch("[a-f0-9]{64}", s) for s in reviews.values()),
            "Four attested findings are required")
    record_hash = receipt.get("record_sha256")
    require(isinstance(record_hash, str) and re.fullmatch("[a-f0-9]{64}", record_hash),
            "Missing private review record digest")
    require(isinstance(receipt.get("title"), str) and receipt["title"].strip(), "Missing approved release title")
    require(receipt == {**expected, "title": receipt["title"], "record_sha256": record_hash, "reviews": reviews},
            "Maintainer attestation differs from the requested operation, revisions, note or package")


def check_candidate(candidate):
    branch = BRANCH[candidate["channel"]]
    head = api("branches/" + branch)["commit"]["sha"]
    subprocess.run(["git", "merge-base", "--is-ancestor", candidate["source"], checked_sha(head)], check=True)
    runs = api("actions/workflows/foundation.yml/runs?event=push&branch=" + branch
               + "&head_sha=" + candidate["source"])["workflow_runs"]
    workflow = ".github/workflows/foundation.yml"
    require(blob(candidate["source"], workflow) == blob(checked_sha(os.environ["GITHUB_SHA"]), workflow),
            "Candidate Project checks must use the trusted main workflow")
    require(runs and runs[0]["conclusion"] == "success" and runs[0]["head_sha"] == candidate["source"],
            "The package commit needs successful Project checks on its release branch")
    run = runs[0]
    jobs = api(f"actions/runs/{run['id']}/attempts/{run['run_attempt']}/jobs?per_page=100")["jobs"]
    require({j["name"] for j in jobs if j["conclusion"] == "success"} >= {"frontend", "foundation"},
            "Mandatory foundation and frontend jobs must both pass on this attempt")


def check_tag_rules(app_id, pinned=None):
    """Require separate creation and immutability rules, including all official tags."""
    require(re.fullmatch("[1-9][0-9]*", app_id), "Missing release App ID")
    active = api("rulesets?per_page=100")
    protected = {}
    for item in active:
        if item["target"] != "tag" or item["enforcement"] != "active":
            continue
        rule = api(f"rulesets/{item['id']}")
        refs = rule["conditions"].get("ref_name", {})
        if refs.get("exclude") or "refs/tags/v*" not in refs.get("include", []):
            continue
        kinds = {entry["type"] for entry in rule["rules"]}
        # GitHub hides bypass actors from tokens without ruleset write access.
        # The owner pins the visible configuration and its revision at attestation.
        revision = [rule["id"], rule["updated_at"]]
        actors = rule.get("bypass_actors")
        if actors is None and pinned is not None:
            for kind in kinds & {"creation", "update", "deletion"}:
                if pinned.get(kind) == revision:
                    protected[kind] = revision
            continue
        if actors == []:
            protected.update({kind: revision for kind in kinds & {"update", "deletion"}})
        if (len(actors or []) == 1 and actors[0].get("actor_type") == "Integration"
                and actors[0].get("actor_id") == int(app_id) and actors[0].get("bypass_mode") == "always"
                and "creation" in kinds):
            protected["creation"] = revision
    require(set(protected) == {"creation", "update", "deletion"}, "Official tag rules are incomplete or allow bypass")
    return protected


def remote_tag(tag):
    ref = "refs/tags/" + tag
    lines = subprocess.check_output(["git", "ls-remote", WEB + ".git", ref, ref + "^{}"], text=True)
    refs = {name: sha for sha, name in (line.split() for line in lines.splitlines())}
    return refs.get(ref + "^{}", refs.get(ref))


def create_tag(receipt):
    require(receipt["operation"] == "tag", "Tag creation needs a tag attestation")
    tag = "v" + receipt["version"]
    source = receipt["source"]
    run_id = os.environ["GITHUB_RUN_ID"]
    marker = {"schema": "ti-release-tag/1", "run": run_id, "source": source, "version": receipt["version"],
              "docs": receipt["docs"], "title": receipt["title"], "note_sha256": receipt["note_sha256"],
              "files": receipt["files"], "record_sha256": receipt["record_sha256"]}
    message = json.dumps(marker, sort_keys=True)
    if remote_tag(tag) is None:
        obj = api("git/tags", "--method", "POST", "-f", "tag=" + tag, "-f", "message=" + message,
                  "-f", "object=" + source, "-f", "type=commit")
        api("git/refs", "--method", "POST", "-f", "ref=refs/tags/" + tag, "-f", "sha=" + checked_sha(obj["sha"]))
    require(remote_tag(tag) == source and tagged_delivery(tag) == marker,
            "Conflicting tag or tag was not created by this approved run")


def tagged_delivery(tag):
    ref = api("git/ref/tags/" + tag)["object"]
    require(ref["type"] == "tag", "Expected a CI-created annotated release tag")
    obj = api("git/tags/" + checked_sha(ref["sha"]))
    marker = json.loads(obj["message"])
    require(marker["schema"] == "ti-release-tag/1" and obj["tag"] == tag
            and obj["object"]["type"] == "commit" and obj["object"]["sha"] == marker["source"],
            "Invalid release tag provenance")
    return marker


def approved_delivery(current, run_id, directory):
    require(re.fullmatch("[1-9][0-9]*", run_id), "Closeout needs the successful delivery run ID")
    run = api("actions/runs/" + run_id)
    require(run["repository"]["id"] == REPO_ID and run["head_branch"] == "main"
            and run["event"] == "workflow_dispatch" and run["path"] == ".github/workflows/release-gate.yml"
            and run["actor"]["login"] == "senyo888" and run["conclusion"] == "success",
            "Delivery run did not pass on the trusted release workflow")
    subprocess.run(["git", "merge-base", "--is-ancestor", checked_sha(run["head_sha"]), "origin/main"], check=True)
    if current["operation"] == "closeout":
        delivery = tagged_delivery("v" + current["version"])
        require(delivery["run"] == run_id, "Tag belongs to a different delivery run")
    else:
        name = f"delivery-{run_id}-{run['run_attempt']}"
        subprocess.run(["gh", "run", "download", run_id, "-R", REPO, "-n", name, "-D", str(directory)], check=True)
        delivery = json.loads((directory / "receipt.json").read_text())
        require(delivery["operation"] == "beta-distribute" and delivery["run"] == run_id,
                "Expected the original successful beta delivery")
    require(all(delivery[k] == current[k] for k in ("version", "source", "files", "note_sha256", "title")),
            "Original delivery differs from the approved release")
    return delivery


def public_stable():
    tag = api("releases/latest")["tag_name"]
    require(tag.startswith("v") and channel_for(tag[1:]) == "stable", "Invalid latest stable tag")
    return {"tag": tag, "source": checked_sha(remote_tag(tag))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("attest", "authorize", "create-tag", "verify"))
    parser.add_argument("--operation", choices=OPERATIONS, required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--docs", required=True)
    parser.add_argument("--note", required=True)
    parser.add_argument("--record", type=Path)
    parser.add_argument("--out", required=True, type=Path, help="New or empty output directory")
    parser.add_argument("--delivery-run", default="")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    require(not any(args.out.iterdir()), "Use a fresh output directory")
    with tempfile.TemporaryDirectory() as temp:
        assets = Path(temp) / "package"
        identity, expected = target(args.source, args.docs, args.note, args.operation, assets)
        if expected["channel"] != "stable":
            expected["public_stable"] = public_stable()
        if args.operation.startswith("beta-"):
            require(remote_tag("v" + expected["version"]) is None, "This beta already has a tag")
        if args.action == "attest":
            require(args.record is not None, "Supply the completed private record")
            record = json.loads(args.record.read_text())
            if "public_stable" in expected:
                require(record.get("public_stable") == expected["public_stable"],
                        "Identify the reviewed public stable tag and source in the private record")
            receipt = attest(record, identity, expected)
            if args.operation == "tag":
                receipt["tag_rules"] = check_tag_rules(os.environ["RELEASE_APP_ID"])
        else:
            receipt = json.loads(os.environ["RELEASE_ATTESTATION"])
            if args.operation == "tag":
                pinned = receipt.pop("tag_rules", None)
                require(isinstance(pinned, dict) and
                        check_tag_rules(os.environ["RELEASE_APP_ID"], pinned) == pinned,
                        "Tag rules have changed since attestation")
            validate_attestation(receipt, expected)
            if args.action == "create-tag":
                create_tag(receipt)
            elif args.action == "authorize":
                check_candidate(receipt)
            elif args.action == "verify":
                require(args.operation.endswith("closeout"), "Expected a closeout attestation")
                directory = Path(temp) / "delivery"
                approved_delivery(receipt, args.delivery_run, directory)
                from verify_live_release import verify_live
                result = verify_live(receipt, assets, directory)
                result["delivery_run"] = args.delivery_run
                (args.out / "verified.json").write_text(json.dumps(result, indent=2) + "\n")
        if args.action == "authorize" and args.operation == "beta-distribute":
            shutil.copytree(assets, args.out / "package")
        if args.action != "attest":
            # Keep individual reviews private; the aggregate digest identifies the owner's archived record.
            receipt = {**expected, "title": receipt["title"], "record_sha256": receipt["record_sha256"]}
            if os.environ.get("GITHUB_RUN_ID"):
                receipt["run"] = os.environ["GITHUB_RUN_ID"]
                receipt["attempt"] = os.environ["GITHUB_RUN_ATTEMPT"]
        (args.out / "receipt.json").write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")



if __name__ == "__main__":
    main()
