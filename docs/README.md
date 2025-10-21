# SpecGofer Documentation

Welcome to the SpecGofer documentation. This directory contains guides for using, testing, and releasing SpecGofer.

## Active Documentation

### [Testing Guide](TESTING_GUIDE.md)

Complete guide for testing the SpecGofer extension including:

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

## Archive

The [archive/](archive/) folder contains historical documentation from previous development sessions:

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
