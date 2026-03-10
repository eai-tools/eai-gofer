# Gofer - Copilot Instructions

## Project Overview

TypeScript VSCode extension monorepo: `extension/`, `language-server/`, `docs/`. Built with Webpack, tested with Vitest, packaged with vsce. Uses Gofer for spec-driven development.

## Gofer Pipeline

Run `/0_business_scenario` to start the full pipeline: research -> specify -> plan -> tasks -> implement -> validate. Artifacts go to `.specify/specs/{feature}/`.

| Command | Purpose |
| --- | --- |
| `/0_business_scenario` | Start full pipeline from triage |
| `/1_gofer_research` | Deep codebase research |
| `/2_gofer_specify` | Create feature specification |
| `/3_gofer_plan` | Technical architecture plan |
| `/4_gofer_tasks` | Task breakdown |
| `/5_gofer_implement` | Execute implementation |
| `/6_gofer_validate` | Engineering quality validation |
| `/7_gofer_save` / `/8_gofer_resume` | Session continuity |

## Commands

```bash
npm install && cd extension && npm run compile  # Build
npm test                                         # Test
npm run lint && npm run format                   # Quality
./release-auto.sh patch "Fix X"                  # Release (ALWAYS use this)
```

## Code Quality

- Explicit return types on all functions, no `any` (use `unknown`)
- ES6 imports only, never `require()`
- Conventional commits: `type(scope): subject`
- Prettier: singleQuote, printWidth 100, tabWidth 2

## Task Management

1. **Plan First**: Write plan with checkable items before starting
2. **Track Progress**: Mark items complete as you go
3. **Verify**: Run tests and demonstrate correctness before marking done
4. **Capture Lessons**: Update lessons file after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
