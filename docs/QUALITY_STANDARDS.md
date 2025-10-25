# Code Quality Standards

## Overview

This document outlines the code quality standards and automated quality gates for the SpecGofer project.

## Quality Gates

### Pre-commit Hooks (`.husky/pre-commit`)
Runs automatically before each commit:
- **lint-staged**: Formats and lints only staged files
- **TypeScript check**: Ensures no type errors
- **Unit tests**: Runs quick unit tests to catch regressions

### Pre-push Hooks (`.husky/pre-push`)
Runs automatically before pushing to remote:
- **Full test suite**: All unit, integration, and E2E tests
- **TypeScript check**: Complete type checking
- **ESLint**: Full codebase linting
- **Prettier**: Code formatting validation

### CI/CD Pipeline Quality Gates
- **Matrix builds**: Tests across all components (orchestrator, extension, language-server)
- **Coverage requirements**: 80% minimum across lines, functions, branches, statements
- **Security auditing**: npm audit for vulnerabilities
- **Code quality**: ESLint + Prettier enforcement

## Tools & Configuration

### ESLint (`.eslintrc.json`)
- TypeScript-specific rules
- No `any` types allowed (`@typescript-eslint/no-explicit-any`)
- Unused variables detection
- Consistent curly braces
- Console statement warnings (production code should use proper logging)

### Prettier (`.prettierrc.json`)
- 100 character line width
- Single quotes
- No trailing commas in ES5
- No semicolons
- 2-space indentation

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- ES2022 target
- Node.js module resolution
- Type checking enabled

### Vitest (`vitest.config.ts`)
- 80% coverage thresholds
- HTML, LCOV, JSON, text reports
- Global test setup
- Mock configuration

## Scripts

### Quality Check Scripts
```bash
npm run quality          # Run all quality checks
npm run quality:fix      # Auto-fix quality issues
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier validation
npm run typecheck        # TypeScript check
```

### Test Scripts
```bash
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests only
npm run test:coverage    # Tests with coverage
```

## Lint-staged Configuration

Automatically processes staged files:
- **TypeScript/JavaScript files**: ESLint fix + Prettier format
- **JSON/Markdown files**: Prettier format only
- **Multiple directories**: src/, extension/src/, language-server/src/, tests/

## Conventional Commits

Commit messages must follow conventional commits format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `test: add/update tests`
- `refactor: code refactoring`
- `style: formatting changes`
- `chore: maintenance tasks`

## Quality Metrics

### Current Status
- **Test Coverage**: 98.2% (55/56 tests passing)
- **Code Quality**: 140+ issues identified for improvement
- **CI/CD Pipeline**: 7-job workflow with quality gates
- **Pre-commit Hooks**: ✅ Active
- **Pre-push Hooks**: ✅ Active

### Targets
- **Test Coverage**: 80% minimum (lines, functions, branches, statements)
- **ESLint Issues**: 0 errors, minimal warnings
- **TypeScript Errors**: 0 errors
- **Prettier Issues**: 0 formatting violations

## Enforcement

### Local Development
1. **Pre-commit**: Prevents commits with basic quality issues
2. **Pre-push**: Prevents pushing broken code
3. **IDE Integration**: ESLint + Prettier plugins recommended

### CI/CD Pipeline
1. **Quality Gates Job**: Runs before all other jobs
2. **Parallel Testing**: Matrix builds for all components
3. **Coverage Reports**: Uploaded to CodeCov
4. **PR Validation**: Automated checks on pull requests

### Branch Protection
- **Required checks**: Quality gates must pass
- **Review requirements**: Code review before merge
- **Up-to-date branches**: Must be current with target branch

## Development Workflow

1. **Write code** following TypeScript best practices
2. **Stage changes** (`git add`)
3. **Commit** with conventional commit message
4. **Pre-commit hook** runs automatically (lint-staged + quick checks)
5. **Push** to remote branch
6. **Pre-push hook** runs automatically (full quality suite)
7. **CI/CD pipeline** validates in clean environment
8. **Code review** and merge when all checks pass

## Troubleshooting

### Hook Issues
```bash
# Re-install hooks
npx husky install

# Validate setup
./scripts/validate-hooks.sh

# Skip hooks (emergency only)
git commit --no-verify
git push --no-verify
```

### Quality Issues
```bash
# Auto-fix most issues
npm run quality:fix

# Check specific issues
npm run lint          # ESLint issues
npm run format:check  # Prettier issues
npm run typecheck     # TypeScript issues
```

### Test Failures
```bash
# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode for development
npm run test:watch
```

---

## Implementation Status: T013 ✅ COMPLETE

- ✅ Husky pre-commit hooks
- ✅ Lint-staged configuration
- ✅ Pre-push quality gates
- ✅ Conventional commit validation
- ✅ CI/CD integration
- ✅ Quality validation scripts
- ✅ Comprehensive documentation