# Agentic Coding Documentation

**Enterprise AI Pty Ltd - Best Practices for AI-Driven Development**

*Last Updated: January 2026*

---

## Overview

This directory contains comprehensive documentation on agentic coding - the
practice of using AI assistants (Claude Code, GitHub Copilot, etc.) to
autonomously implement software from specifications.

These documents consolidate research and best practices from 2025-2026 into
actionable guidance.

---

## Documents

### 1. [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md)

**Core principles for effective AI-driven development**

- Context window management and health monitoring
- Structured output principles
- Constitution-based validation
- Research-Plan-Implement framework
- Quality gates and validation
- Session management best practices

### 2. [AGENTIC_TESTING_PATTERNS.md](AGENTIC_TESTING_PATTERNS.md)

**Test execution design for AI agents**

- JSON Schema for test results
- Progress streaming protocols (SSE, WebSocket)
- 3-level retry strategy with exponential backoff
- Error classification and severity levels
- Real tests philosophy (no mocking)
- Performance requirements

### 3. [MULTI_AGENT_ARCHITECTURE.md](MULTI_AGENT_ARCHITECTURE.md)

**Sub-agents and LLM Council patterns**

- Sub-agent architecture for context management
- Specialized agents (Locator, Analyzer, Pattern Finder)
- LLM Council pattern for multi-provider consensus
- Council configuration and implementation
- Cost visibility and monitoring

### 4. [ITERATIVE_DEVELOPMENT.md](ITERATIVE_DEVELOPMENT.md)

**Skateboard methodology and E2E-first development**

- Skateboard → Car progression
- Iteration definitions (Skateboard, Scooter, Bicycle, Motorbike, Car)
- E2E-first development principles
- Product primitives
- Iteration checkpoints and gates

### 5. [AGENT_TOOLING_REFERENCE.md](AGENT_TOOLING_REFERENCE.md)

**MCP tools, APIs, and integration patterns**

- MCP tool definitions and schemas
- LSP methods
- Progress streaming API
- Error response format
- VSCode commands
- Integration patterns and debugging

---

## Quick Start

### For Developers Using AI Agents

1. Start with [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md) to
   understand context management
2. Review [ITERATIVE_DEVELOPMENT.md](ITERATIVE_DEVELOPMENT.md) for the
   skateboard methodology
3. Reference [AGENTIC_TESTING_PATTERNS.md](AGENTIC_TESTING_PATTERNS.md) when
   writing tests

### For Tool Builders

1. Start with [AGENT_TOOLING_REFERENCE.md](AGENT_TOOLING_REFERENCE.md) for API
   schemas
2. Review [AGENTIC_TESTING_PATTERNS.md](AGENTIC_TESTING_PATTERNS.md) for error
   handling patterns
3. See [MULTI_AGENT_ARCHITECTURE.md](MULTI_AGENT_ARCHITECTURE.md) for
   orchestration patterns

### For AI Agents

1. Load [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md) as
   foundational guidance
2. Follow [ITERATIVE_DEVELOPMENT.md](ITERATIVE_DEVELOPMENT.md) for feature
   implementation
3. Use [AGENT_TOOLING_REFERENCE.md](AGENT_TOOLING_REFERENCE.md) for tool schemas

---

## Key Concepts Summary

| Concept                | Description                              | Document                    |
| ---------------------- | ---------------------------------------- | --------------------------- |
| Context Health         | Monitor and manage context window usage  | AGENTIC_CODING_PRINCIPLES   |
| Observation Masking    | Replace stale tool outputs               | AGENTIC_CODING_PRINCIPLES   |
| Session Handoffs       | Save/restore state across sessions       | AGENTIC_CODING_PRINCIPLES   |
| 3-Level Retry          | Increasing context with each retry       | AGENTIC_TESTING_PATTERNS    |
| Real Tests             | No mocking, use real data                | AGENTIC_TESTING_PATTERNS    |
| Sub-Agents             | Specialized agents with fresh context    | MULTI_AGENT_ARCHITECTURE    |
| LLM Council            | Multi-provider consensus                 | MULTI_AGENT_ARCHITECTURE    |
| Skateboard → Car       | Iterative delivery methodology           | ITERATIVE_DEVELOPMENT       |
| E2E-First              | Write E2E test before implementation     | ITERATIVE_DEVELOPMENT       |
| Product Primitives     | Composable building blocks               | ITERATIVE_DEVELOPMENT       |
| MCP Tools              | Model Context Protocol interfaces        | AGENT_TOOLING_REFERENCE     |

---

## Version History

| Version | Date       | Changes                                    |
| ------- | ---------- | ------------------------------------------ |
| 1.0     | 2026-01-17 | Initial consolidation from research docs   |

---

**© 2026 Enterprise AI Pty Ltd. All rights reserved.**
