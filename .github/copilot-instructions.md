# Copilot Instructions

## Project Overview

**gofer** is a Unknown project.

## Gofer Pipeline

This project uses Gofer for spec-driven development. Run `/0_business_scenario` to start the full pipeline: research -> specify -> plan -> tasks -> implement -> validate.

Key commands: `/1_gofer_research`, `/2_gofer_specify`, `/3_gofer_plan`, `/4_gofer_tasks`, `/5_gofer_implement`, `/6_gofer_validate`. Use `/7_gofer_save` and `/8_gofer_resume` for session continuity. Artifacts in `.specify/specs/{feature}/`.

## Code Quality

### Code Conventions

- Follow existing code style and naming conventions in this project
- Write clear, self-documenting code with descriptive names
- Keep functions focused and small
- Add comments only where the logic is not self-evident
- Handle errors at appropriate boundaries

## Task Management

1. **Plan First**: Write plan with checkable items before starting
2. **Track Progress**: Mark items complete as you go
3. **Verify**: Run tests and demonstrate correctness before marking done
4. **Capture Lessons**: Update lessons file after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
