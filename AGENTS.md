# AGENTS.md

**Project**: gofer | **Language**: Unknown | **Package Manager**: Not detected

## Commands

No commands detected. Add build/test/lint scripts to your project.

## Code Style

### Code Conventions

- Follow existing code style and naming conventions in this project
- Write clear, self-documenting code with descriptive names
- Keep functions focused and small
- Add comments only where the logic is not self-evident
- Handle errors at appropriate boundaries

## Testing

- Write tests for new functionality before marking tasks complete
- Run the full test suite before committing

## Git Workflow

- Use conventional commit messages (feat:, fix:, chore:, docs:)
- Create feature branches for new work
- Run tests and linting before committing

## Gofer Pipeline

This project uses Gofer for spec-driven development. Run `/0_business_scenario` to start the pipeline (research -> specify -> plan -> tasks -> implement -> validate). Artifacts in `.specify/specs/{feature}/`.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
