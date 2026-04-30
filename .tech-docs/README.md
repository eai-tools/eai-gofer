---
generated: "2026-04-30T12:58:05Z"
source_commit: "7665d4ca1791ffbf77b0e90768b8fba478011792"
---

# Technical Documentation Index

**Repository:** [eai-tools/gofer](https://github.com/eai-tools/gofer)
**Version:** 3.1.0
**Generated:** 2026-04-30T12:58:05Z

This directory contains comprehensive technical documentation for the Gofer VSCode extension project.

---

## What's New in v3.0+

### Multi-Platform CLI Support
- **Claude Code** - Full MCP tool support
- **GitHub Copilot Chat** - Prompt files in `.github/prompts/`
- **OpenAI Codex CLI** - Skill files in `.agents/skills/`
- **Gemini CLI** - Command files in `.gemini/commands/gofer/`
- **Auto-detection** - `gofer.defaultCLI` setting with smart detection

### CLI Innovations
- **Source-of-Truth Generator** - Single `.specify/commands/<stage>.md` → 8 CLI surfaces
- **Visual Artifacts** - 10 persona-pack templates (Impact Canvas, C4, ERD, Heatmaps)
- **7 Visual Writer Agents** - Specialized diagram generators
- **Namespace Aliases** - `/gofer:*` prefix for all commands
- **Codex Budget Doctor** - `npm run gofer:codex-doctor` diagnostic

### Feature Improvements
- **Memory Panel Filter** - Toggle system memories (533 → 0 by default)
- **Parallel Validation** - 6 agents run concurrently (<60s vs 90-120s)
- **Cross-Platform Commands** - All 16 pipeline stages on all platforms

---

## Core Documentation

### [Overview](overview.md)

Service identity, tech stack, and quick start guide.

**Contents:**
- Service purpose and description
- Technology stack table (TypeScript 5.7.2, Node 20.x, VSCode 1.85.0+)
- Key entry points (246 TypeScript files in extension)
- Local development setup
- Multi-platform CLI support (v3.0+)
- Team/ownership

---

### [Architecture](architecture.md)

Internal architecture and component breakdown.

**Contents:**
- System overview with Mermaid diagrams
- Component breakdown (Extension, Language Server, Orchestrator)
- Data flow diagrams
- Design patterns (8 patterns identified)
- Integration points (VSCode, MCP, AI providers)
- Performance considerations

---

### [API Reference](api-reference.md)

MCP tools, VSCode commands, and LSP endpoints.

**Contents:**
- 6 MCP tools (detailed parameters/responses)
- VSCode commands (30+ commands)
- LSP notifications and requests
- Authentication and rate limits
- Error handling
- **Status:** No API changes in v3.0+ (stable)

---

### [Data Model](data-model.md)

File system schema and data structures.

**Contents:**
- Storage architecture with ER diagram
- Specification directory structure (40 specs in repository)
- File formats (spec.md, tasks.md, plan.md, research.md)
- Constitution and memory system
- Logs and telemetry schemas (JSONL format)
- Migration history

---

### [Configuration](configuration.md)

Environment variables and settings.

**Contents:**
- Environment variables (optional - Anthropic, Google, OpenAI, Twilio)
- VSCode settings (60+ settings in v3.0+)
- **New in v3.0:**
  - `gofer.defaultCLI` - Platform selection
  - `gofer.workflowProfile` - EnterpriseAI vs standard
  - `gofer.memory.coverageThreshold` - Memory-first loading
  - Admin API keys for real usage data
- Configuration files (.vscode/mcp.json, context-profiles.yaml)
- Feature flags (all production-ready)
- Secrets management
- Recommended settings by use case

---

### [Deployment](deployment.md)

Build, release, and deployment processes.

**Contents:**
- Build pipeline (npm, webpack, vsce)
- CI/CD workflow (GitHub Actions)
- Release process (release-auto.sh)
- Installation methods (GitHub releases, marketplace planned)
- Runtime environment (3 processes: extension, language server, orchestrator)
- Health checks and monitoring
- Rollback procedures
- **Latest VSIX:** gofer-3.1.0.vsix

---

### [Dependencies](dependencies.md)

Service dependencies and integration points.

**Contents:**
- Upstream dependencies:
  - VSCode Platform (required)
  - Anthropic API (optional - Claude 3.5 Sonnet/Haiku)
  - Google AI API (optional - Gemini 1.5 Pro/Flash)
  - OpenAI API (optional - GPT-4)
  - Twilio (optional - WhatsApp notifications)
  - GitHub API (optional - auto-updates)
- Downstream dependents:
  - Claude Code (primary)
  - GitHub Copilot (experimental)
  - OpenAI Codex CLI (v3.0+)
  - Gemini CLI (v3.0+)
- NPM dependencies (production + dev)
- Dependency diagrams
- Version constraints (Node 20.x, VSCode 1.85.0+)
- Security considerations

---

### [Changelog](changelog.md)

Recent changes summary.

**Contents:**
- **v3.1.0** - Current release (2026-04-30)
  - Command artifact sync
  - Version bump to 3.x milestone
- **v3.0.1** - Installation resource fixes
- **v3.0.0** - Major release (2026-04-28)
  - CLI innovations + visual artifacts
  - Source-of-truth generator
  - 10 persona-pack templates
  - 7 visual writer agents
  - Namespace aliases
- **v2.0.x** - Cross-platform command parity
- **v1.19.x** - Memory panel filter
- Historical changes (v1.17.x - v1.9.x)
- Breaking changes summary (none in v3.x)
- API changes timeline (stable since v1.11.0)
- Performance improvements
- Security updates

---

## Code Review

### [Code Quality](review/code-quality.md)

Code quality assessment across 6 dimensions.

**Scores (v3.1.0):**
- **Readability:** 9/10
- **Correctness:** 8/10
- **Performance:** 8/10
- **Security:** 8/10
- **Maintainability:** 9/10
- **Test Quality:** 8/10

**Overall:** 8.5/10

**Key Findings:**
- ✅ Strong TypeScript usage (95%+ adoption)
- ✅ Comprehensive test coverage (80%+ target)
- ✅ Excellent architecture (DI, separation of concerns)
- ✅ Hook-based monitoring (80% CPU reduction vs polling)
- ⚠️ Large class files (extension.ts - 800+ lines)
- ⚠️ Race condition risk (HookBridgeWatcher)
- ⚠️ Missing error boundaries (large file reads)

**Recommendations:**
1. Add mutex/lock for context updates
2. Add file size limits and timeouts
3. Reduce integration test gaps
4. Refactor large classes
5. Optimize large file handling

---

### [Patterns & Tech Debt](review/patterns.md)

Design patterns and technical debt analysis.

**Patterns Identified:**
1. **Dependency Injection** (tsyringe) - Excellent
2. **Provider Pattern** (VSCode TreeDataProvider) - Consistent
3. **Observer Pattern** (Event Emitters) - Type-safe
4. **Strategy Pattern** (Memory Layers) - MemGPT-inspired
5. **Command Pattern** - 30+ commands
6. **Singleton Pattern** - DI container
7. **Factory Pattern** - LLM providers
8. **Repository Pattern** - Spec loading

**Anti-Patterns Found:**
- God Object (extension.ts - 800+ lines)
- Spec parsing duplication (extension + language server)
- Magic number thresholds (configurable, mitigated)
- Incomplete error handling (large files)

**Tech Debt:** 3-4 weeks estimated effort for all items

**Priority Order:**
1. God Object refactoring (improves maintainability)
2. Race condition fix (prevents bugs)
3. Missing error boundaries (improves robustness)
4. File size limits (prevents hangs)

---

## Quick Navigation

### For New Developers

1. Start with [Overview](overview.md) - Understand what Gofer does
2. Read [Architecture](architecture.md) - Learn the component structure
3. Check [Configuration](configuration.md) - Set up your environment
4. See [Deployment](deployment.md) - Build and test locally
5. Review [Code Quality](review/code-quality.md) - Understand standards

### For API Consumers

1. Read [API Reference](api-reference.md) - MCP tools and commands
2. Check [Data Model](data-model.md) - Spec file format
3. Review [Configuration](configuration.md) - Settings and secrets
4. See [Changelog](changelog.md) - API stability notes

### For Multi-Platform Users (v3.0+)

1. **Claude Code users** - MCP tools work out of the box
2. **GitHub Copilot users** - Commands in `.github/prompts/`
3. **OpenAI Codex users** - Skills in `.agents/skills/`, run `npm run gofer:codex-doctor`
4. **Gemini CLI users** - Commands in `.gemini/commands/gofer/`
5. **Platform selection** - Set `gofer.defaultCLI` in VSCode settings

### For Operations

1. Review [Deployment](deployment.md) - Release process
2. Check [Dependencies](dependencies.md) - External services
3. See [Changelog](changelog.md) - Recent changes
4. Monitor health via status bar indicators

### For Architects

1. Study [Architecture](architecture.md) - System design
2. Review [Patterns & Tech Debt](review/patterns.md) - Design decisions
3. Check [Code Quality](review/code-quality.md) - Quality assessment
4. Analyze [Dependencies](dependencies.md) - Integration points

---

## Documentation Maintenance

### Version Tracking

- **Version:** 3.1.0
- **Commit:** 7665d4ca1791ffbf77b0e90768b8fba478011792
- **Generated:** 2026-04-30T12:58:05Z
- **Previous Update:** 2026-04-30T00:00:00Z (c215b3f)
- **Change Summary:** Documentation refresh with updated commit reference

### Regenerating Documentation

To regenerate this documentation:

```bash
# In Claude Code, Copilot, Codex, or Gemini CLI:
# "Generate .tech-docs/ for this repository"
```

The documentation generator:
- Reads package.json, README.md, source code
- Analyzes architecture and patterns
- Generates Mermaid diagrams
- Cross-references .specify/ specs
- Updates all .tech-docs/ files with current state

### What to Update Manually

When making changes, update these files if applicable:

**Architecture changes:**
- Update [architecture.md](architecture.md) - Component diagrams
- Update [dependencies.md](dependencies.md) - New service dependencies

**API changes:**
- Update [api-reference.md](api-reference.md) - New tools/commands
- Update [data-model.md](data-model.md) - Schema changes

**Configuration changes:**
- Update [configuration.md](configuration.md) - New settings
- Update [deployment.md](deployment.md) - Build process changes

**Release changes:**
- Update [changelog.md](changelog.md) - New release notes
- Bump `generated` timestamp in frontmatter
- Update version numbers throughout

---

## File Organization

```
.tech-docs/
├── README.md                 # This file
├── overview.md              # Service identity & tech stack
├── architecture.md          # System architecture & diagrams
├── api-reference.md         # MCP tools & VSCode commands
├── data-model.md            # File schemas & data structures
├── configuration.md         # Settings & environment variables
├── deployment.md            # Build, release, CI/CD
├── dependencies.md          # Service dependencies
├── changelog.md             # Release history
└── review/
    ├── code-quality.md      # Code quality assessment
    └── patterns.md          # Design patterns & tech debt
```

---

## External References

- **User Documentation:** [README.md](../README.md)
- **Agent Guidelines:** [AGENTS.md](../AGENTS.md)
- **Project Instructions:** [CLAUDE.md](../CLAUDE.md)
- **Testing Guide:** [docs/TESTING_GUIDE.md](../docs/TESTING_GUIDE.md)
- **Release Guide:** [docs/RELEASE_GUIDE.md](../docs/RELEASE_GUIDE.md)
- **CLI Support Guide:** [docs/cli-support.md](../docs/cli-support.md) (v3.0+)
- **GitHub Repository:** https://github.com/eai-tools/gofer

---

## Key Metrics

| Metric                      | Value                           |
| --------------------------- | ------------------------------- |
| Version                     | 3.1.0                           |
| Extension Files             | 246 TypeScript files            |
| Specifications              | 40 spec files                   |
| MCP Tools                   | 6 tools (stable API)            |
| VSCode Commands             | 30+ commands                    |
| VSCode Settings             | 60+ configuration options       |
| Test Coverage Target        | 80%+                            |
| Supported AI Platforms      | 4 (Claude, Copilot, Codex, Gemini) |
| Code Quality Score          | 8.5/10                          |
| Tech Debt Effort (all)      | 3-4 weeks                       |
| Node Version Required       | 20.x                            |
| VSCode Version Required     | 1.85.0+                         |

---

## Support

For questions, issues, or contributions:

- **GitHub Issues:** https://github.com/eai-tools/gofer/issues
- **Documentation:** https://github.com/eai-tools/gofer#readme
- **Owner:** Enterprise AI Pty Ltd
- **Website:** https://enterpriseai.com.au

---

## License

This documentation follows the same license as the Gofer project.

© 2025 Enterprise AI Pty Ltd
