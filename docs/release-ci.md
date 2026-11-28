# Release gates in GitHub Actions

Senyo attests that Bella, Aetherwing, Aetherbite and the explicitly invoked AetherCore cleared the exact package and documents. Their findings and the installer observations stay in the private [release review record](../CONTRIBUTING.md#required-release-documentation-review). The Release gate workflow accepts Senyo’s dispatch on the current tip of main. It checks the protected attestation, version, channel, source and documentation commits, release note and the hashes of the three reproducible package files.

## Activate the controls

After promoting the workflow to main, configure these repository settings as the owner. Branch CI alone cannot restrict tag creation.

1. Create the Actions environment named **ti-release**. Under deployment branches and tags choose **Selected branches and tags** and add the single **branch** named main. Create it and restrict it before adding any credentials. Keep review of changes to main and its workflows under the maintainer’s control.
2. Install a dedicated GitHub App only on this repository. Grant it repository **Contents: Read and write** with the standard metadata permission. Put its private key in the environment secret **TI_RELEASE_PRIVATE_KEY** and its numeric App ID and client ID in the environment variables **TI_RELEASE_APP_ID** and **TI_RELEASE_CLIENT_ID**. Use this key exclusively for Release gate. Restrict administration of this environment to the maintainer.
3. Enable two repository tag rulesets, both including the pattern `v*` with no exclusions. In the first, enable **Restrict creations** and give only the dedicated App an **Always allow** bypass. In the second, enable **Restrict updates** and **Restrict deletions** with an empty bypass list. The maintainer’s command verifies these rules with owner access. CI checks their revisions again before tagging. The App needs no ruleset administration permission.
4. Confirm the settings as the owner and rehearse an ordinary writer’s rejected tag creation in a disposable repository with equivalent protections. A live release uses the approved tag operation below. Repository administrators retain the ability to change repository settings. [GitHub tag rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

## Tag the reviewed source

Use an up-to-date checkout with the release and documentation commits available, Python 3.11 or later, Git and GitHub CLI authenticated as Senyo. Set the shell variables below for the release. In the private record, enter the approved GitHub display title in `release_title`. For a beta or RC, also enter the reviewed current stable tag and full source SHA in `public_stable`. Use a fresh private output directory for each operation. The tag is derived from the package version. The note path is relative to the reviewed documentation commit.

```sh
export RELEASE_APP_ID="$(gh variable get TI_RELEASE_APP_ID --env ti-release)"
OPERATION=tag
OUT="$PRIVATE_REVIEW_DIR/tag-attestation"
python3 -B scripts/release_gate.py attest --operation "$OPERATION" --source "$SOURCE_SHA" \
  --docs "$DOCS_SHA" --note "$NOTE_PATH" --record "$PRIVATE_REVIEW_DIR/release-docs.json" --out "$OUT"
gh secret set TI_REVIEW_ATTESTATION --env ti-release < "$OUT/receipt.json"
gh workflow run release-gate.yml --ref main -f operation="$OPERATION" \
  -f source="$SOURCE_SHA" -f docs="$DOCS_SHA" -f note="$NOTE_PATH"
```

Complete one operation before replacing the environment attestation. Record the successful delivery run ID. The workflow requires the trusted main Project checks definition and successful foundation and frontend jobs on the package commit in its channel’s release branch. It derives the tag, creates it through the dedicated App and reads back its commit. The annotated tag records the creating run ID and approved release identity. An existing tag can be retried only by its original run with the same attestation. An ordinary tag pointing to the same commit cannot acquire retrospective clearance. Publish the separately approved release against that verified tag, using its approved note and the three matching downloads.

For an intentionally untagged beta, use **beta-distribute**. Its successful delivery artifact contains the reviewed module, licence and manifest for the exact beta commit. Use that run as the distribution link. Artifact downloads require a signed-in GitHub reader. The commit-pinned module and licence are also publicly readable. An ordinary branch push or a local build is development work.

## Close a release

Once the public material is live, complete the publication and installer fields privately. If the documents have advanced since tagging, refresh the four findings on the final documentation revision. Use the original package commit and the same approved release-note contents. For an untagged beta select **beta-closeout**.

```sh
OPERATION=closeout
OUT="$PRIVATE_REVIEW_DIR/closeout-attestation"
python3 -B scripts/release_gate.py attest --operation "$OPERATION" --source "$SOURCE_SHA" \
  --docs "$DOCS_SHA" --note "$NOTE_PATH" --record "$PRIVATE_REVIEW_DIR/release-docs.json" --out "$OUT"
gh secret set TI_REVIEW_ATTESTATION --env ti-release < "$OUT/receipt.json"
gh workflow run release-gate.yml --ref main -f operation="$OPERATION" \
  -f source="$SOURCE_SHA" -f docs="$DOCS_SHA" -f note="$NOTE_PATH" -f delivery_run="$DELIVERY_RUN"
```

The read-only closeout job verifies the successful delivery run and checks each public surface.

| Surface | Required observation |
| --- | --- |
| README | The live main source and rendered README match, the original brand header loads and the release and manifest badges lead to and identify the published stable version. |
| Wiki | The entire hosted Git tree matches the reviewed Wiki tree. Every source file is publicly readable. Each Markdown page, including the custom sidebar and footer, renders its reviewed text, links and images. |
| Website | The latest Pages deployment succeeded. Every built route and asset matches its live bytes. A docs-only commit may use an earlier deployment when all the files still match. |
| Tagged downloads | The remote tag resolves to the reviewed source. The public release has the approved title, channel and rendered note, including its artwork and migration guide. The module, licence and manifest each match the tagged build byte for byte. |
| Untagged beta downloads | The three files downloaded from the original successful distribution run match the approved beta build. The commit-pinned public module and licence also match. The published beta branch contains its source commit and the beta has no release tag. |

The release closes when the owner’s successful **closeout** job produces the **verified-closeout** artifact. Save it with the private record, the delivery and closeout run URLs and attempt numbers. GitHub retains these run artifacts for up to 90 days. Tagged closeout uses the permanent annotated tag and the original successful workflow run. If an untagged beta artifact expires, attest and distribute it again before closing against the fresh delivery. A failed fetch, changed revision or mismatch leaves closeout open. Correct the public surface and rerun the checks. The repository’s local checker remains available for private validation and historical rehearsals.
