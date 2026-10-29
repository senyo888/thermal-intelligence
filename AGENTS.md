# Working on Thermal Intelligence

Thermal Intelligence is created and maintained by **Senyo (senyo888)**. Lead public content with the product's purpose and capabilities. Keep README, Wiki, website and release notes in plain, natural language with consistent terminology.

## Engineering

- Read [Architecture](ARCHITECTURE.md), [Configuration](docs/card-configuration.md) and [Compatibility](docs/compatibility.md). Verify the checkout, branch and working tree before editing; preserve concurrent work.
- Keep beta packages on `senyo888-patch-1`. Prepare release candidates through `develop`, which contains the candidate source, tests and reproducible package. `main` remains the public documentation and website branch until a separately approved promotion. Dependency-monitoring configuration on `main` does not promote a runtime package.
- Preserve the established card layout, dial, typography, icon alignment, dialogs and staggered LED animation. Compare UI changes at phone, tablet and desktop widths using synthetic fixtures.
- Keep mode, preset, ownership, reported activity and physical response distinct. UI follows provider evidence. Preserve unknown, unavailable, stale and invalid states; unknown readiness never permits fallback controls.
- Commands require explicit user intent and a captured target. Setup, rendering, editor saves and reconnects must never send thermostat commands or replay earlier requests.
- Preserve unknown configuration fields and independent per-card settings. Do not silently remove functionality.
- Make small, explainable changes; update the relevant documentation and run checks appropriate to the change. Keep implementation, tests, publication and deployment claims separate.

## Public and private material

- Publish product guidance, useful contributor contracts and concise release notes. Keep conversations, requests, design briefs, prompts, decision journals, internal reviews and raw operational evidence in ignored `.private/` or `AGENTS.local.md`.
- Use synthetic public examples and privacy-reviewed images. Keep `assets/` for selected images; public image context belongs in [Image notes](docs/image-notes.md). Preserve required licence notices.
- Before publication, check links, rendered presentation, private-data boundaries, tracked files and Git history with redacted secret scans. A clean secret scan does not establish that correspondence is suitable for publication.
- Never publish credentials, private entities, local paths, home topology or unredacted diagnostics. Existing public history needs separate consideration; `.gitignore` does not erase it.
- Use **Senyo** or **senyo888** when addressing the public about the project's owner. Keep internal approval narratives and unnecessary AI references out of product copy.

## Review roles

Bella reviews product and cross-surface coherence; Aetherwing reviews runtime, release and privacy safety; Aetherbite considers bounded alternatives. Preserve independent findings and substantive disagreement. Use proportionate review, not a mandatory ceremony for routine documentation.

AetherCore remains dormant unless explicitly invoked for a bounded, read-only advisory review. It cannot implement, approve, schedule or create child reviews. Formal tags/releases require its manually requested finding, Bella/Aetherwing verification, release checks and Senyo's approval of the exact release presentation. Ordinary authorised preparation and untagged beta publication are separate activities.

Reviews do not expand the user's authority. Deployment, restarts, external messages and changes to existing installations require their applicable scope. Keep one accountable orchestration owner and report what changed, checks actually run and remaining limits.
