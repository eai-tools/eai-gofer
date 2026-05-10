# Refactoring Recommendations

This document tracks code quality improvements needed to meet constitutional
requirements.

## File Size Violations

Constitution requires files to be < 300 lines. The following files violate this:

### 1. extension/src/goferMigrator.ts (26,795 bytes, ~670 lines estimated)

**Current Purpose**: Migrates legacy JSON specs to GitHub Gofer format

**Recommended Refactoring**:

Split into:

```
extension/src/migration/
├── GoferMigrator.ts          # Main orchestrator (< 100 lines)
├── LegacyFormatParser.ts       # Parse legacy JSON (< 150 lines)
├── GoferFormatter.ts         # Format to Gofer (< 150 lines)
├── TaskDependencyMapper.ts     # Map task dependencies (< 100 lines)
└── MigrationBackup.ts          # Backup logic (< 100 lines)
```

**Benefits**:

- Each file has single responsibility
- Easier to test individual components
- Meets constitutional file size limits
- Better maintainability

**Risk**: Medium - Migration is not frequently used, thorough testing required

---

### 2. extension/src/templateDownloader.ts (17,503 bytes, ~437 lines estimated)

**Current Purpose**: Downloads Gofer templates from GitHub releases

**Recommended Refactoring**:

Split into:

```
extension/src/templates/
├── TemplateDownloader.ts       # Main orchestrator (< 100 lines)
├── GitHubReleaseClient.ts      # Fetch from GitHub API (< 150 lines)
├── TemplateExtractor.ts        # Unzip and extract (< 100 lines)
├── TemplateValidator.ts        # Validate template structure (< 100 lines)
└── VersionManager.ts           # Version checking logic (< 100 lines)
```

**Benefits**:

- Separation of concerns (network, filesystem, validation)
- Individual components can be mocked for testing
- Meets constitutional limits
- Enables progressive enhancement (add npm registry support, etc.)

**Risk**: Low-Medium - Template downloads are well-tested but critical for setup

---

## Test Coverage Improvements Needed

Current: 36.15% | Target: 80%

### Priority 1: Low Coverage Components

| Component                | Current | Target | Effort |
| ------------------------ | ------- | ------ | ------ |
| NotificationService.ts   | 2.89%   | 80%    | Medium |
| ClaudeCodeInterceptor.ts | 6.31%   | 80%    | High   |
| QAEngine.ts              | 0%      | 80%    | High   |
| Orchestrator.ts          | 0%      | 80%    | High   |

#### Recommended Approach:

1. **NotificationService.ts**:
   - Mock WhatsApp client
   - Test message formatting
   - Test connection errors
   - Test QR code generation

2. **ClaudeCodeInterceptor.ts**:
   - Mock file system watcher
   - Test file change detection
   - Test response parsing
   - Test question detection

3. **QAEngine.ts**:
   - Mock Anthropic API
   - Test semantic search
   - Test confidence scoring
   - Test human escalation logic

4. **Orchestrator.ts**:
   - Currently 0% - integration tests use AutonomousOrchestrator instead
   - Consider deprecating if redundant, or add unit tests

### Priority 2: Moderate Coverage Components

| Component                 | Current | Target | Effort |
| ------------------------- | ------- | ------ | ------ |
| AutonomousOrchestrator.ts | 37.18%  | 80%    | Medium |
| SpecLoader.ts             | 47.05%  | 80%    | Low    |

#### Recommended Approach:

1. **AutonomousOrchestrator.ts**:
   - Add tests for edge cases
   - Test error recovery paths
   - Test concurrent task handling

2. **SpecLoader.ts**:
   - Test malformed YAML
   - Test circular dependencies
   - Test concurrent file access

---

## Implementation Plan

### Phase 1: Documentation (Completed ✅)

- [x] Update all spec task statuses
- [x] Create component READMEs
- [x] Update root README with architecture
- [x] Document test coverage
- [x] Archive legacy specs

### Phase 2: File Size Refactoring (Recommended Next)

**Week 1-2**: goferMigrator.ts refactoring

1. Create new migration/ directory
2. Extract LegacyFormatParser
3. Extract GoferFormatter
4. Extract TaskDependencyMapper
5. Extract MigrationBackup
6. Update imports in extension.ts
7. Test migration with sample legacy specs

**Week 3-4**: templateDownloader.ts refactoring

1. Create new templates/ directory
2. Extract GitHubReleaseClient
3. Extract TemplateExtractor
4. Extract TemplateValidator
5. Extract VersionManager
6. Update imports in extension.ts
7. Test template downloads

### Phase 3: Test Coverage Improvements (After Phase 2)

**Week 5-6**: Low coverage components

1. NotificationService tests
2. ClaudeCodeInterceptor tests
3. QAEngine tests

**Week 7-8**: Moderate coverage components

1. AutonomousOrchestrator edge cases
2. SpecLoader edge cases
3. Verify >= 80% overall coverage

---

## Success Metrics

- ✅ All files < 300 lines (Constitutional requirement)
- ✅ Test coverage >= 80% (Constitutional requirement)
- ✅ All tests passing
- ✅ No regressions in functionality
- ✅ Documentation updated

---

## Breaking Changes

None expected - all refactoring should be internal to modules.

---

## Rollback Plan

If issues arise:

1. Keep original files as `.bak` during refactoring
2. Use feature branches for each refactoring
3. Comprehensive testing before merging
4. Git tags before each major refactoring step

---

## Resolved Technical Debt

### ContextBuilder Wiring (Resolved in v1.17.0 - Feature 024)

Previously ~3,700 LOC of dead code: `setSharedContextBuilder()` was never
called, leaving ContextBuilder, ObservationMasker, StageContextProfileLoader,
SubAgentDispatcher, and MemoryLayerManager completely inactive. Claims about
"50% context reduction from masking" were not happening.

**Resolution**: Feature 024 wired all dead code paths in
`initializeForWorkspace()`, implemented 5-stage Adaptive Context Compaction
(ACC), and added the ACCOrchestrator that connects to ContextHealthMonitor
threshold events.

---

**Last Updated**: 2026-03-11 **Status**: Documented - Ready for implementation
