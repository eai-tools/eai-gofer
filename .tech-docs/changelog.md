---
generated: true
generated_at: "2026-05-18T18:29:37.022Z"
source_commit: "d71d0b38af3ecb01dee9c3d3001ef1abe9dc5510"
---
# Changelog

## Changes Since Last Documentation Update

**Previous Update:** 2026-05-17 17:52 UTC (commit `347c971273d89c79adb9e37e41b93a7a8388f035`)  
**Current Update:** 2026-05-18 18:30 UTC (commit `d71d0b38af3ecb01dee9c3d3001ef1abe9dc5510`)

### Version Updates

- **Version:** 3.3.1 (stable - EAI block catalog enforcement + security hardening)

### Significant Changes

#### 1. EAI Block Catalog Requirement for UI Generation (2026-05-18)

**Commit:** `d71d0b3` - feat: require EAI block catalog for UI generation (#16)

- Enforced EAI block catalog requirement for UI-first app delivery workflow
- UI generation now requires valid block catalog reference for component composition
- Ensures UI compliance with EnterpriseAI platform standards
- Prevents non-compliant UI artifacts from being generated

**Impact:**
- Enhanced EnterpriseAI platform integration
- Stronger governance for vertical app UI delivery
- Consistent component library usage across generated UIs

**Related:**
- Spec-driven UI workflow (feature 032-gofer-ui-first-builder)
- Public platform builder boundary (feature 027-public-builder-runtime)

#### 2. Security Hardening: npm Supply Chain Policy (2026-05-18)

**Commit:** `0627f0f` - chore: harden npm supply chain policy

- Strengthened npm dependency security policies
- Enhanced supply chain attack resistance
- Updated dependency verification workflows
- Aligned with enterprise security standards

**Impact:**
- Reduced supply chain vulnerability surface
- Improved dependency provenance tracking
- Better security posture for production deployments

#### 3. VSCode Extension API Floor Alignment (2026-05-18)

**Commit:** `a578966` - chore: align vscode extension api floor

- Updated minimum VSCode API version requirement
- Ensured compatibility with latest VSCode MCP support (1.102+)
- Aligned extension capabilities with platform features

**Impact:**
- Guaranteed MCP tool availability for Claude Code and Copilot
- Removed compatibility workarounds for older VSCode versions
- Cleaner extension activation logic

#### 4. Repository Size Reduction (2026-05-18)

**Commit:** `bf064a7` - [codex] Reduce repository size by removing committed release binaries (#11)

- Removed committed VSIX release binaries from Git history
- Reduced repository clone size significantly
- Moved release artifacts to GitHub Releases exclusively
- Completed Git history rewrite cleanup (commit `1b9921c`)

**Impact:**
- Faster clone times for developers and CI/CD
- Reduced storage costs
- Cleaner repository hygiene

#### 5. QAgent Runtime Artifacts Ignored (2026-05-18)

**Commit:** `9a0b6ff` - chore: ignore qagent runtime artifacts

- Added `.qagent/` runtime artifacts to `.gitignore`
- Prevents accidental commits of temporary agent state
- Cleaner Git working directory

#### 6. Project Name Update to 'Enterprise AI Gofer' (2026-05-18)

**Commit:** `0fdd86d` - Update project name to 'Enterprise AI Gofer'

- Formal project name updated in documentation and manifests
- Reflects Enterprise AI Pty Ltd ownership
- Consistent branding across all surfaces

### Documentation Changes

- Regenerated `.tech-docs/` with latest codebase state
- Updated all frontmatter timestamps to 2026-05-18T18:30:00Z
- Updated source commit reference to `d71d0b3`
- Added comprehensive architecture diagrams (Mermaid)
- Enhanced API reference with complete MCP tool catalog (29 tools)
- Documented Adaptive Context Compaction (ACC) 5-stage strategy
- Added ScopeGuard trust boundary diagrams
- Documented performance optimizations (caching, chunking, masking)

### Active Specifications (as of 2026-05-18)

- **032-gofer-ui-first-builder** - UI-first app delivery workflow (Completed, v3.2.2)
- **031-skills-pipeline-augmentation** - Enhanced agent coordination (Completed, v3.2.0)
- **027-public-builder-runtime** - Public platform builder boundary (Completed, v3.3.1)

### Breaking Changes

None in this update cycle.

### Deprecations

- **Orchestrator (`src/orchestrator/AutonomousOrchestrator_new.ts`)** - Extension-based ACC orchestration is now preferred. The standalone orchestrator remains functional but is no longer recommended for new workflows.

### Known Issues

- None reported in this update cycle.

### Upcoming Features (Roadmap Preview)

- **Memory Panel Filter Enhancements** - User-defined memory categories
- **Context Health Dashboard** - Visual breakdown of token usage by category
- **Enhanced LLM Council** - Multi-provider validation with cost tracking
- **Advanced Slop Detection** - AI code quality analysis with auto-fix suggestions
- **EnterpriseAI Workflow Enhancements** - Deeper platform integration

### Metrics

| Metric | Value |
|--------|-------|
| Total Commits (since last doc update) | 9 |
| Files Changed | 15+ |
| Lines Added | ~500 |
| Lines Removed | ~200 (after binary removal) |
| Documentation Files Updated | 9 |
| MCP Tools Documented | 29 |
| VS Code Commands Documented | 67 |
| Configuration Settings Documented | 91 |

## Historical Changes

### v3.3.1 (2026-05-10)

**Theme:** Public Platform Builder Boundary Clarification

- Implemented public builder runtime boundary guidance (feature 027)
- EnterpriseAI workflow profile as default (`gofer.workflowProfile: enterpriseai`)
- Public API compliance checks (`eai whoami`, `eai workflow readiness`)
- Environment variable security (`.env` in `.gitignore`)
- Block catalog integration for UI generation
- Architecture decision gate for governance

**Key Commits:**
- Public builder boundary implementation
- EAI block catalog reference validation
- Workflow profile configuration

### v3.2.2 (2026-04-15)

**Theme:** UI-First App Delivery

- Preview-approval-service-fit workflow (feature 032)
- UI generation via EAI block catalog
- Service-fit gate validation
- Approval workflow for vertical apps

### v3.2.0 (2026-04-01)

**Theme:** Skills Pipeline Augmentation

- Enhanced agent coordination (feature 031)
- Skill composition framework
- Multi-agent execution orchestration
- Cross-agent memory sharing

### v3.0.0 (2026-03-15)

**Theme:** Multi-Platform CLI Support

- Cross-platform command generation (Claude, Copilot, Codex, Gemini)
- Source-of-truth canonical commands (`.specify/commands/`)
- Visual artifact templates (10 persona-packs)
- 7 specialized visual writer agents
- Command parity across all platforms (24 commands)

## Documentation Maintenance

This changelog is automatically updated during nightly documentation refresh cycles. Changes are detected via Git commit analysis and structured into categories:

- **Feature Changes** - New capabilities or enhancements
- **Security Changes** - Hardening, vulnerability fixes
- **Documentation Changes** - Updates to technical documentation
- **Deprecations** - Features marked for removal
- **Breaking Changes** - Changes requiring user action
- **Metrics** - Quantitative impact measurements

**Last Automated Update:** 2026-05-18T18:30:00Z  
**Documentation Pipeline:** `.tech-docs/` → `docs-site/` → GitHub Pages  
**Update Cadence:** Nightly (weekdays)
