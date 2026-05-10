# C4 Context — 030-vscode-surface-truth-cleanup

This diagram treats the feature as repo-owned maintenance work rather than a
new application. The boundary is the VS Code Surface Truth Cleanup effort,
whose job is to keep the shipped Gofer VS Code surface honest by aligning the
manifest, runtime wiring, documentation, bundled resources, and generated
mirrors. The main stakeholder is the Gofer maintainer, who needs a public
command and settings surface that matches current behavior. Surrounding systems
are the extension being cleaned, VS Code as the host UI, generated mirrors that
reflect canonical command text, and the existing Vitest checks that prove drift
has been removed without adding new infrastructure.

## Diagram

```mermaid
C4Context
    title System Context for 030-vscode-surface-truth-cleanup

    Person(goferMaintainer, "Gofer maintainer", "Maintains the Gofer VS Code extension and verifies that commands, settings, and workflow guidance stay truthful.")

    System(vsCodeSurfaceTruthCleanup, "VS Code Surface Truth Cleanup", "Repo-owned maintenance workflow that aligns the Gofer VS Code manifest, runtime wiring, documentation, resources, and generated mirrors to the current supported contract.")

    System_Ext(goferVsCodeExtension, "Gofer VS Code extension", "Shipped extension surface whose manifest, runtime registrations, config helpers, and packaged resources are being reconciled.")
    System_Ext(vsCode, "VS Code", "Hosts the Command Palette, menus, keybindings, and Settings UI that expose the cleaned public surface.")
    System_Ext(generatedMirrors, "Generated mirrors (.claude/, .github/, .gemini/, .agents/, .system/)", "Receive derived command and prompt artifacts.")
    System_Ext(vitest, "Vitest integration tests", "Existing manifest-to-runtime and command-generation parity checks used as regression evidence.")

    Rel(goferMaintainer, vsCodeSurfaceTruthCleanup, "Audits, corrects, and verifies")
    Rel(vsCodeSurfaceTruthCleanup, goferVsCodeExtension, "Aligns manifest, runtime, config, docs, and resource references for")
    Rel(vsCodeSurfaceTruthCleanup, vsCode, "Keeps public commands and settings truthful in")
    Rel(vsCodeSurfaceTruthCleanup, generatedMirrors, "Prunes and regenerates canonical command outputs for")
    Rel(vsCodeSurfaceTruthCleanup, vitest, "Uses as regression evidence for")
```

## Notes

- This feature is non-application repo cleanup, so the boundary is a
  maintenance workflow, not a new deployed service.
- `extension/package.json` plus live runtime registrations are the
  authoritative public contract.
- Archived specs remain historical reference only and are outside the active
  cleanup boundary.
