---
date: 2025-12-20T21:45:00-05:00
researcher: Claude
topic: 'Markdown Files That Can Be Removed'
tags: [research, cleanup, documentation, markdown]
status: complete
---

# Research: Markdown Files That Can Be Removed

## Research Question

Review the codebase and suggest any .md files that can be removed.

## Summary

The codebase contains **~140 project .md files** (excluding node_modules).
Analysis reveals **45+ files** that are obsolete, redundant, or should be
reorganized. The root directory alone has 28 .md files, of which 21 are one-time
implementation summaries that should be deleted. The `docs/archive/` directory
(16 files) can be entirely removed.

## Detailed Findings

### Category 1: Root-Level Files to DELETE (21 files)

These are one-time implementation summaries, status snapshots, and fix
documentation that are now obsolete:

| File                                       | Reason for Deletion             |
| ------------------------------------------ | ------------------------------- |
| `AUTONOMOUS_MODE_FIX.md`                   | Nov 2025 bug fix - now in code  |
| `AUTONOMOUS_MODE_WORKING.md`               | Fix announcement - obsolete     |
| `CLAUDE_CODE_IMPLEMENTATION_SUMMARY.md`    | Feature 001 complete            |
| `CLAUDE_CODE_TERMINAL_INTEGRATION_PLAN.md` | Plan executed                   |
| `CURRENT_STATUS.md`                        | Outdated Dagger status snapshot |
| `DOCUMENTATION_FIXES.md`                   | Oct 2025 fixes applied          |
| `EXTERNAL_TERMINAL_FEATURE.md`             | Implementation in code          |
| `FIXES_APPLIED.md`                         | Oct 2025 fixes applied          |
| `FIX_ALREADY_RUNNING_ERROR.md`             | Fix in extension code           |
| `IMPLEMENTATION_COMPLETE.md`               | Feature 003 complete            |
| `PLAY_BUTTON_READY.md`                     | Feature announcement            |
| `REBRANDING_REVIEW.md`                     | Rebranding complete             |
| `RELEASE_AUTOMATION_FIX.md`                | Script changes applied          |
| `SPEC-FORMAT-UPDATES.md`                   | Format now standard             |
| `TESTING_CHECKLIST.md`                     | One-time testing done           |
| `TESTING_PROGRESS.md`                      | Snapshot outdated               |
| `TWILIO_TO_WHATSAPP_MIGRATION.md`          | Migration complete              |
| `VSCODE_EXTENSION_REVIEW.md`               | Review complete                 |
| `vscode-error-fix-summary.md`              | Issues fixed                    |
| `QUICKSTART.md`                            | Duplicates extension/README.md  |
| `HOW_TO_USE.md`                            | Duplicates extension/README.md  |

### Category 2: docs/archive/ Directory - DELETE ENTIRE (16 files)

All files describe abandoned LSP+MCP architecture or outdated status:

```
docs/archive/
├── AUTO_UPDATE_SETUP.md       # Superseded by RELEASE_PROCESS.md
├── AUTO_UPGRADE_FEATURE.md    # Outdated
├── CRITICAL_FIXES_APPLIED.md  # Now in CHANGELOG.md
├── CURRENT_STATUS.md          # Oct 2025 snapshot (v3.6.1 now)
├── FINAL_DELIVERY.md          # SpecRunner v1.0.0 never released
├── GITHUB_SPEC_KIT_RESEARCH.md# Absorbed into docs
├── GLOBAL_EXTENSION_DESIGN.md # Architecture never implemented
├── IMPLEMENTATION_STATUS.md   # LSP+MCP abandoned
├── IMPLEMENTATION_SUMMARY.md  # Old project structure
├── LATEST_INTEGRATION_RESEARCH.md # Abandoned approach
├── OPTION_B_LSP_MCP_ARCHITECTURE.md # Never implemented
├── QUICK_REFERENCE.md         # Now in README.md
├── SESSION_SUMMARY.md         # Historical notes
├── SETUP.md                   # Now in README.md
├── SPEC_KIT_INTEGRATION_COMPLETE.md # Done
└── SPEC_KIT_MIGRATION.md      # Done
```

### Category 3: Move Dagger Research to Spec (7 files)

These belong in `.specify/specs/006-testing-coverage-expansion/research/`:

- `DAGGER_IMPLEMENTATION_PLAN.md` (806 lines)
- `DAGGER_PATTERNS_RESEARCH.md` (1,108 lines)
- `DAGGER_QUICK_REFERENCE.md` (489 lines)
- `DAGGER_RESEARCH_INDEX.md` (481 lines)
- `DAGGER_START_HERE.md` (317 lines)
- `DAGGER_STATUS.md` (192 lines)
- `RESEARCH_SUMMARY.md` (430 lines)

### Category 4: Consolidate or Move (5 files)

| File                                           | Recommendation                         |
| ---------------------------------------------- | -------------------------------------- |
| `TESTING.md`                                   | Merge into `tests/README.md`           |
| `TROUBLESHOOTING.md`                           | Add section to main README             |
| `RELEASE.md`                                   | Replace with `docs/RELEASE_PROCESS.md` |
| `REFACTORING_RECOMMENDATIONS.md`               | Move to `docs/technical-debt.md`       |
| `RESEARCH_AI_AGENT_TEST_EXECUTION_PATTERNS.md` | Move to `docs/research/`               |

### Category 5: Backup Directory - DELETE (3 files)

```
.specify/_backup/specs-20251021-122649/
├── feature-001/spec.md    # Duplicated in current specs
└── test-001/
    ├── spec.md            # Test spec, obsolete
    └── tasks.md           # Test tasks, obsolete
```

### Category 6: Outdated docs/ Files (2 files)

| File                    | Issue                              |
| ----------------------- | ---------------------------------- |
| `docs/TESTING_GUIDE.md` | References old LSP+MCP setup       |
| `docs/RELEASE_GUIDE.md` | References "specrunner" (old name) |

### Category 7: Review for Deletion (1 file)

- `.specify/specs/feature-001/spec.md` - Test/example spec, not a real feature

## Files to KEEP

### Essential Root Files (3)

- `README.md` - Main documentation
- `CLAUDE.md` - AI development guidelines
- `AGENTS.md` - Code quality guidelines

### Active Documentation (docs/)

- `docs/README.md` - Index
- `docs/RELEASE_PROCESS.md` - Current release automation
- `docs/TESTING_GUIDE.md` → Replace with link to tests/README.md
- `docs/QUALITY_STANDARDS.md`
- `docs/API_KEY_SETUP.md`
- `docs/WHATSAPP_SETUP.md`
- `docs/TWO_WAY_WHATSAPP.md`
- `docs/memory-learning-system.md`
- `docs/migration-guide.md`

### Component Documentation

- `extension/README.md` - VSCode marketplace + detailed usage
- `extension/CHANGELOG.md` - Release notes
- `language-server/README.md` - LSP technical docs
- `tests/README.md` - Testing philosophy

### Spec Feature Documentation (Keep All)

All `.specify/specs/00X-*/` documentation is valuable:

- spec.md, plan.md, tasks.md, data-model.md
- COMPLETION_SUMMARY.md, IMPLEMENTATION_SUMMARY.md
- research.md, quickstart.md
- contracts/, checklists/

## Recommended Cleanup Commands

```bash
cd /Users/douglaswross/Code/specgofer

# 1. Delete root-level obsolete files (21 files)
rm AUTONOMOUS_MODE_FIX.md AUTONOMOUS_MODE_WORKING.md \
   CLAUDE_CODE_IMPLEMENTATION_SUMMARY.md CLAUDE_CODE_TERMINAL_INTEGRATION_PLAN.md \
   CURRENT_STATUS.md DOCUMENTATION_FIXES.md EXTERNAL_TERMINAL_FEATURE.md \
   FIXES_APPLIED.md FIX_ALREADY_RUNNING_ERROR.md IMPLEMENTATION_COMPLETE.md \
   PLAY_BUTTON_READY.md REBRANDING_REVIEW.md RELEASE_AUTOMATION_FIX.md \
   SPEC-FORMAT-UPDATES.md TESTING_CHECKLIST.md TESTING_PROGRESS.md \
   TWILIO_TO_WHATSAPP_MIGRATION.md VSCODE_EXTENSION_REVIEW.md \
   vscode-error-fix-summary.md QUICKSTART.md HOW_TO_USE.md

# 2. Delete entire archive directory (16 files)
rm -rf docs/archive/

# 3. Move Dagger research to spec
mkdir -p .specify/specs/006-testing-coverage-expansion/research
mv DAGGER_*.md .specify/specs/006-testing-coverage-expansion/research/
mv RESEARCH_SUMMARY.md .specify/specs/006-testing-coverage-expansion/research/

# 4. Delete backup directory (3 files)
rm -rf .specify/_backup/

# 5. Consolidate documentation
mv REFACTORING_RECOMMENDATIONS.md docs/technical-debt.md
mkdir -p docs/research
mv RESEARCH_AI_AGENT_TEST_EXECUTION_PATTERNS.md docs/research/

# 6. Delete outdated docs files
rm docs/TESTING_GUIDE.md docs/RELEASE_GUIDE.md

# 7. Clean up remaining files after merging content
# (manually merge TESTING.md into tests/README.md)
# (manually add TROUBLESHOOTING.md content to README.md)
rm TESTING.md TROUBLESHOOTING.md RELEASE.md

# 8. Optional: Delete test spec
rm -rf .specify/specs/feature-001/
```

## Summary Statistics

| Category            | Files  | Action     |
| ------------------- | ------ | ---------- |
| Root obsolete files | 21     | DELETE     |
| docs/archive/       | 16     | DELETE     |
| Dagger research     | 7      | MOVE       |
| Consolidate/move    | 5      | MERGE/MOVE |
| Backup directory    | 3      | DELETE     |
| Outdated docs       | 2      | DELETE     |
| Test spec           | 1      | REVIEW     |
| **Total removable** | **55** |            |

## Final State

After cleanup, the root directory will have **3 markdown files** instead of 28:

- `README.md`
- `CLAUDE.md`
- `AGENTS.md`

## Open Questions

1. Should `.specify/specs/feature-001/` be kept as a user example?
2. Should Dagger research be kept at all if 006-dagger-test-orchestration is
   cancelled?
3. Should completion summaries in specs be archived after some time period?

## Code References

- Root .md files: `ls *.md` shows 28 files
- Archive directory: `docs/archive/` (16 files)
- Backup directory: `.specify/_backup/specs-20251021-122649/` (3 files)
- Current release process: `release-auto.sh` and `docs/RELEASE_PROCESS.md`
- Testing guide: `tests/README.md:1-260`
