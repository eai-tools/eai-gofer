---
id: "003-orchestrator-agents"
title: "Orchestrator and AI Agents"
status: "in_progress"
created: "2025-10-21"
updated: "2025-10-21"
priority: "critical"
assignee: "engineer-agent"
---

# Orchestrator and AI Agents

## Overview

The Orchestrator is the central coordination system that manages spec execution, coordinates Engineer and Test agents, monitors file-based communication with Claude Code, and handles the complete development workflow from task assignment to validation.

## Problem Statement

Autonomous development requires:
- Intelligent task orchestration with dependency management
- Automated code review by Engineer agent
- Automated test execution by Test agent
- Self-healing iteration on failures
- Human escalation when stuck
- Continuous monitoring of Claude Code responses

## Solution

An orchestrator process that:
1. Loads specifications and manages task queue
2. Monitors file system for Claude Code responses
3. Coordinates Engineer agent for code validation
4. Coordinates Test agent for Playwright execution
5. Implements retry logic with failure handling
6. Escalates to humans via SMS when needed
7. Maintains conversation context across iterations

## Acceptance Criteria

### AC1: Spec Loading and Task Queue

- **Given** workspace has specifications in `.specify/specs/`
- **When** orchestrator starts
- **Then** all specs are loaded via SpecLoader
- **And** task queue is built respecting dependencies
- **And** next available task is identified

### AC2: File-Based Communication Monitoring

- **Given** orchestrator is running
- **When** `.claude-input.txt` is updated
- **Then** file change is detected within 300ms
- **And** content is read and sent to Claude Code bridge
- **When** `.claude-output.txt` is updated
- **Then** response is captured and processed

### AC3: Task Execution Flow

- **Given** next task is identified
- **When** task has status `pending` and dependencies met
- **Then** task status changes to `in_progress`
- **And** delivery prompt is written to `.claude-input.txt`
- **And** orchestrator waits for response

### AC4: Engineer Agent Validation

- **Given** Claude Code provides implementation
- **When** test results show failures
- **Then** Engineer agent is invoked with:
  - Task description
  - Implementation code
  - Test results
- **And** agent returns validation result with:
  - `isValid` boolean
  - List of issues found
  - List of actionable suggestions

### AC5: Test Agent Execution

- **Given** implementation is received from Claude
- **When** orchestrator processes the response
- **Then** Test agent executes Playwright tests
- **And** test results include:
  - Pass/fail status
  - List of failed tests
  - Summary message
- **And** results are passed to Engineer agent

### AC6: Self-Healing Iteration

- **Given** Engineer agent finds issues
- **When** attempt count < 3
- **Then** fix prompt is generated with:
  - Failed test names
  - Issues identified
  - Suggestions for fixes
- **And** fix prompt is sent back to Claude Code
- **And** attempt counter increments

### AC7: Human Escalation

- **Given** task fails 3 times
- **Or** Engineer agent cannot determine fix
- **When** max attempts reached
- **Then** SMS notification is sent via Twilio
- **And** notification includes:
  - Task description
  - Last error summary
  - Request for human review
- **And** task status changes to `failed`

### AC8: Success Flow

- **Given** tests pass and Engineer agent approves
- **When** validation is complete
- **Then** task status changes to `completed`
- **And** next task in queue is processed
- **And** progress is saved to spec files

### AC9: Q&A Engine Integration

- **Given** Claude Code asks a question
- **When** question is detected in communication
- **Then** QA Engine searches specifications
- **And** if answer found with high confidence, responds
- **And** if answer uncertain, escalates to human

### AC10: Constitution Validation

- **Given** Engineer agent validates code
- **When** checking against principles
- **Then** validates:
  - TypeScript strict mode, no `any`
  - File size < 300 lines
  - Test coverage >= 80%
  - Security principles (password hashing, JWT expiry)
  - Performance requirements (API < 500ms, UI < 100ms)

## Technical Design

### Architecture

```
src/
├── index.ts                    # Main entry point
├── types.ts                    # Shared type definitions
├── orchestrator/
│   ├── Orchestrator.ts         # Main coordinator
│   ├── SpecLoader.ts           # Loads and parses specs
│   └── QAEngine.ts             # Spec-based Q&A
├── agents/
│   ├── EngineerAgent.ts        # Code validation
│   └── TestAgent.ts            # Playwright runner
├── interceptor/
│   └── ClaudeCodeInterceptor.ts # File monitoring
└── utils/
    └── NotificationService.ts  # Twilio SMS
```

### Key Components

**1. Orchestrator (Orchestrator.ts)**
- Manages overall workflow
- Coordinates agents
- Handles file monitoring events
- Implements retry logic
- Tracks task state

**2. SpecLoader (SpecLoader.ts)**
- Discovers and loads specs
- Parses GitHub Spec Kit format
- Updates task status
- Manages spec persistence

**3. EngineerAgent (EngineerAgent.ts)**
- Uses Claude API for validation
- Analyzes test failures
- Provides fix suggestions
- Checks constitution compliance

**4. TestAgent (TestAgent.ts)**
- Executes Playwright tests
- Parses test results
- Generates test reports
- Handles test failures

**5. QAEngine (QAEngine.ts)**
- Semantic search over specs
- Confidence scoring
- Human escalation logic

**6. ClaudeCodeInterceptor (ClaudeCodeInterceptor.ts)**
- File system watcher (Chokidar)
- Bidirectional communication
- Response parsing
- Question detection

## Tasks

- [x] #T001 Create Orchestrator class with workflow logic (deps: none)
- [x] #T002 Implement SpecLoader with GitHub Spec Kit parsing (deps: none)
- [x] #T003 Build EngineerAgent with Claude API integration (deps: none)
- [x] #T004 Build TestAgent with Playwright execution (deps: none)
- [x] #T005 Create ClaudeCodeInterceptor with file monitoring (deps: none)
- [x] #T006 Implement NotificationService with Twilio (deps: none)
- [x] #T007 Build QAEngine with semantic search (deps: T002)
- [x] #T008 Integrate all components in Orchestrator (deps: T001,T002,T003,T004,T005,T006,T007)
- [x] #T009 Add task dependency resolution (deps: T002,T008)
- [x] #T010 Implement retry logic with attempt tracking (deps: T008)
- [ ] #T011 Add constitution validation in EngineerAgent (deps: T003)
- [ ] #T012 Create comprehensive test suite (deps: T011)
- [ ] #T013 Add error handling and recovery (deps: T012)
- [ ] #T014 Implement graceful shutdown (deps: T013)
- [ ] #T015 Add performance monitoring (deps: T014)

## Dependencies

### Internal
- Language Server for MCP tools
- `.specify/` specs and constitution
- Claude Code or file-based bridge

### External
- Anthropic API key
- Playwright installed
- Twilio account (optional)
- Node.js 18+

## Test Strategy

### Unit Tests
- SpecLoader parsing and status updates
- Task dependency resolution
- Engineer agent validation logic
- Test agent result parsing
- Retry logic and attempt counting

### Integration Tests
- End-to-end task execution
- Multi-task workflows
- Failure and retry scenarios
- Agent coordination
- File monitoring

### E2E Tests
1. Create test spec with 3 tasks
2. Start orchestrator
3. Simulate Claude Code responses
4. Verify task progression
5. Test failure and retry
6. Verify completion

## Performance Considerations

- Orchestrator should start in <2s
- File monitoring should detect changes in <300ms
- Agent calls should timeout after 30s
- Spec updates should be atomic
- Memory usage < 200MB for 100 specs

## Security Considerations

- Sanitize all user input in specs
- Validate file paths strictly
- Secure API keys in environment
- Rate limit API calls
- Don't log sensitive data

## Documentation Needs

- Architecture overview
- Agent coordination flow
- Configuration guide
- Troubleshooting guide
- API key setup

## Success Metrics

- 95%+ task success rate on valid implementations
- <30s average task iteration time
- <5% false negative rate from Engineer agent
- Zero deadlocks or hanging processes

## Future Enhancements

- Multi-spec parallel execution
- Custom agent plugins
- Real-time progress dashboard
- Integration with CI/CD
- Distributed orchestration
