# Gofer - Claude Code Instructions

**Release rule**: ALWAYS use `./release-auto.sh patch|minor|major "message"`. NEVER manually edit versions, tags, or package.json.

**Project**: TypeScript VSCode extension monorepo (`extension/`, `language-server/`, `docs/`). Webpack build, Vitest tests, vsce packaging. Specs in `.specify/specs/{feature}/`. Commands in `.claude/commands/`. Agents in `.claude/agents/`.

**Commands**: `npm install` | `cd extension && npm run compile` | `npm test` | `npm run lint && npm run format` | `./release-auto.sh patch "msg"`

**Pipeline**: Run `/0_business_scenario` once - auto-chains: research -> specify -> plan -> tasks -> implement -> validate. Six validation agents score on a 100-point rubric.

## Workflow Orchestration

**1. Plan Node Default**: Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions). If something goes sideways, STOP and re-plan immediately. Write detailed specs upfront to reduce ambiguity.

**2. Subagent Strategy**: Use subagents liberally to keep main context clean. Offload research, exploration, and parallel analysis. One task per subagent for focused execution.

**3. Self-Improvement Loop**: After ANY correction from the user, update `tasks/lessons.md` with the pattern. Write rules that prevent the same mistake. Review lessons at session start.

**4. Verification Before Done**: Never mark a task complete without proving it works. Diff behavior between main and your changes. Ask: "Would a staff engineer approve this?" Run tests, check logs, demonstrate correctness.

**5. Demand Elegance (Balanced)**: For non-trivial changes, pause and ask "is there a more elegant way?" If a fix feels hacky, implement the elegant solution. Skip for simple, obvious fixes.

**6. Autonomous Bug Fixing**: When given a bug report, just fix it. Point at logs, errors, failing tests - then resolve them. Go fix failing CI without being told how.

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
