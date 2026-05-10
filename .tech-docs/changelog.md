---
generated: true
generated_at: "2026-05-10T12:23:06.706Z"
source_commit: "ec462e53d60882a1959c0bf22456684e76b73cdc"
---
# Changelog

## Changes Since Last Documentation Update

**Previous Update:** 2026-05-10 11:17 UTC (commit `57666de1cd235757b2f0444b82e4f82aef6b8108`)
**Current Update:** 2026-05-10 12:19 UTC (commit `ec462e53d60882a1959c0bf22456684e76b73cdc`)

### Version Updates

- **Version:** 3.2.2 (patch release, no change since last doc update)

### Significant Changes

#### 1. UI-First App Delivery Workflow (v3.2.2)

**Commits:** `3bef899`, `f3b6eca` - feat: add ui-first app delivery workflow

- **New Specification:** `032-gofer-ui-first-builder`
- Introduces preview-approval-service-fit workflow for vertical app delivery
- Dual-mode shared pipeline supports both app and non-app work
- App delivery now converges on UI and EnterpriseAI service fit earlier
- Vertical Template reuse with optional branding inputs
- Preview self-review evidence required before stakeholder presentation

**Impact:**
- App delivery runs now UI-first with preview gates
- Non-app work continues through existing shared stages without app-only gates
- Better alignment with EnterpriseAI vertical app delivery requirements

#### 2. Command Parity Restoration (v3.2.2)

**Commit:** `57666de` - fix: restore command parity compatibility

- Fixed command surface consistency across all CLI platforms
- Ensured Claude Code, Copilot, Codex, and Gemini maintain feature parity
- Resolved command generation synchronization issues

#### 3. Documentation Standardization (v3.2.2)

**Commit:** `ec462e5` - docs: standardize nightly tech docs

- Standardized `.tech-docs/` directory structure and content
- Improved executive summary format with tabular data
- Enhanced critical integrations and documentation surfaces sections
- Better alignment with nightly documentation generation contract

### Breaking Changes

None in this release.

### Deprecations

None in this release.

### New Features

- **UI-First App Delivery Workflow** (v3.2.2)
  - Preview-approval-service-fit gates for vertical apps
  - Dual-mode shared pipeline (app vs non-app detection)
  - Vertical Template constraints and branding workflow
  - Preview self-review before stakeholder presentation

### Bug Fixes

- Fixed command parity compatibility across CLI platforms
- Resolved command surface synchronization issues

### Infrastructure Changes

- Standardized nightly `.tech-docs/` generation format
- Enhanced documentation structure with executive summaries

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

### v3.2.2 (2026-05-10)

- **Focus:** UI-first app delivery workflow and command parity
- **Key Features:** Preview-approval-service-fit workflow, dual-mode pipeline, Vertical Template integration
- **Highlights:** App delivery converges on UI earlier, non-app work unaffected

### v3.2.1 (2026-05-09)

- **Focus:** Release automation hardening
- **Key Features:** Improved release script reliability
- **Highlights:** More robust VSIX packaging and GitHub release management

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

**Current Specs:**
1. **032-gofer-ui-first-builder** - Status: Ready (as of 2026-05-10)
   - UI-first app delivery workflow with preview, approval, and service-fit gates
   - Dual-mode shared pipeline supporting app and non-app work

2. **031-skills-pipeline-augmentation** - Status: Active (as of 2026-05-02)
   - Enhanced agent coordination and skill composition capabilities

**Archived Specs:** 30+ previous specifications moved to `.specify/specs/_archived/`

---

## Documentation Updates

This `.tech-docs/` directory is automatically updated nightly to reflect the latest codebase state. The documentation is synchronized with the source code via automated CI workflows.

**Update Frequency:** Nightly (automated via GitHub Actions)
**Last Update:** 2026-05-10 12:19 UTC
**Next Scheduled Update:** 2026-05-11 (nightly)
