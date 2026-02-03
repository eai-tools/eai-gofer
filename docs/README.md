# EAI-GOFER Documentation

Welcome to the EAI-GOFER documentation. This directory contains guides for
using, testing, releasing, and understanding agentic coding best practices.

## Agentic Coding Best Practices

### [Agentic Coding Documentation](agentic-coding/README.md)

Comprehensive documentation on AI-driven development (January 2026):

- **[Agentic Coding Principles](agentic-coding/AGENTIC_CODING_PRINCIPLES.md)** -
  Context management, structured outputs, session handling
- **[Agentic Testing Patterns](agentic-coding/AGENTIC_TESTING_PATTERNS.md)** -
  Test execution for AI agents, error handling, retry strategies
- **[Multi-Agent Architecture](agentic-coding/MULTI_AGENT_ARCHITECTURE.md)** -
  Sub-agents, LLM Council, parallel execution patterns
- **[Iterative Development](agentic-coding/ITERATIVE_DEVELOPMENT.md)** -
  Skateboard methodology, E2E-first, product primitives
- **[Agent Tooling Reference](agentic-coding/AGENT_TOOLING_REFERENCE.md)** -
  MCP tools, APIs, integration patterns

## Active Documentation

### [Testing Guide](TESTING_GUIDE.md)

Complete guide for testing the EAI-GOFER extension including:

- Installing the extension
- Verifying MCP configuration
- Testing Language Server integration
- Testing MCP tools with Claude Code/Copilot
- Troubleshooting

### [Release Guide](RELEASE_GUIDE.md)

Instructions for maintainers on how to:

- Create new releases
- Use GitHub Actions workflow
- Publish to GitHub releases
- Handle version bumps

### [Quality Standards](QUALITY_STANDARDS.md)

Code quality standards and automated quality gates.

## Archive

The [archive/](archive/) folder contains historical documentation from previous
development sessions:

- **Implementation summaries** - Session notes and progress reports
- **Architecture research** - Research documents on LSP/MCP integration
- **Migration guides** - Legacy JSON to Spec Kit format migration
- **Outdated guides** - Setup and quick reference docs superseded by main README

These are kept for historical reference but may not reflect the current implementation.

## Main Documentation

The primary user-facing documentation is in the root [README.md](../README.md).

## Contributing

When adding new documentation:

1. Keep user-facing docs in the main README
2. Put developer/testing docs in this `docs/` folder
3. Move outdated docs to `docs/archive/` with clear naming
4. Update this index when adding new active docs
