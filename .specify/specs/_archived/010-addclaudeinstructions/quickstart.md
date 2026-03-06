# Quickstart: Default AI Instruction Files

## Prerequisites

- Node.js 20.x LTS
- VSCode with Gofer extension installed
- A workspace with a project (package.json, pyproject.toml, go.mod, etc.)

## Setup

1. Install dependencies: `npm install`
2. Compile extension: `cd extension && npm run compile`
3. Run tests: `npm test`

## Testing the Feature

### Manual Testing

1. Open a workspace that has NO AGENTS.md, CLAUDE.md, or
   `.github/copilot-instructions.md`
2. Run Command Palette > "Gofer: Initialize Repository"
3. Verify all three files are created with project-appropriate content
4. Verify CLAUDE.md is < 60 lines and includes `@AGENTS.md` import
5. Verify AGENTS.md has detected commands, structure, and code style
6. Open a workspace that already HAS these files
7. Run "Gofer: Initialize Repository" again
8. Verify existing files are NOT overwritten
9. Run "Gofer: Regenerate AI Instructions" and test overwrite/skip/backup
   options

### Automated Tests

```bash
# Unit tests
npm test -- tests/unit/services/ProjectDetector.test.ts
npm test -- tests/unit/services/InstructionGenerator.test.ts
npm test -- tests/unit/services/setupDefaultInstructions.test.ts

# Integration tests
npm test -- tests/integration/instruction-generation.test.ts
```

## Key Files

| File                                                 | Purpose                                    |
| ---------------------------------------------------- | ------------------------------------------ |
| `extension/src/services/ProjectDetector.ts`          | Detects project language/framework/tools   |
| `extension/src/services/InstructionGenerator.ts`     | Assembles templates into instruction files |
| `extension/resources/instruction-templates/`         | Composable template fragments              |
| `extension/src/services/migration/ResourceSyncer.ts` | Integration point for upgrade flow         |

## Common Issues

### Issue: Wrong language detected

**Problem**: ProjectDetector identifies wrong primary language **Solution**: Run
"Gofer: Regenerate AI Instructions" to re-detect, or manually edit the generated
files

### Issue: CLAUDE.md too long

**Problem**: Generated CLAUDE.md exceeds 60 line target **Solution**: Check
template fragments for bloat; CLAUDE.md should use `@AGENTS.md` import instead
of duplicating content
