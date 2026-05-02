# C4 Container: 030-vscode-surface-truth-cleanup

This container view keeps the maintenance context explicit. The cleanup is
implemented through a small set of repo-owned containers: the manifest and
runtime contract surfaces that define actual behavior, the Markdown
documentation and canonical command sources that must follow that behavior, the
existing generation pipeline that emits mirror artifacts, and the Vitest parity
suite that guards against drift returning. The Gofer maintainer is the only
persona shown because this work is primarily about maintaining a truthful VS
Code extension surface, not introducing new end-user runtime flows or
deployment infrastructure.

```mermaid
C4Container
    title Containers for 030-vscode-surface-truth-cleanup

    Person(goferMaintainer, "Gofer maintainer", "Audits and updates the repo-owned VS Code surface.")
    System_Ext(vsCode, "VS Code", "Presents the public command and settings surface.")
    System_Ext(generatedMirrors, "Generated mirrors (.claude/, .github/, .gemini/, .agents/, .system/)", "Receive derived command and prompt artifacts.")

    Container_Boundary(c1, "VS Code Surface Truth Cleanup") {
        Container(contractAlignment, "Manifest and runtime contract alignment", "JSON + TypeScript, VS Code Extension API", "Uses extension/package.json, extension.ts, CommandRegistry.ts, config.ts, specCommands.ts, and bundled resources as the authoritative contract and corrects proven drift.")
        Container(docsSources, "Documentation and canonical command sources", "Markdown", "Holds extension/README.md, README.md, docs/guides/configuration.md, and .specify/commands/*.md so active guidance and canonical command text match the supported surface.")
        Container(generatorPipeline, "Generation and mirror sync pipeline", "Node.js ESM + TypeScript scripts", "Runs scripts/generate-commands.ts, .specify/scripts/node/generate-commands.mjs, and existing sync behavior to regenerate derived mirrors without destructive workspace cleanup.")
        Container(parityValidation, "Parity validation suite", "Vitest", "Runs command-registration and command-generation checks, and only adds narrow parity assertions when a verified gap would otherwise let drift return.")
    }

    Rel(goferMaintainer, contractAlignment, "Audits and updates")
    Rel(goferMaintainer, docsSources, "Reviews and edits")
    Rel(docsSources, contractAlignment, "Aligns guidance and canonical command text to", "Markdown updates")
    Rel(contractAlignment, vsCode, "Keeps commands, menus, keybindings, and settings truthful in", "Extension contributions")
    Rel(docsSources, generatorPipeline, "Supplies canonical .specify command content to", "Markdown input")
    Rel(generatorPipeline, generatedMirrors, "Emits derived command and prompt artifacts to", "Generated files")
    Rel(parityValidation, contractAlignment, "Verifies manifest and runtime parity for", "Vitest assertions")
    Rel(parityValidation, generatorPipeline, "Verifies canonical-to-mirror parity for", "Vitest assertions")
```

## Notes

- The diagram intentionally models repo-maintenance containers instead of new
  app infrastructure.
- No new dependency, datastore, or deployment target is introduced by this
  feature.
- Non-destructive sync behavior remains part of the existing generation and
  resource flow.
