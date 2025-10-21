# GitHub Spec Kit - Comprehensive Research Report

**Research Date:** October 19, 2025
**Source:** github.com/github/spec-kit
**Version:** 0.0.30+ (actively developed)
**Release Date:** September 2, 2025

---

## Executive Summary

GitHub Spec Kit is an open-source toolkit for Spec-Driven Development (SDD) that provides a structured process for AI-assisted software development. It formalizes specification-driven workflows through a CLI, templates, and prompts that guide work through specification, planning, task breakdown, and implementation phases.

**Key Philosophy:** Treat specifications as first-class citizens in your repository—artifacts that live beside code, tests, and documentation, serving as executable instructions and quality gates for AI-driven development.

---

## 1. The .specify Folder Structure

### 1.1 Root Directory Structure

When Spec Kit initializes a project, it creates two main folders:

```
project-root/
├── .specify/                    # Main spec-kit directory
│   ├── memory/
│   │   └── constitution.md     # Project principles and governance
│   ├── scripts/
│   │   ├── bash/              # For macOS/Linux
│   │   │   ├── create-new-feature.sh
│   │   │   ├── setup-plan.sh
│   │   │   ├── check-prerequisites.sh
│   │   │   └── update-agent-context.sh
│   │   └── powershell/        # For Windows
│   │       ├── create-new-feature.ps1
│   │       ├── setup-plan.ps1
│   │       ├── check-task-prerequisites.ps1
│   │       ├── get-feature-paths.ps1
│   │       ├── update-agent-context.ps1
│   │       └── common.ps1
│   ├── specs/                 # Feature specifications (created per feature)
│   │   └── [###-feature-name]/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       ├── research.md
│   │       ├── data-model.md
│   │       ├── quickstart.md
│   │       ├── contracts/
│   │       └── tasks/
│   └── templates/
│       ├── spec-template.md
│       ├── plan-template.md
│       ├── tasks-template.md
│       └── agent-file-template.md
├── .github/                    # (or .claude/, .gemini/ depending on agent)
│   └── commands/              # Slash command definitions
│       ├── constitution.md
│       ├── specify.md
│       ├── clarify.md
│       ├── plan.md
│       ├── tasks.md
│       ├── implement.md
│       ├── analyze.md
│       └── checklist.md
└── AGENTS.md                  # Agent context file (or CLAUDE.md, GEMINI.md)
```

### 1.2 2025 Proposal: Consolidated Structure

There is an active proposal (Issue #38) to consolidate all directories under `.specify/`:

```
.specify/
├── memory/
├── scripts/
├── specs/
├── templates/
├── out/
└── commands/
```

### 1.3 Feature Directory Numbering

Features are auto-numbered with branches like:
- `001-photo-albums`
- `002-user-authentication`
- `003-search-functionality`

Each creates a corresponding directory in `specs/`:
```
specs/001-photo-albums/
├── spec.md          # Main specification (always present)
├── plan.md          # Technical plan (Phase 1)
├── research.md      # Technical research (Phase 0)
├── data-model.md    # Data architecture (Phase 1)
├── quickstart.md    # Getting started guide (Phase 1)
├── contracts/       # API contracts, data flow (Phase 1)
└── tasks/           # Task breakdown (Phase 2)
```

---

## 2. Specification File Format

### 2.1 spec.md Structure

The specification file uses YAML frontmatter for metadata followed by Markdown content.

#### 2.1.1 YAML Frontmatter Format

```yaml
---
feature: "001-feature-name"
status: "draft|in-progress|ready-for-planning|completed"
created: "2025-10-19"
updated: "2025-10-19"
author: "username"
---
```

#### 2.1.2 Mandatory Sections

Every specification MUST include:

1. **Feature Overview** - High-level description of what and why
2. **User Stories** - Realistic scenarios describing user interactions
3. **Functional Requirements** - Testable requirements (each must be verifiable)
4. **Success Criteria** - Measurable outcomes
5. **Key Entities** - Data model concepts
6. **Assumptions** - Documented defaults for unspecified details

#### 2.1.3 Optional Sections

Include only when relevant:
- **User Scenarios & Testing**
- **Constraints**
- **Dependencies**
- **Performance Requirements**
- **Security Considerations**
- **Accessibility Requirements**

#### 2.1.4 Template Processing Rules

**Quality Guidelines:**
- Maximum of 3 `[NEEDS CLARIFICATION]` markers (critical decisions only)
- Remove non-applicable sections entirely (don't use "N/A")
- Focus on WHAT users need and WHY (avoid implementation details)
- Each functional requirement must be testable

**Processing Flow:**
1. Parse user description
2. Extract key concepts (actors, actions, data, constraints)
3. Mark unclear aspects with `[NEEDS CLARIFICATION]`
4. Fill User Scenarios & Testing sections
5. Generate Functional Requirements

#### 2.1.5 Example Specification Sections

```markdown
# Feature Overview

[High-level description focusing on user value and business context]

## User Stories

- As a [user type], I want to [action] so that [benefit]
- As a [user type], I want to [action] so that [benefit]

## Functional Requirements

1. **FR-001**: Users can create albums with names up to 100 characters
2. **FR-002**: System shall support uploading JPEG, PNG, and WebP formats
3. **FR-003**: Photos shall be automatically sorted by upload timestamp

## Success Criteria

- Users can organize 1000+ photos with sub-second response times
- 95% of users complete album creation without assistance
- Zero data loss during upload operations

## Key Entities

- **Album**: Contains name, description, created_date, owner_id
- **Photo**: Contains file_path, upload_date, album_id, metadata
- **User**: Contains user_id, name, email

## Assumptions

- Users have stable internet connections (minimum 1Mbps upload)
- Browser supports HTML5 file upload APIs
- Images under 10MB per file
```

### 2.2 Clarifications Section

The `/speckit.clarify` command adds a structured Q&A section:

```markdown
## Clarifications

### Question 1: [Topic]
**Q:** [Clarifying question from AI]
**A:** [User response]
**Impact:** [How this affects the specification]

### Question 2: [Topic]
**Q:** [Clarifying question from AI]
**A:** [User response]
**Impact:** [How this affects the specification]
```

---

## 3. Constitution Document (constitution.md)

### 3.1 Purpose and Function

The constitution is stored at `.specify/memory/constitution.md` and contains non-negotiable project principles that:
- Act as quality gates during all phases
- Guide technical decisions and implementation choices
- Supersede all other practices
- Must be validated against in all PRs/reviews

### 3.2 Constitution Articles

The constitution typically contains 9 articles covering:

1. **Code Quality** - Standards for maintainability, readability, documentation
2. **Testing Standards** - Coverage requirements, test types, TDD practices
3. **User Experience** - Consistency, accessibility, performance expectations
4. **Performance Requirements** - Response times, throughput, scalability
5. **Security Principles** - Authentication, authorization, data protection
6. **Accessibility** - WCAG compliance, inclusive design
7. **Architecture Principles** - Design patterns, separation of concerns
8. **Documentation** - Code comments, API docs, README standards
9. **Governance** - How principles guide decisions, exception handling

### 3.3 Quality Gate Enforcement

**During Planning (`/speckit.plan`):**
- Plan must validate against constitutional principles
- Constitutional violations are marked as CRITICAL
- AI cannot proceed without passing gates or documenting exceptions

**During Analysis (`/speckit.analyze`):**
- Cross-artifact validation checks alignment
- Constitutional violations block `/implement` command
- Acts as "compile-time checks" for architectural principles

### 3.4 Example Constitution Structure

```markdown
# Project Constitution

## Article I: Code Quality

All code must:
- Follow [language] style guide conventions
- Include inline documentation for complex logic
- Maintain cyclomatic complexity below 10
- Pass automated linting without warnings

## Article II: Testing Standards

- Minimum 80% code coverage for new features
- All functional requirements must have corresponding tests
- Tests written before implementation (TDD)
- Integration tests for all API endpoints

## Article III: User Experience

- All interactive elements respond within 100ms
- Form validation provides immediate feedback
- Error messages are actionable and user-friendly
- Support keyboard navigation for all features

[... additional articles ...]
```

### 3.5 Governance Model

**Constitutional Supremacy:**
- Constitution supersedes all other practices
- All PRs/reviews verify compliance
- Complexity must be justified
- Deviations require explicit documentation and approval

**RLHF Scoring System:**
Each implementation step scores -2 to +2:
- **+2**: Perfect implementation with domain documentation
- **+1**: Good implementation, minor improvements needed
- **0**: Acceptable but not optimal
- **-1**: Needs rework
- **-2**: Architecture violations (blocks progress)

---

## 4. Technical Plans (plan.md)

### 4.1 Plan Template Structure

The plan includes:

#### Technical Specifications
- **Language/Version**: e.g., "Python 3.11+"
- **Primary Dependencies**: Core libraries and frameworks
- **Storage**: Database, file systems, caching
- **Testing**: Framework and approach
- **Target Platform**: Deployment environment
- **Project Type**: Web app, CLI, mobile, etc.
- **Performance Goals**: Response times, throughput
- **Constraints**: Technical limitations
- **Scale/Scope**: Expected load, data volume

#### 4.2 Project Structure Options

The template provides three standard structures:

**Option 1: Single Project**
```
project/
├── src/
│   ├── core/
│   ├── services/
│   └── utils/
└── tests/
    ├── unit/
    └── integration/
```

**Option 2: Web Application**
```
project/
├── backend/
│   ├── api/
│   ├── models/
│   └── services/
└── frontend/
    ├── components/
    ├── pages/
    └── styles/
```

**Option 3: Mobile + API**
```
project/
├── api/
│   ├── routes/
│   └── models/
└── mobile/
    ├── screens/
    └── components/
```

#### 4.3 Architecture Documentation

The plan.md records:
- Architectural choices and rationale
- Data flow diagrams (in text/Mermaid)
- Library selections with justification
- External dependencies and integrations
- API design and contracts
- Security architecture
- Deployment strategy

#### 4.4 Example Plan Prompt

```markdown
/speckit.plan

Technical requirements:
- Framework: FastAPI (Python)
- Database: PostgreSQL with SQLAlchemy ORM
- API: RESTful with OpenAPI documentation
- Authentication: JWT tokens
- Frontend: React with TypeScript
- State management: Redux Toolkit
- Testing: pytest, Jest
- Deployment: Docker containers on AWS ECS
```

---

## 5. Task Breakdown (tasks.md)

### 5.1 Task Generation Process

The `/speckit.tasks` command follows this workflow:

1. **Load Prerequisites**
   - Load `plan.md` from feature directory
   - Extract tech stack, libraries, structure
   - Load optional design documents:
     - `data-model.md` for entity modeling tasks
     - `contracts/` for contract test tasks
     - `research.md` for setup tasks

2. **Generate Tasks by Category**
   - **Setup**: Project initialization, dependencies, linting
   - **Tests**: Contract tests, integration tests (TDD)
   - **Core**: Models, services, business logic
   - **Integration**: Database, middleware, logging
   - **Polish**: Unit tests, performance, documentation

3. **Apply Task Rules**
   - Different files marked `[P]` for parallel execution
   - Same file tasks are sequential (no `[P]`)
   - Tests come before implementation (TDD principle)
   - Tasks numbered sequentially: T001, T002, T003...

4. **Create Dependency Graph**
   - Visualize task dependencies
   - Identify critical path
   - Enable parallel execution where possible

### 5.2 Task Template Format

```markdown
## Setup

- [ ] **T001** [P] Initialize project structure
- [ ] **T002** [P] Set up dependency management (package.json/requirements.txt)
- [ ] **T003** [P] Configure linting and formatting

## Tests (TDD - Write First)

- [ ] **T004** Write contract tests for User API endpoints
- [ ] **T005** Write integration tests for authentication flow
- [ ] **T006** [P] Write contract tests for Album API endpoints

## Core Implementation

- [ ] **T007** Implement User model and schema
- [ ] **T008** Implement authentication service
- [ ] **T009** Implement Album model and schema
- [ ] **T010** [P] Implement photo upload service

## Integration

- [ ] **T011** Set up database migrations
- [ ] **T012** Configure logging and monitoring
- [ ] **T013** Implement error handling middleware

## Polish

- [ ] **T014** [P] Add unit tests for services
- [ ] **T015** [P] Performance testing and optimization
- [ ] **T016** [P] Update documentation and README
```

### 5.3 Task Execution

**Sequential vs Parallel:**
- `[P]` marker indicates tasks that can run in parallel
- Tasks without `[P]` must run sequentially
- Tasks in the same file cannot be parallel

**Progress Tracking:**
- Checkboxes track completion
- Status updates in real-time
- Task list updated as implementation progresses

**User Story Organization:**
- Tasks organized by user story when applicable
- Each user story becomes an implementation phase
- Dependency management across stories

---

## 6. Quality Gates and Validation

### 6.1 Multi-Level Validation

#### Constitutional Gates
- **When**: During `/speckit.plan` and `/speckit.analyze`
- **What**: Validates against constitution.md principles
- **Enforcement**: CRITICAL violations block `/implement`
- **Scoring**: RLHF system (-2 to +2) for each step

#### Cross-Artifact Validation
- **When**: During `/speckit.analyze`
- **What**: Checks alignment between spec, plan, tasks
- **Checks**:
  - All spec requirements covered in plan
  - All plan elements have corresponding tasks
  - No contradictions between artifacts
  - Completeness of coverage

#### Continuous Quality Improvement
- **Not a one-time gate**: Ongoing refinement process
- **AI Analysis**: Checks for ambiguity, contradictions, gaps
- **Iterative**: Improves quality throughout development

### 6.2 Validation Commands

#### `/speckit.analyze`
Performs comprehensive validation:
```markdown
Running Analysis...

✓ Constitution Compliance
  ✓ Code quality principles applied
  ✓ Testing standards met
  ⚠ Performance requirements need clarification

✓ Spec-Plan Alignment
  ✓ All functional requirements addressed
  ✓ Success criteria mapped to implementation

✓ Plan-Tasks Alignment
  ✓ All technical components have tasks
  ⚠ Missing tasks for error handling in User service

⚠ Overall Status: NEEDS ATTENTION
  - 2 items require clarification before implementation
```

#### `/speckit.checklist`
Domain-specific validation ("unit tests for English"):
- **UX**: Accessibility, responsiveness, user feedback
- **Security**: Authentication, authorization, data protection
- **Performance**: Load times, scalability, caching
- **Testing**: Coverage, test types, edge cases

### 6.3 Test Generation Integration

#### Acceptance Criteria → Tests
- Acceptance scenarios become test specifications
- Tests aren't written after code—they're part of the spec
- Test scenarios guide both implementation and validation

#### TDD Workflow
1. Specification defines acceptance criteria
2. `/speckit.plan` translates to technical requirements
3. `/speckit.tasks` generates test tasks FIRST
4. Implementation follows test creation
5. Tests validate against original specification

#### Contract Testing
- API contracts defined in `contracts/` directory
- Contract tests generated from specifications
- Ensures API compliance with defined contracts
- Validates data flow and integration points

---

## 7. Progress Tracking and Updates

### 7.1 Real-Time Tracking Features

#### Live Spec Updates
- Specifications update in real-time during chat
- YAML format shows live changes
- Clear visibility into specification evolution

#### Task Visualization
- Real-time task status indicators
- Task management dashboard
- Progress bars and completion metrics

#### Checklist System
Heavy use of checklists throughout files:
- User clarifications tracking
- Constitution violation tracking
- Research task completion
- Implementation progress

### 7.2 Status Reporting

#### File-Level Status
Each artifact tracks its status:
```yaml
---
status: "draft|in-progress|ready-for-planning|completed"
---
```

#### Feature-Level Tracking
The main `spec.md` orchestrates progress:
- Links to all related artifacts
- Tracks overall feature completion
- Documents dependencies and blockers

#### Phase Tracking
```markdown
## Progress

- [x] Phase 0: Research (research.md)
- [x] Phase 1: Planning (plan.md, data-model.md, contracts/)
- [ ] Phase 2: Task Breakdown (tasks/)
- [ ] Phase 3: Implementation
```

### 7.3 Update Mechanisms

#### Automatic Updates
Scripts automatically update:
- Agent context files when artifacts change
- Task lists during implementation
- Cross-references between documents

#### Manual Updates
Developers can:
- Edit Markdown files directly
- Re-run commands to regenerate sections
- Update status fields as work progresses

#### Git Integration
- Each feature on separate branch (001-feature-name)
- Specifications version-controlled with code
- Git history tracks specification evolution
- Branch naming ensures traceability

---

## 8. Architecture Documentation Requirements

### 8.1 Architecture in plan.md

The plan.md serves as the primary architecture document:

#### System Architecture
- High-level system design
- Component interaction diagrams
- Technology stack decisions
- Deployment architecture

#### Data Architecture (data-model.md)
```markdown
# Data Model

## Entities

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}
```

### Album
```typescript
interface Album {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  photos: Photo[];
  created_at: Date;
}
```

## Relationships

- User → Album: One-to-Many
- Album → Photo: One-to-Many

## Validation Rules

- User.email: Valid email format, unique
- Album.name: 1-100 characters
- Photo.file_size: Maximum 10MB
```

#### API Contracts (contracts/)
```markdown
# REST API Endpoints

## POST /api/albums
Request:
```json
{
  "name": "string (1-100 chars)",
  "description": "string (optional)"
}
```

Response (201):
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "created_at": "ISO 8601 datetime"
}
```

## WebSocket Events

### Event: photo.uploaded
```json
{
  "event": "photo.uploaded",
  "data": {
    "photo_id": "string",
    "album_id": "string",
    "url": "string"
  }
}
```
```

### 8.2 Research Documentation (research.md)

Captures the "why" behind technical decisions:

```markdown
# Technical Research

## WebSocket Library Comparison

### Socket.IO
**Pros:**
- Automatic reconnection
- Room support built-in
- Fallback to polling

**Cons:**
- Larger bundle size
- More complex setup

**Decision:** Selected for real-time photo updates

## State Management

### Evaluated Options
1. Redux Toolkit - Selected
   - Reason: Team familiarity, excellent DevTools
2. Zustand - Rejected
   - Reason: Too simple for our complex state needs
3. MobX - Rejected
   - Reason: Steeper learning curve

## Performance Strategies

- Image lazy loading with Intersection Observer
- Virtual scrolling for large photo grids
- CDN for static assets
- Database indexing on user_id and album_id
```

### 8.3 Quickstart Documentation (quickstart.md)

Actionable setup and validation:

```markdown
# Quickstart Guide

## Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Docker (optional)

## Setup Steps

1. **Clone and Install**
   ```bash
   git clone repo-url
   npm install
   pip install -r requirements.txt
   ```

2. **Database Setup**
   ```bash
   docker-compose up -d postgres
   python manage.py migrate
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run Development Servers**
   ```bash
   # Terminal 1 - Backend
   uvicorn main:app --reload

   # Terminal 2 - Frontend
   npm run dev
   ```

## Validation Tests

### Test 1: API Health Check
```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

### Test 2: Create Test Album
```bash
curl -X POST http://localhost:8000/api/albums \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Album"}'
# Expected: 201 with album data
```

## Troubleshooting

**Issue:** Database connection fails
**Solution:** Ensure PostgreSQL is running on port 5432

**Issue:** Frontend build errors
**Solution:** Clear node_modules and reinstall
```

### 8.4 Architecture vs ADR Distinction

**Spec Kit Plans** are:
- Living documents that evolve with the project
- Compressed summaries of current state
- AI-optimized for implementation guidance
- Integrated with specification and tasks

**Architecture Decision Records (ADRs)** are:
- Historical records of specific decisions
- Include context, intuition, reasoning, justification
- Capture trade-offs and alternatives considered
- Immutable once written

**Relationship:**
- Plan.md and research.md can reference ADRs
- ADRs provide deeper rationale for decisions in plans
- Plans summarize; ADRs explain

---

## 9. Test Generation and Validation Approaches

### 9.1 Specification by Example

Spec Kit implements Specification by Example principles:

**From Spec to Tests:**
1. Acceptance criteria in spec.md define expected behavior
2. User stories describe concrete scenarios
3. Success criteria provide measurable outcomes
4. These become test specifications

**Example Flow:**
```markdown
## Acceptance Criteria (spec.md)

- AC-001: Users can upload JPEG images up to 10MB
- AC-002: Upload progress shown in real-time
- AC-003: Invalid file types rejected with error message

↓ Becomes ↓

## Test Cases (tasks.md)

- [ ] T004: Write test: Upload valid 5MB JPEG succeeds
- [ ] T005: Write test: Upload 11MB JPEG fails with size error
- [ ] T006: Write test: Upload PDF file fails with type error
- [ ] T007: Write test: Progress callback fired during upload
```

### 9.2 Test-Driven Development (TDD) Integration

#### Task Ordering for TDD
```markdown
## Phase 1: Tests (Write First)

- [ ] T010: Write unit tests for User model validation
- [ ] T011: Write integration tests for /auth/login endpoint
- [ ] T012: Write contract tests for Album API

## Phase 2: Implementation

- [ ] T013: Implement User model (make T010 pass)
- [ ] T014: Implement login endpoint (make T011 pass)
- [ ] T015: Implement Album API (make T012 pass)
```

#### Test Categories Generated

**1. Contract Tests**
- API endpoint contracts
- Data structure validation
- Integration point verification

**2. Integration Tests**
- Database operations
- Authentication flows
- End-to-end user scenarios

**3. Unit Tests**
- Business logic validation
- Service layer testing
- Utility function testing

**4. Acceptance Tests**
- User story validation
- Success criteria verification
- End-user scenario testing

### 9.3 Test Generation Process

#### From data-model.md
```markdown
# Data Model

## User Entity
- email: string (valid email format, unique)
- password: string (min 8 chars, hashed)

↓ Generates ↓

## Test Tasks
- [ ] T020: Test email validation (valid formats pass)
- [ ] T021: Test email validation (invalid formats fail)
- [ ] T022: Test email uniqueness constraint
- [ ] T023: Test password minimum length validation
- [ ] T024: Test password hashing on save
```

#### From contracts/
```markdown
# API Contract: POST /albums

Request:
{
  "name": "string (1-100 chars, required)",
  "description": "string (optional)"
}

Response 201:
{
  "id": "uuid",
  "name": "string",
  "created_at": "ISO 8601"
}

Response 400:
{
  "error": "string",
  "field": "string"
}

↓ Generates ↓

## Contract Tests
- [ ] T030: Valid album creation returns 201 with all fields
- [ ] T031: Missing name returns 400 with field error
- [ ] T032: Name over 100 chars returns 400
- [ ] T033: Invalid JSON returns 400
- [ ] T034: Response includes valid UUID for id
- [ ] T035: created_at is valid ISO 8601 timestamp
```

### 9.4 Test Validation Strategies

#### Coverage Requirements (from constitution.md)
```markdown
## Testing Standards

- Minimum 80% code coverage for new features
- 100% coverage for critical paths (auth, payments)
- All functional requirements have tests
- All API endpoints have contract tests
- All edge cases documented and tested
```

#### Test Completeness Checks

The `/speckit.analyze` command validates:
```markdown
Test Coverage Analysis:

✓ Functional Requirements
  ✓ FR-001: Covered by T020, T021
  ✓ FR-002: Covered by T030, T031
  ⚠ FR-003: No tests found

✓ API Endpoints
  ✓ POST /albums: Contract tests present
  ✓ GET /albums: Contract tests present
  ✗ DELETE /albums/:id: Missing tests

⚠ Edge Cases
  ⚠ Large file uploads: Not tested
  ⚠ Concurrent uploads: Not tested
  ✓ Invalid file types: Covered

Action Required:
- Add tests for FR-003
- Create contract tests for DELETE endpoint
- Add performance tests for edge cases
```

#### Continuous Validation

Tests serve as ongoing validation:
- **During Development**: TDD ensures tests pass
- **During PR Review**: CI/CD runs full test suite
- **After Deployment**: Acceptance tests verify production
- **Regression Prevention**: Tests prevent breaking changes

### 9.5 Test Automation

Scripts generated in `.specify/scripts/`:

**Bash Example:**
```bash
#!/bin/bash
# run-tests.sh

echo "Running contract tests..."
pytest tests/contract/ -v

echo "Running unit tests..."
pytest tests/unit/ --cov=src --cov-report=html

echo "Running integration tests..."
pytest tests/integration/ -v

echo "Checking coverage..."
coverage report --fail-under=80
```

**PowerShell Example:**
```powershell
# run-tests.ps1

Write-Host "Running contract tests..."
pytest tests/contract/ -v

Write-Host "Running unit tests..."
pytest tests/unit/ --cov=src --cov-report=html

Write-Host "Checking coverage..."
coverage report --fail-under=80
```

---

## 10. Slash Commands Reference

### 10.1 Complete Command List

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/speckit.constitution` | Create project principles | Natural language description of values | `.specify/memory/constitution.md` |
| `/speckit.specify` | Create feature spec | Feature requirements and user needs | `specs/###-feature/spec.md` |
| `/speckit.clarify` | Resolve ambiguities | Answers to sequential questions | Updates spec.md with Clarifications section |
| `/speckit.plan` | Generate technical plan | Tech stack preferences | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| `/speckit.tasks` | Break down into tasks | None (uses plan.md) | `tasks.md` with numbered, ordered tasks |
| `/speckit.implement` | Execute implementation | None (uses tasks.md) | Code implementation |
| `/speckit.analyze` | Validate alignment | None (analyzes all artifacts) | Validation report |
| `/speckit.checklist` | Domain-specific validation | Domain (UX, security, etc.) | Checklist report |

### 10.2 Workflow Sequence

```
┌─────────────────────┐
│ /speckit.constitution│ (One-time setup)
└──────────┬──────────┘
           ↓
┌──────────────────────────────────────────┐
│         Feature Development Loop          │
│                                          │
│  ┌──────────────────┐                   │
│  │ /speckit.specify │                   │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │ /speckit.clarify │ (Optional)        │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │ /speckit.analyze │ (Validate spec)   │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │  /speckit.plan   │                   │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │ /speckit.analyze │ (Validate plan)   │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │ /speckit.tasks   │                   │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │/speckit.checklist│ (Optional)        │
│  └────────┬─────────┘                   │
│           ↓                              │
│  ┌──────────────────┐                   │
│  │/speckit.implement│                   │
│  └────────┬─────────┘                   │
│           ↓                              │
└───────────┼──────────────────────────────┘
            ↓
      [Repeat for next feature]
```

### 10.3 Command Templates

#### `/speckit.constitution`
```markdown
/speckit.constitution

Create a constitution for a photo management application with these principles:
- Security: End-to-end encryption for all photo storage
- Performance: Sub-second load times for galleries up to 1000 photos
- Accessibility: WCAG 2.1 AA compliance for all UI
- Testing: Minimum 80% code coverage, TDD required
- Code Quality: TypeScript strict mode, comprehensive error handling
- UX: Progressive enhancement, mobile-first design
```

#### `/speckit.specify`
```markdown
/speckit.specify

Build a photo album feature where users can:
- Create named albums with optional descriptions
- Upload photos (JPEG, PNG, WebP) up to 10MB each
- Organize photos into albums via drag-and-drop
- View photos in a responsive grid layout
- Delete albums and photos

Success criteria:
- Handle 1000+ photos per album smoothly
- Upload progress indicators for large files
- Automatic thumbnail generation
```

#### `/speckit.clarify`
```markdown
/speckit.clarify

[AI will ask structured questions like:]
Q1: Should users be able to share albums with other users?
Q2: What happens to photos when an album is deleted?
Q3: Should photos support metadata (EXIF, location)?
```

#### `/speckit.plan`
```markdown
/speckit.plan

Technical requirements:
- Backend: Python FastAPI with async support
- Database: PostgreSQL with SQLAlchemy
- File Storage: AWS S3 for photos
- Frontend: React 18 with TypeScript
- State: Redux Toolkit
- Testing: pytest, Jest, Playwright
- Deployment: Docker on AWS ECS
```

---

## 11. Installation and Setup

### 11.1 Installation Methods

#### Method 1: One-Time Usage (Recommended for trying out)
```bash
uvx --from git+https://github.com/github/spec-kit.git specify init my-project
```

#### Method 2: Persistent Installation
```bash
# Install the CLI globally
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Use it anywhere
specify init my-project
```

#### Method 3: npm Package
```bash
# Install globally
npm install -g @spec-kit/cli

# Or use with npx
npx @spec-kit/cli init my-project

# Or with bunx
bunx @spec-kit/cli init my-project
```

### 11.2 Initialization Options

#### Basic Initialization
```bash
specify init my-project
```

#### Initialize in Current Directory
```bash
specify init .
# or
specify init my-project --here
```

#### Specify AI Agent
```bash
specify init my-project --ai claude
specify init my-project --ai gemini
specify init my-project --ai copilot
```

#### Specify Script Type
```bash
specify init my-project --script sh      # Bash (macOS/Linux)
specify init my-project --script ps      # PowerShell (Windows)
```

#### Combined Options
```bash
specify init my-project --ai claude --script sh
```

### 11.3 Post-Installation

After initialization:
1. Navigate to project directory
2. Review generated `.specify/` structure
3. Edit `constitution.md` to match project values
4. Ensure Git repository initialized (or initialize one)
5. Start first feature with `/speckit.specify`

---

## 12. Agent Context Files (AGENTS.md)

### 12.1 The AGENTS.md Convention

**Purpose:**
- Provides context that AI agents need but humans don't
- Contains build steps, test commands, conventions
- Serves as executable instructions for AI
- Lives alongside README.md (which is for humans)

### 12.2 File Hierarchy

#### Tool-Specific Files
- `CLAUDE.md` - Claude-specific instructions
- `GEMINI.md` - Gemini-specific instructions
- `CURSOR_RULES` - Cursor-specific instructions
- `.github/copilot-instructions.md` - GitHub Copilot

#### Universal File
- `AGENTS.md` - Universal agent instructions (2025 standard)

#### Precedence Rules
1. Tool-specific file takes precedence if exists
2. Falls back to `AGENTS.md` if tool-specific not found
3. Traverses up directory tree collecting all `AGENTS.md` files

### 12.3 Symlink Approach (Recommended)

Instead of duplicating content:
```bash
# Create AGENTS.md with your content
# Then symlink tool-specific files to it
ln -s AGENTS.md CLAUDE.md
ln -s AGENTS.md GEMINI.md
```

**Benefits:**
- Single source of truth
- No duplication maintenance
- Interoperability across tools
- Team using multiple AI agents shares config

### 12.4 Hierarchy and Scoping

**Directory Hierarchy:**
```
project/
├── AGENTS.md                    # Global project instructions
├── backend/
│   ├── AGENTS.md               # Backend-specific additions
│   └── api/
│       └── AGENTS.md           # API-specific additions
└── frontend/
    └── AGENTS.md               # Frontend-specific additions
```

**Context Accumulation:**
When working in `backend/api/`, agent loads:
1. `project/AGENTS.md` (global)
2. `project/backend/AGENTS.md` (backend context)
3. `project/backend/api/AGENTS.md` (API context)

### 12.5 Example AGENTS.md

```markdown
# Agent Instructions

## Project Context

This is a photo management application built with FastAPI backend and React frontend.

## Build Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing

### Run All Tests
```bash
./scripts/run-tests.sh
```

### Run Specific Test Suites
```bash
pytest tests/unit/        # Unit tests
pytest tests/integration/ # Integration tests
npm run test             # Frontend tests
```

## Code Conventions

- Use async/await for all I/O operations
- Follow PEP 8 for Python code
- Use TypeScript strict mode
- All components must have PropTypes or TypeScript interfaces
- Prefer functional components with hooks

## Common Tasks

### Adding a New API Endpoint
1. Create route in `backend/api/routes/`
2. Add contract test in `tests/contract/`
3. Implement handler (make test pass)
4. Update OpenAPI schema
5. Add integration test

### Adding a New React Component
1. Create in `frontend/components/`
2. Write TypeScript interface for props
3. Add unit tests
4. Export from index.ts
5. Update Storybook

## Database Migrations

```bash
# Create migration
alembic revision -m "description"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## References

- Constitution: `.specify/memory/constitution.md`
- Current specs: `.specify/specs/`
- API docs: http://localhost:8000/docs
```

---

## 13. Key Principles and Best Practices

### 13.1 Core Philosophy

1. **Specifications as First-Class Artifacts**
   - Specifications live beside code in version control
   - They are executable, machine-interpretable instructions
   - They evolve with the project

2. **Constitution First**
   - Everything flows from documented principles
   - Quality gates enforce constitutional compliance
   - Exceptions must be justified and documented

3. **AI as Team Member**
   - Specifications guide AI with precision
   - Structured workflow replaces ad-hoc prompting
   - Consistency across features and developers

4. **Test-Driven by Design**
   - Acceptance criteria become test specifications
   - Tests written before implementation
   - Coverage validated against requirements

### 13.2 When to Use Spec Kit

**Good Fit:**
- New projects starting from scratch
- Features with clear requirements
- Teams using AI coding assistants
- Projects needing strong governance
- Complex systems requiring documentation

**Challenging Fit:**
- Existing large codebases (experimental support)
- Exploratory/research projects
- Projects with rapidly changing requirements
- Solo developers who prefer ad-hoc development

### 13.3 Known Limitations (as of Sept 2025)

1. **Tool Switching**: Difficult to switch AI agents mid-feature
2. **New Project Focus**: Better for greenfield than brownfield
3. **Experimental Status**: Version 0.0.30+, rapid changes
4. **Learning Curve**: Requires understanding workflow
5. **Overhead**: More upfront planning than "vibe coding"

### 13.4 Best Practices

#### Before Starting
- [ ] Define clear constitution aligned with team values
- [ ] Choose AI agent and configure AGENTS.md
- [ ] Understand the workflow sequence
- [ ] Set up CI/CD for test automation

#### During Specification
- [ ] Be explicit about what and why (not how)
- [ ] Use /speckit.clarify for ambiguities
- [ ] Limit [NEEDS CLARIFICATION] to 3 critical items
- [ ] Focus on user value and business context

#### During Planning
- [ ] Validate against constitution with /speckit.analyze
- [ ] Document architectural decisions in research.md
- [ ] Define clear data contracts
- [ ] Include quickstart for new developers

#### During Task Breakdown
- [ ] Follow TDD: tests before implementation
- [ ] Mark parallelizable tasks with [P]
- [ ] Create dependency graph
- [ ] Ensure all requirements have tasks

#### During Implementation
- [ ] Update task lists as you progress
- [ ] Run /speckit.analyze before major changes
- [ ] Keep specifications synchronized with code
- [ ] Document deviations from plan

---

## 14. Comparison with Other Approaches

### 14.1 Spec-Driven vs "Vibe Coding"

| Aspect | Spec-Driven (Spec Kit) | Vibe Coding |
|--------|------------------------|-------------|
| **Planning** | Upfront specification, plan, tasks | Ad-hoc prompting |
| **Documentation** | Built-in, versioned with code | Often neglected |
| **AI Guidance** | Structured, constitutional principles | Free-form prompts |
| **Quality Gates** | Automated validation | Manual review |
| **Reproducibility** | High - specs are executable | Low - depends on prompts |
| **Team Collaboration** | Clear artifacts to review | Harder to coordinate |
| **Speed (Initial)** | Slower - planning overhead | Faster - immediate coding |
| **Speed (Overall)** | Faster - less rework | Slower - more iterations |

### 14.2 Related Tools

**Kiro:**
- Similar spec-driven approach
- Different template structure
- Alternative to Spec Kit

**Tessl:**
- Specification-driven development
- More opinionated architecture
- Integrated deployment

**Traditional TDD:**
- Tests first, then implementation
- No AI-specific guidance
- Spec Kit builds on TDD principles

**BDD/ATDD:**
- Behavior/acceptance-driven
- Similar to spec.md user stories
- Spec Kit incorporates these concepts

---

## 15. Example: Complete Feature Workflow

### Step 0: Initialize Project

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init photo-app --ai claude --script sh
cd photo-app
```

### Step 1: Create Constitution

```markdown
/speckit.constitution

Create a constitution for a photo management SaaS application:

Security:
- End-to-end encryption for photos at rest and in transit
- OAuth 2.0 authentication only
- Regular security audits and dependency updates

Performance:
- Page load times under 2 seconds
- Support 10,000+ photos per user
- Image optimization and lazy loading required

Accessibility:
- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all features
- Screen reader support

Testing:
- 80% code coverage minimum
- TDD required for all features
- Contract tests for all APIs

Code Quality:
- TypeScript strict mode
- Comprehensive error handling
- Self-documenting code with JSDoc
```

**Output:** `.specify/memory/constitution.md`

### Step 2: Create Feature Specification

```markdown
/speckit.specify

Build an album management feature where users can:
- Create albums with names (required) and descriptions (optional)
- Upload photos to albums (JPEG, PNG, WebP up to 10MB each)
- View photos in a responsive masonry grid
- Drag-and-drop to reorganize photos within albums
- Delete individual photos or entire albums
- Share albums with other users via link

Success criteria:
- Handle 1000+ photos per album without performance degradation
- Real-time upload progress indicators
- Automatic thumbnail generation in 3 sizes
- Album loads in under 2 seconds
```

**Output:** `.specify/specs/001-album-management/spec.md`

### Step 3: Clarify Ambiguities

```markdown
/speckit.clarify

[AI asks sequential questions:]

Q1: When a user deletes an album, should the photos be permanently deleted or moved to a "trash" folder with recovery option?

A: Move to trash with 30-day retention, then permanent deletion.

Q2: For album sharing, should users be able to set permissions (view-only vs. can-edit)?

A: Yes - three levels: view-only, can-add-photos, can-edit-everything.

Q3: Should photo uploads support EXIF metadata preservation and display?

A: Yes - preserve all EXIF data, display camera model, date taken, location if available.
```

**Output:** Updates `spec.md` with Clarifications section

### Step 4: Analyze Specification

```markdown
/speckit.analyze

✓ Constitution Compliance
  ✓ Security: OAuth mentioned in success criteria
  ✓ Performance: 2-second load time specified
  ✓ Accessibility: No specific mention
  ⚠ Testing: Acceptance criteria defined

⚠ Completeness
  ⚠ Missing: Error handling specifications
  ⚠ Missing: Accessibility requirements for drag-drop
  ✓ User stories clear and testable

Action Required:
- Add accessibility requirements for drag-drop
- Specify error handling for upload failures
```

### Step 5: Create Technical Plan

```markdown
/speckit.plan

Technical requirements:
- Backend: Python 3.11 with FastAPI
- Database: PostgreSQL 15 with SQLAlchemy ORM
- File Storage: AWS S3 with CloudFront CDN
- Image Processing: Pillow for thumbnails
- Frontend: React 18 with TypeScript
- State Management: Redux Toolkit with RTK Query
- UI Framework: TailwindCSS with Headless UI
- Drag-and-Drop: react-beautiful-dnd
- Testing: pytest, Jest, Playwright
- Deployment: Docker on AWS ECS
```

**Output:**
- `.specify/specs/001-album-management/plan.md`
- `.specify/specs/001-album-management/research.md`
- `.specify/specs/001-album-management/data-model.md`
- `.specify/specs/001-album-management/contracts/`
- `.specify/specs/001-album-management/quickstart.md`

### Step 6: Generate Task Breakdown

```markdown
/speckit.tasks
```

**Output:** `.specify/specs/001-album-management/tasks.md`

```markdown
## Setup

- [ ] **T001** [P] Initialize FastAPI project structure
- [ ] **T002** [P] Initialize React project with TypeScript
- [ ] **T003** [P] Set up PostgreSQL database and migrations
- [ ] **T004** [P] Configure AWS S3 bucket and IAM permissions
- [ ] **T005** Set up Docker Compose for local development

## Tests - Phase 1: Album CRUD

- [ ] **T006** Write contract tests for POST /api/albums
- [ ] **T007** Write contract tests for GET /api/albums
- [ ] **T008** Write contract tests for DELETE /api/albums/:id
- [ ] **T009** Write unit tests for Album model validation

## Implementation - Phase 1: Album CRUD

- [ ] **T010** Implement Album SQLAlchemy model
- [ ] **T011** Implement POST /api/albums endpoint
- [ ] **T012** Implement GET /api/albums endpoint
- [ ] **T013** Implement DELETE /api/albums/:id with trash logic

## Tests - Phase 2: Photo Upload

- [ ] **T014** Write contract tests for POST /api/albums/:id/photos
- [ ] **T015** Write integration tests for S3 upload
- [ ] **T016** Write unit tests for thumbnail generation
- [ ] **T017** Write unit tests for EXIF extraction

## Implementation - Phase 2: Photo Upload

- [ ] **T018** Implement Photo SQLAlchemy model
- [ ] **T019** Implement S3 upload service
- [ ] **T020** Implement thumbnail generation (3 sizes)
- [ ] **T021** Implement EXIF metadata extraction
- [ ] **T022** Implement POST /api/albums/:id/photos endpoint

## Tests - Phase 3: Frontend

- [ ] **T023** [P] Write component tests for AlbumList
- [ ] **T024** [P] Write component tests for PhotoGrid
- [ ] **T025** [P] Write component tests for UploadProgress
- [ ] **T026** Write integration tests for drag-drop reordering

## Implementation - Phase 3: Frontend

- [ ] **T027** Implement AlbumList component
- [ ] **T028** Implement PhotoGrid with masonry layout
- [ ] **T029** Implement UploadProgress with real-time updates
- [ ] **T030** Implement drag-drop reordering
- [ ] **T031** [P] Implement Redux slices for albums and photos
- [ ] **T032** [P] Set up RTK Query API endpoints

## Integration & Polish

- [ ] **T033** Set up CloudFront CDN
- [ ] **T034** Implement lazy loading and virtualization
- [ ] **T035** Add keyboard navigation support
- [ ] **T036** Add ARIA labels and screen reader support
- [ ] **T037** Performance testing with 1000+ photos
- [ ] **T038** [P] Update documentation
- [ ] **T039** [P] Create end-to-end Playwright tests
```

### Step 7: Validate Before Implementation

```markdown
/speckit.checklist

Domain: Accessibility

✓ Keyboard Navigation
  ✓ Task T036 covers keyboard navigation
  ✓ Drag-drop alternative method planned

⚠ Screen Reader Support
  ✓ Task T036 includes ARIA labels
  ⚠ Missing: Alt text strategy for photos

✓ Color Contrast
  ✓ TailwindCSS ensures WCAG compliance

Action Required:
- Add task for photo alt text (user-provided + AI-generated fallback)
```

### Step 8: Implement

```markdown
/speckit.implement
```

AI executes tasks in order, updating checklist as it progresses.

---

## 16. Future Directions and Community

### 16.1 Active Development

**Current Status (October 2025):**
- Version: 0.0.30+
- Status: Experimental but usable
- Rapid iteration and improvements
- Active community contributions

### 16.2 Recent Proposals

1. **Consolidated .specify Directory** (Issue #38)
   - Move all files under `.specify/`
   - Cleaner project root
   - Better organization

2. **Technical Prototyping Phase** (Issue #311)
   - Phase 0.5 between research and planning
   - Proof-of-concept validation
   - Reduce risk in planning

3. **Constitution Catalog** (Issue #366)
   - Shared library of constitutions
   - Industry-specific templates
   - Community best practices

4. **Generate Constitution from Existing Code** (Issue #80)
   - Analyze existing codebase
   - Extract implicit principles
   - Easier brownfield adoption

### 16.3 Resources

**Official:**
- Repository: https://github.com/github/spec-kit
- Documentation: https://github.github.com/spec-kit/
- Blog: https://github.blog/ (search "spec-driven")

**Community:**
- Discussions: github.com/github/spec-kit/discussions
- Issues: github.com/github/spec-kit/issues
- Third-party tutorials on Medium, Dev.to

**Related Projects:**
- specmatic/specmatic-mcp-sample-with-spec-kit
- panaversity/spec-kit-plus

---

## 17. Recommended Migration Path

For updating your current implementation to align with GitHub Spec Kit:

### Phase 1: Structural Alignment
1. Adopt `.specify/` directory structure
2. Organize specs by numbered features
3. Create constitution.md from existing principles
4. Set up script directories (bash/powershell)

### Phase 2: Template Alignment
1. Update spec template to match Spec Kit format
2. Add plan template with tech stack sections
3. Create tasks template with TDD ordering
4. Add research.md, data-model.md, quickstart.md templates

### Phase 3: Workflow Integration
1. Implement slash commands matching Spec Kit
2. Add /speckit.clarify for structured Q&A
3. Add /speckit.analyze for validation
4. Add /speckit.checklist for domain validation

### Phase 4: Quality Gates
1. Implement constitutional validation
2. Add cross-artifact validation
3. Integrate RLHF scoring system
4. Create validation reports

### Phase 5: Testing Integration
1. Ensure TDD task ordering
2. Generate contract tests from specifications
3. Link acceptance criteria to test cases
4. Implement coverage validation

---

## Appendix A: Quick Reference

### Essential Commands
```bash
# Initialize project
uvx --from git+https://github.com/github/spec-kit.git specify init my-project --ai claude

# Workflow commands (in AI agent)
/speckit.constitution
/speckit.specify
/speckit.clarify
/speckit.plan
/speckit.tasks
/speckit.implement
/speckit.analyze
```

### Directory Structure
```
.specify/
├── memory/constitution.md
├── scripts/{bash|powershell}/
├── specs/###-feature-name/
│   ├── spec.md
│   ├── plan.md
│   ├── research.md
│   ├── data-model.md
│   ├── quickstart.md
│   └── contracts/
└── templates/
```

### Key Principles
1. Specifications are first-class artifacts
2. Constitution enforces quality gates
3. TDD: Tests before implementation
4. Validate with /speckit.analyze
5. Document architecture decisions

---

## Appendix B: Template Snippets

### Minimal spec.md
```markdown
---
feature: "001-feature-name"
status: "draft"
---

# Feature Overview

[Description of what and why]

## User Stories

- As a [user], I want to [action] so that [benefit]

## Functional Requirements

1. **FR-001**: [Testable requirement]

## Success Criteria

- [Measurable outcome]

## Key Entities

- **Entity**: [Description]
```

### Minimal plan.md
```markdown
---
feature: "001-feature-name"
---

# Technical Plan

## Tech Stack

- Language/Version:
- Framework:
- Database:
- Testing:

## Project Structure

[Directory layout]

## Architecture

[High-level design]
```

### Minimal tasks.md
```markdown
## Setup

- [ ] **T001** [P] Initialize project

## Tests

- [ ] **T002** Write tests for [feature]

## Implementation

- [ ] **T003** Implement [feature]
```

---

## Appendix C: Comparison Matrix

| Feature | Spec Kit | Traditional Agile | Waterfall | Vibe Coding |
|---------|----------|-------------------|-----------|-------------|
| Upfront Planning | Medium | Low | High | None |
| Documentation | Automated | Manual | Heavy | Minimal |
| AI Integration | Native | Possible | Possible | Ad-hoc |
| Flexibility | Medium | High | Low | High |
| Quality Gates | Automated | Manual | Manual | None |
| Best For | AI-assisted greenfield | Established teams | Fixed requirements | Prototypes |

---

## Conclusion

GitHub Spec Kit represents a formalization of spec-driven development for the AI era. It bridges traditional software engineering practices (TDD, BDD, architecture documentation) with modern AI-assisted development workflows.

**Key Takeaways:**

1. **Structure Over Ad-hoc**: Replace free-form prompting with structured workflows
2. **Documentation as Code**: Specifications version-controlled and executable
3. **Quality by Design**: Constitutional principles enforce standards
4. **AI as Team Member**: Structured guidance produces consistent results
5. **Test-Driven**: Acceptance criteria become test specifications

**When to Adopt:**
- Starting new projects with AI coding assistants
- Need strong governance and documentation
- Teams collaborating on AI-assisted development
- Want reproducible, high-quality AI-generated code

**Current Limitations:**
- Experimental (v0.0.30+)
- Better for greenfield projects
- Learning curve for workflow
- Rapid changes in templates/commands

For updating your implementation, focus on:
1. Directory structure alignment (`.specify/`)
2. Constitutional quality gates
3. Phase-based workflow (specify → plan → tasks)
4. TDD task ordering
5. Multi-artifact validation

---

**Document Version:** 1.0
**Last Updated:** October 19, 2025
**Spec Kit Version Researched:** 0.0.30+
**Sources:** Web search results, GitHub repository references, community discussions
