# Codex Setup

Codex setup is now covered in one place: [CLI Support](cli-support.md).

Use **Gofer: Initialize Repository** or **Gofer: Update Templates** in VS Code.
Gofer will generate `.agents/skills/` in the repository, emit the legacy
`.system/skills/` mirror for older Gofer compatibility, and leave
`codex-config.toml` as an optional path-based override sample.

Restart Codex after the update.
