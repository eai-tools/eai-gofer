# Golden Task Regression Suite

Golden tasks are known-good feature specifications that are validated on every
test run. They ensure that changes to validation scripts, artifact schemas, or
command prompts don't silently break artifact quality.

## Structure

```
tests/regression/
  golden-tasks/
    001-engineering-remediation/   # Curated from real feature
      spec.md
      plan.md
      tasks.md
    002-sample-feature/            # Synthetic with valid structure
      spec.md
    003-minimal-spec/              # Minimum valid spec
      spec.md
  validate-golden-tasks.test.ts    # Test runner
  README.md                        # This file
```

## How to Add a Golden Task

1. Create a new directory under `tests/regression/golden-tasks/` using the
   naming convention `NNN-description/`
2. Add spec.md, plan.md, and/or tasks.md with valid frontmatter and required
   sections
3. Verify the artifacts pass validation:
   ```bash
   bash .specify/scripts/bash/validate-artifact.sh tests/regression/golden-tasks/NNN-description/spec.md --json
   ```
4. Commit the golden task

## Naming Convention

- Directories: `NNN-description/` (e.g., `001-engineering-remediation/`)
- Sequential numbering starting from 001
- Description should be kebab-case

## Curation Criteria

- Must pass all validation via `validate-artifact.sh`
- Should represent real usage patterns when possible
- Keep fixtures small (strip large content sections)
- All required frontmatter fields must be present per artifact schemas

## Minimum Required Artifacts

- At minimum, each golden task must have a `spec.md`
- `plan.md` and `tasks.md` are optional but recommended for comprehensive
  coverage

## Running Tests

```bash
npx vitest run tests/regression/validate-golden-tasks.test.ts
```

Tests also run as part of `npm test` since the vitest config includes
`tests/**/*.test.ts`.
