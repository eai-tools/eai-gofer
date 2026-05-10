---
generated: true
generated_at: "2026-05-10T13:38:38.782Z"
source_commit: "d7fa4cc243aeb1b82cdcc44fd69e610fb02dc507"
---
# Changelog

## Changes Since Last Documentation Update

**Previous Update:** 2026-05-10 12:19 UTC (commit `ec462e53d60882a1959c0bf22456684e76b73cdc`)
**Current Update:** 2026-05-10 13:35 UTC (commit `d7fa4cc243aeb1b82cdcc44fd69e610fb02dc507`)

### Version Updates

- **Version:** 3.3.0 (minor release with dependency security patches and documentation improvements)

### Significant Changes

#### 1. Dependency Security Patches (v3.3.0)

**Commits:** `a3865a8` - chore(deps): override vulnerable transitive packages

- Added package overrides for vulnerable transitive dependencies
- Updated `diff` to `^8.0.3` (security patch)
- Updated `postcss` to `^8.5.10` (security patch)
- Updated `serialize-javascript` to `^7.0.0` (security patch)

**Impact:**
- Improved security posture by addressing known vulnerabilities
- No breaking changes to functionality
- All transitive dependency vulnerabilities resolved

#### 2. Documentation Validation and Coverage (v3.3.0)

**Commit:** `b1d4f6e` - test(gofer): realign docs validation coverage

- Realigned documentation validation test coverage
- Enhanced validation for generated documentation surfaces
- Improved test coverage for `.tech-docs/` directory structure
- Better alignment with nightly documentation generation workflows

**Impact:**
- More robust documentation validation process
- Ensures generated documentation meets quality standards
- Better test coverage for documentation generation

#### 3. Release Automation Improvements (v3.3.0)

**Commit:** `7f9e125` - fix(release): restore legacy workflow contract

- Restored legacy release workflow compatibility
- Fixed release automation issues that affected VSIX packaging
- Improved GitHub release management reliability
- Better handling of version bumping and changelog generation

**Impact:**
- More reliable release process
- Consistent VSIX package generation
- Better GitHub release notes generation

#### 4. UI-First App Delivery Workflow (v3.2.2)

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

- **Dependency Security Hardening** (v3.3.0)
  - Package override system for transitive dependency vulnerabilities
  - Automated security patch application
  - Zero breaking changes for security updates

- **UI-First App Delivery Workflow** (v3.2.2)
  - Preview-approval-service-fit gates for vertical apps
  - Dual-mode shared pipeline (app vs non-app detection)
  - Vertical Template constraints and branding workflow
  - Preview self-review before stakeholder presentation

### Bug Fixes

- **v3.3.0:**
  - Fixed release workflow compatibility with legacy contracts
  - Resolved documentation validation coverage issues
  - Corrected VSIX packaging automation

- **v3.2.2:**
  - Fixed command parity compatibility across CLI platforms
  - Resolved command surface synchronization issues

### Infrastructure Changes

- Standardized nightly `.tech-docs/` generation format
- Enhanced documentation structure with executive summaries

### Configuration Changes

No new configuration options added in this release.

### Dependency Updates

**v3.3.0:**
- `diff`: updated to `^8.0.3` (security patch, transitive override)
- `postcss`: updated to `^8.5.10` (security patch, transitive override)
- `serialize-javascript`: updated to `^7.0.0` (security patch, transitive override)

### Performance Improvements

- Release index operations now deduplicated, reducing redundant processing

### Security Updates

**v3.3.0:**
- Addressed vulnerable transitive dependencies via package overrides
- Applied security patches to `diff`, `postcss`, and `serialize-javascript`
- No known vulnerabilities remaining in dependency tree

---

## Recent Release History

### v3.3.0 (2026-05-10)

- **Focus:** Dependency security patches and documentation validation
- **Key Features:** Package override system for vulnerable transitive dependencies
- **Highlights:** All known security vulnerabilities addressed, improved release automation
- **Breaking Changes:** None
- **Security:** Critical security patches for diff, postcss, and serialize-javascript

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
**Last Update:** 2026-05-10 13:35 UTC
**Next Scheduled Update:** 2026-05-11 (nightly)
