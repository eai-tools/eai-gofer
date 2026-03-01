# Quickstart: Gofer Engineering Remediation

## Prerequisites

- Node.js 20.x LTS installed
- VSCode 1.85+ installed
- Gofer extension codebase cloned
- Git working tree clean (all changes committed)
- All pre-existing tests passing (after Phase 0)

## Setup

### 1. Verify Current State

```bash
# Check current test status
npm test

# Check current LOC for God objects
wc -l extension/src/extension.ts        # Expect ~2469 LOC
wc -l extension/src/goferMigrator.ts    # Expect ~2499 LOC

# Check for magic numbers
grep -r '\b\d{3,}\b' extension/src --exclude-dir=node_modules | wc -l

# Check for silent error handlers
grep -r '\.catch\s*(\s*(\s*)\s*=>\s*{\s*}\s*)' extension/src | wc -l
```

### 2. Create Feature Branch

```bash
git checkout -b 001-gofer-engineering-remediation
```

### 3. Install New Dependencies (After Phase 1 starts)

```bash
npm install --save tsyringe reflect-metadata
npm install --save-dev ajv  # For Phase 5 input validation
```

### 4. Update TypeScript Configuration (Phase 1)

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Testing the Refactoring

### Phase 0: Foundation & Test Stabilization

**Objective**: Fix test failures and extract constants

```bash
# Fix test failures
npm test -- tests/integration/agent-stop-extraction.test.ts

# After fixing, verify all tests pass
npm test

# Extract constants
npm run compile

# Verify no magic numbers remain (should only find constants definitions)
grep -r '\b\d{3,}\b' extension/src/config
```

**Expected Result**: All tests pass, 40+ constants extracted to config/\* files

### Phase 1: Dependency Injection Infrastructure

**Objective**: Add DI container and Logger service

```bash
# Compile after adding TSyringe
npm run compile

# Test Logger injection
npm test -- tests/unit/services/Logger.test.ts

# Verify silent error handlers replaced (should return 0)
grep -r '\.catch\s*(\s*(\s*)\s*=>\s*{\s*}\s*)' extension/src | wc -l
```

**Expected Result**: DI container operational, Logger injectable, 0 silent error
handlers

### Phase 2: Cache Remediation

**Objective**: Fix unbounded cache growth

```bash
# Compile after cache fixes
npm run compile

# Test cache eviction
npm test -- tests/unit/autonomous/ObservationMasker.test.ts
npm test -- tests/unit/autonomous/MemoryStorage.test.ts

# Memory profiling (run extension for 8 hours)
# Monitor via Activity Monitor / Task Manager
# Expected: Memory stays <200MB
```

**Expected Result**: All caches bounded, memory usage stable

### Phase 3: Extension.ts Refactoring

**Objective**: Extract extension.ts into modules

```bash
# Compile after extraction
npm run compile

# Verify LOC reduction
wc -l extension/src/extension.ts                    # Expect <600 LOC
wc -l extension/src/services/CommandRegistry.ts     # Expect <600 LOC
wc -l extension/src/services/EventHandlers.ts       # Expect <600 LOC
wc -l extension/src/services/InitializationService.ts  # Expect <600 LOC
wc -l extension/src/services/DisposalService.ts     # Expect <400 LOC

# Test all commands still work
npm run test:e2e

# Measure activation time (should be <2 seconds)
# Check VSCode Developer Tools console for activation time log
```

**Expected Result**: extension.ts <600 LOC, all commands functional, activation
<2s

### Phase 4: GoferMigrator.ts Refactoring

**Objective**: Extract goferMigrator.ts into modules

```bash
# Compile after extraction
npm run compile

# Verify LOC reduction
wc -l extension/src/goferMigrator.ts  # Expect <600 LOC

# Test all migrations
npm test -- tests/integration/migration.test.ts

# Manual test: Upgrade from previous version
# 1. Install older VSIX
# 2. Install new VSIX with remediation
# 3. Verify upgrade succeeds
```

**Expected Result**: goferMigrator.ts <600 LOC, all migrations functional

### Phase 5: Documentation & Security

**Objective**: Add ADRs and input validation

```bash
# Verify ADRs created
ls -la .specify/memory/decisions/
# Expect: 001-di-framework.md, 002-module-extraction.md, etc.

# Verify architecture diagrams created
ls -la .specify/memory/diagrams/
# Expect: extension-activation.mmd, di-container.mmd, module-dependencies.mmd

# Test input validation
npm test -- tests/unit/utils/pathSanitizer.test.ts
npm test -- tests/unit/utils/rateLimiter.test.ts

# Test with invalid configuration
# 1. Modify .vscode/settings.json with invalid values
# 2. Reload extension
# 3. Expect warning logged, defaults used
```

**Expected Result**: 5 ADRs documented, 3 diagrams created, input validation
active

### Final Validation

```bash
# Run full test suite
npm test

# Run E2E tests
npm run test:e2e

# Verify all success criteria met
.specify/scripts/bash/check-success-criteria.sh

# Run validation rubric
# (This will be done via /6_gofer_validate command)
```

## Key Files

| File                                                  | Purpose                       | Phase   |
| ----------------------------------------------------- | ----------------------------- | ------- |
| `extension/src/config/timeouts.ts`                    | Timeout constants             | Phase 0 |
| `extension/src/config/thresholds.ts`                  | Threshold constants           | Phase 0 |
| `extension/src/config/limits.ts`                      | Limit constants               | Phase 0 |
| `extension/src/config/intervals.ts`                   | Interval constants            | Phase 0 |
| `extension/src/di/container.ts`                       | DI container setup            | Phase 1 |
| `extension/src/services/Logger.ts`                    | Error logging service         | Phase 1 |
| `extension/src/services/CommandRegistry.ts`           | Command registration          | Phase 3 |
| `extension/src/services/EventHandlers.ts`             | Event handler registration    | Phase 3 |
| `extension/src/services/InitializationService.ts`     | Extension initialization      | Phase 3 |
| `extension/src/services/DisposalService.ts`           | Resource disposal             | Phase 3 |
| `extension/src/services/migration/VersionDetector.ts` | Version detection             | Phase 4 |
| `extension/src/services/migration/UpgradeService.ts`  | Upgrade orchestration         | Phase 4 |
| `extension/src/services/migration/ResourceSyncer.ts`  | Resource synchronization      | Phase 4 |
| `extension/src/services/migration/PathMigrator.ts`    | Path migration                | Phase 4 |
| `extension/src/autonomous/ObservationMasker.ts`       | Bounded observation cache     | Phase 2 |
| `extension/src/autonomous/MemoryStorage.ts`           | Token-budgeted memory storage | Phase 2 |
| `extension/src/autonomous/HookBridgeWatcher.ts`       | Timer leak fixed              | Phase 2 |
| `.specify/memory/decisions/*.md`                      | Architecture Decision Records | Phase 5 |
| `.specify/memory/diagrams/*.mmd`                      | Architecture diagrams         | Phase 5 |

## Common Issues

### Issue 1: Extension activation timeout

**Problem**: Extension takes >2 seconds to activate after refactoring

**Solution**:

- Check DI container registration is synchronous
- Ensure services use lazy initialization
- Profile activation with VSCode Developer Tools
- Look for blocking operations in service constructors

### Issue 2: Tests fail after module extraction

**Problem**: Tests fail with "cannot find module" errors

**Solution**:

- Update import paths in tests to match new module structure
- Ensure barrel exports (index.ts) are configured correctly
- Check tsconfig.json includes all new directories
- Clear `node_modules` and reinstall if needed

### Issue 3: Silent error handlers still detected

**Problem**: Grep still finds `.catch(() => {})` patterns

**Solution**:

- Check for variations: `.catch(() => {})`, `.catch(()=>{})`
- Use more comprehensive regex: `\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)`
- Check for commented-out code
- Ensure Logger is imported and used in all modules

### Issue 4: Memory usage still grows unbounded

**Problem**: Memory profiling shows growth >200MB after 8 hours

**Solution**:

- Verify all caches implement LRU eviction
- Check MemoryStorage token budget is enforced
- Ensure HookBridgeWatcher clears old interval before creating new
- Profile with VSCode Memory Inspector to identify leak source

### Issue 5: Migrations fail after goferMigrator refactoring

**Problem**: Extension upgrade from older version fails

**Solution**:

- Test each migration service independently
- Verify facade preserves original migration API
- Check VersionDetector correctly identifies source version
- Ensure PathMigrator handles all path variations
- Rollback to original goferMigrator.ts if needed, debug extracted services

### Issue 6: Input validation too strict

**Problem**: Valid inputs rejected by validation

**Solution**:

- Review JSON schema for configuration validation
- Check pathSanitizer doesn't reject valid relative paths
- Ensure rate limiter thresholds are reasonable (10/min, 5/min)
- Add logging to validation failures to debug false positives

### Issue 7: DI container can't resolve service

**Problem**: `container.resolve(ServiceClass)` throws error

**Solution**:

- Verify service is registered in `di/container.ts`
- Check `@injectable()` decorator is applied to service class
- Ensure `reflect-metadata` is imported in `extension.ts`
- Verify `experimentalDecorators` and `emitDecoratorMetadata` in tsconfig.json
- Check for circular dependencies between services

## Rollback Strategy

If any phase fails validation:

1. **Stop implementation**: Don't proceed to next phase
2. **Identify issue**: Use debugging steps above
3. **Fix or rollback**: Either fix the issue or revert phase changes
4. **Re-validate**: Run tests and validation rubric again

Each phase is independently rollbackable:

```bash
# Rollback single phase
git revert <phase-commit-sha>

# Rollback entire remediation
git checkout main
```

## Monitoring & Validation

### Extension Activation Time

Check VSCode Developer Tools console:

```
[Gofer] Extension activated in X ms
```

Target: <2000ms (spec), <500ms (constitution)

### Memory Usage

Monitor via Activity Monitor (macOS) or Task Manager (Windows):

```
Code Helper (Extension Host) - Gofer
Target: <200MB over 8-hour session
```

### Cache Statistics

Add command to expose cache stats (future enhancement):

```bash
# In VSCode Command Palette
> Gofer: Show Cache Statistics

# Expected output
ObservationMasker: 85/100 entries, 120 hits, 35 misses, 15 evictions
MemoryStorage: 45k/50k tokens, 200 memories, 50 evicted
SpecCache: 90/100 entries, 500 hits, 50 misses, 10 evictions
```

### Test Coverage

```bash
npm test -- --coverage

# Target: 80%+ across all metrics
# - Line coverage ≥80%
# - Branch coverage ≥80%
# - Function coverage ≥80%
```

### Validation Rubric

Run final validation via Gofer pipeline:

```bash
# This will be triggered automatically after Phase 5 completes
# Or manually via:
/6_gofer_validate
```

Expected final scores:

- Architecture & Design: 9+/10 (currently 7/10)
- Code Quality: 9+/10 (currently 7/10)
- Performance: 9+/10 (currently 7/10)
- Testing: 9+/10 (currently 7/10)
- Error Handling: 9+/10 (currently 7/10)
- Documentation: 9+/10 (currently 7.5/10)
- Security: 9+/10 (currently 7.5/10)
- Feature Delivery: 9+/10 (currently 8.5/10)
- **Overall: 95+/100** (currently 85/100)

## Next Steps

After all phases complete and validation passes:

1. **Create release**: Run
   `./release-auto.sh minor "Complete engineering remediation"`
2. **Update MEMORY.md**: Add key learnings from remediation
3. **Monitor production**: Watch for any issues in user environments
4. **Continuous improvement**: Apply lessons learned to future features

## Support

If you encounter issues during remediation:

1. Check this quickstart guide for common issues
2. Review plan.md for detailed implementation approach
3. Consult research.md for codebase patterns and constraints
4. Check ENGINEERING_REVIEW.md for original issues being addressed
5. Escalate to team if issue persists after debugging
