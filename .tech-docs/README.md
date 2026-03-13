---
generated: '2026-03-11T22:14:00Z'
source_commit: '29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c'
---

# Technical Documentation Index

**Repository:** [eai-tools/gofer](https://github.com/eai-tools/gofer)
**Version:** 1.17.1 **Generated:** 2026-03-11T22:14:00Z

This directory contains comprehensive technical documentation for the Gofer
VSCode extension project.

---

## Core Documentation

### [Overview](overview.md)

Service identity, tech stack, and quick start guide.

**Contents:**

- Service purpose and description
- Technology stack table
- Key entry points
- Local development setup
- Team/ownership

---

### [Architecture](architecture.md)

Internal architecture and component breakdown.

**Contents:**

- System overview with Mermaid diagrams
- Component breakdown (Extension, Language Server, Orchestrator)
- Data flow diagrams
- Design patterns used
- Integration points
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

---

### [Data Model](data-model.md)

File system schema and data structures.

**Contents:**

- Storage architecture with ER diagram
- Specification directory structure
- File formats (spec.md, tasks.md, plan.md)
- Constitution and memory system
- Logs and telemetry schemas
- Migration history

---

### [Configuration](configuration.md)

Environment variables and settings.

**Contents:**

- Environment variables (optional)
- VSCode settings (50+ settings)
- Configuration files (.vscode/mcp.json, context-profiles.yaml)
- Feature flags
- Secrets management
- Recommended settings by use case

---

### [Deployment](deployment.md)

Build, release, and deployment processes.

**Contents:**

- Build pipeline (npm, webpack, vsce)
- CI/CD workflow (GitHub Actions)
- Release process (release-auto.sh)
- Installation methods
- Runtime environment
- Health checks and monitoring
- Rollback procedures

---

### [Dependencies](dependencies.md)

Service dependencies and integration points.

**Contents:**

- Upstream dependencies (VSCode, Anthropic, Google, OpenAI, Twilio, GitHub)
- Downstream dependents (Claude Code, GitHub Copilot)
- NPM dependencies (production + dev)
- Dependency diagrams
- Version constraints
- Security considerations

---

### [Changelog](changelog.md)

Recent changes summary.

**Contents:**

- v1.17.1 - Latest release (documentation, bug fixes)
- v1.17.0 - Major release (context accuracy, ACC)
- Historical changes (v1.16.x - v1.9.x)
- Breaking changes summary
- API changes timeline
- Performance improvements
- Security updates

---

## Code Review

### [Code Quality](review/code-quality.md)

Code quality assessment across 6 dimensions.

**Scores:**

- **Readability:** 9/10
- **Correctness:** 8/10
- **Performance:** 8/10
- **Security:** 8/10
- **Maintainability:** 9/10
- **Test Quality:** 8/10

**Overall:** 8.5/10

**Key Findings:**

- ✅ Strong TypeScript usage
- ✅ Comprehensive test coverage
- ✅ Excellent architecture
- ⚠️ Large class files (extension.ts)
- ⚠️ Race condition risk (HookBridgeWatcher)
- ⚠️ Missing error boundaries

---

### [Patterns & Tech Debt](review/patterns.md)

Design patterns and technical debt analysis.

**Patterns Identified:**

1. Dependency Injection (tsyringe)
2. Provider Pattern (VSCode TreeDataProvider)
3. Observer Pattern (Event Emitters)
4. Strategy Pattern (Memory Layers)
5. Command Pattern
6. Singleton Pattern
7. Factory Pattern
8. Repository Pattern

**Anti-Patterns Found:**

- God Object (extension.ts)
- Spec parsing duplication
- Magic number thresholds
- Incomplete error handling

**Tech Debt:** 3-4 weeks estimated effort for all items

---

## Quick Navigation

### For New Developers

1. Start with [Overview](overview.md) - Understand what Gofer does
2. Read [Architecture](architecture.md) - Learn the component structure
3. Check [Configuration](configuration.md) - Set up your environment
4. See [Deployment](deployment.md) - Build and test locally

### For API Consumers

1. Read [API Reference](api-reference.md) - MCP tools and commands
2. Check [Data Model](data-model.md) - Spec file format
3. Review [Configuration](configuration.md) - Settings and secrets

### For Operations

1. Review [Deployment](deployment.md) - Release process
2. Check [Dependencies](dependencies.md) - External services
3. See [Changelog](changelog.md) - Recent changes

### For Architects

1. Study [Architecture](architecture.md) - System design
2. Review [Patterns & Tech Debt](review/patterns.md) - Design decisions
3. Check [Code Quality](review/code-quality.md) - Quality assessment

---

## Documentation Maintenance

### Regenerating Documentation

This documentation was generated automatically by analyzing the codebase. To
regenerate:

```bash
# Run the documentation generation prompt
# (User must provide the prompt)
```

### What's Tracked

- All documentation generated from commit:
  `29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c`
- Last updated: 2026-03-11T22:14:00Z
- Version: 1.17.1

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

---

## External References

- **User Documentation:** [README.md](../README.md)
- **Agent Guidelines:** [AGENTS.md](../AGENTS.md)
- **Project Instructions:** [CLAUDE.md](../CLAUDE.md)
- **Testing Guide:** [docs/TESTING_GUIDE.md](../docs/TESTING_GUIDE.md)
- **Release Guide:** [docs/RELEASE_GUIDE.md](../docs/RELEASE_GUIDE.md)
- **GitHub Repository:** https://github.com/eai-tools/gofer

---

## License

This documentation follows the same license as the Gofer project.

© 2025 Enterprise AI Pty Ltd
