<!-- regenerated at 2026-05-27T23:39:03Z -->

# Diagnose Report

## Provenance

- `GeneratedAt`: `2026-05-27T23:39:03Z`
- `SourceCommandId`: `gofer:diagnose`
- `SourceInputs`:
  - User report: `claude plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer --scope user`
  - Observed failure: `HTTP 404 error while downloading marketplace`
  - Live checks:
    - `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer` -> `404`
    - `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/claude-marketplace.json` -> `200`
    - `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/copilot-marketplace.json` -> `200`
- `OverwriteNoticeWhenApplicable`: `not applicable`

## Reproduce

1. Run the published Claude install command against the bundle directory URL:

   ```bash
   claude plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer --scope user
   ```

2. Claude requests a remote marketplace document from the exact URL.
3. GitHub Pages redirects to the directory form and then returns `404` because the path is a directory, not a JSON file.

## Minimize

- The failure does not depend on plugin contents.
- The smallest failing slice is a plain HTTP request to the directory URL.
- The smallest passing slice is a request to the explicit marketplace JSON file inside the same directory.

## Instrument

- Verified live HTTP behavior with `curl -I -L`:
  - bundle directory root returns `301` then `404`
  - `claude-marketplace.json` returns `200 application/json`
  - `copilot-marketplace.json` returns `200 application/json`
- Inspected generated docs and release outputs and found they were emitting directory URLs for Claude and Copilot install commands.
- Confirmed the packaged bundle already contains the correct per-surface files; the bug was the emitted install path, not the packaged artifact structure.

## Fix

- Change generated install instructions to use explicit public JSON endpoints:
  - Claude: `claude-marketplace.json`
  - Copilot: `copilot-marketplace.json`
  - Codex: `codex-plugin.json` with `codex-marketplace.json` as fallback guidance
  - Gemini: `gemini-extension.json`
- Keep the shared bundle directory URL for direct browsing and zip replacement only.
- Regenerate the packaged plugin README and public release mirror so the corrected URLs appear in:
  - root `README.md`
  - packaged `plugins/eai-gofer/README.md`
  - public `docs-site/static/releases.html`
  - GitHub release notes template
  - `release.sh` completion summary
