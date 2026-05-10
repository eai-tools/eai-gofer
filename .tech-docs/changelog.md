---
generated: true
generated_at: "2026-05-10T11:17:59.779Z"
source_commit: "57666de1cd235757b2f0444b82e4f82aef6b8108"
---
# Changelog

## Changes Since Last Documentation Update

**Previous Update:** 2026-05-01 (commit `65a155c8c10add0b07607d3669e450d458df9d9f`)
**Current Update:** 2026-05-02 (commit `46486d94a7292a485629613e8e8277c4d2e6e1d1`)

### Version Updates

- **Version:** 3.1.0 → 3.2.0 (minor release)

### Significant Changes

#### 1. Release Management (v3.2.0)

**Commit:** `46486d9` - fix(release): dedupe releases index

- Fixed duplicate entries in releases index
- Improved release artifact management
- Enhanced VSIX versioning and packaging

#### 2. Gofer Skills Pipeline Enhancement (v3.2.0)

**Commit:** `caa782d` - feat(gofer): augment skills pipeline

- **New Specification:** `031-skills-pipeline-augmentation`
- Enhanced agent coordination capabilities
- Improved skill composition and orchestration
- Better integration with Claude Code, Copilot, Codex, and Gemini workflows

**Impact:**
- More flexible AI agent coordination
- Better task decomposition and parallel execution
- Improved context handoff between pipeline stages

#### 3. Documentation Updates

**Commit:** `54a2ac1` - docs: update .tech-docs/ [nightly-automated]

- Automated nightly documentation refresh
- Kept technical documentation in sync with codebase changes

#### 4. GitHub Releases Cleanup

**Commit:** `65a155c` - chore(pages): keep last five vsix releases

- GitHub Pages now retains only the last 5 VSIX releases
- Reduces repository bloat from historical releases
- Maintains sufficient release history for users

### Breaking Changes

None in this release.

### Deprecations

None in this release.

### New Features

- **Skills Pipeline Augmentation** (v3.2.0)
  - Enhanced skill composition framework
  - Improved agent coordination primitives
  - Better support for multi-stage AI workflows

### Bug Fixes

- Fixed duplicate entries in releases index
- Improved release artifact deduplication

### Infrastructure Changes

- Automated `.tech-docs/` nightly updates
- VSIX release retention policy (last 5 releases)

### Configuration Changes

No new configuration options added in this release.

### Dependency Updates

No major dependency version changes in this release cycle.

### Performance Improvements

- Release index operations now deduplicated, reducing redundant processing

### Security Updates

No security-specific changes in this release.

---

## Recent Release History

### v3.2.0 (2026-05-02)

- **Focus:** Skills pipeline augmentation and release management fixes
- **Key Features:** Enhanced agent coordination, improved skill composition
- **Highlights:** Deduplicated release index, automated tech docs updates

### v3.1.0 (2026-05-01)

- **Focus:** Cross-platform command parity and memory panel filtering
- **Key Features:** Memory panel filter toggle, parallel validation agents
- **Highlights:** All 16 Gofer commands available across Claude, Copilot, Codex, Gemini

### v3.0.0 (2026-04-30)

- **Focus:** Multi-platform AI support and CLI innovations
- **Key Features:** Source-of-truth command generator, visual artifacts, context REPL
- **Highlights:** Full support for Claude Code, Copilot, Codex, and Gemini

---

## Active Specifications

**Current Spec:** `031-skills-pipeline-augmentation`
**Status:** Active (as of 2026-05-02)
**Purpose:** Augment the Gofer skills pipeline with enhanced agent coordination and skill composition capabilities

**Archived Specs:** All previous specifications moved to `.specify/specs/_archived/`

---

## Documentation Updates

This `.tech-docs/` directory is automatically updated nightly to reflect the latest codebase state. The documentation is synchronized with the source code via automated CI workflows.

**Update Frequency:** Nightly (automated)
**Last Manual Review:** 2026-05-02
**Next Scheduled Review:** 2026-05-09 (weekly)
