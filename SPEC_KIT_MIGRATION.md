# Migration to GitHub Spec Kit Standards

## Overview

This document outlines the migration from our current JSON-based specification format to GitHub's Spec Kit standards, which uses Markdown with YAML frontmatter and a more comprehensive workflow.

## Key Differences

### Current Implementation vs Spec Kit

| Aspect | Current | Spec Kit Standard |
|--------|---------|-------------------|
| **Format** | JSON (.json) | Markdown with YAML (.md) |
| **Structure** | Single spec file | Multiple artifacts (spec, plan, tasks, etc.) |
| **Location** | `.specify/*.json` | `.specify/specs/###-feature-name/` |
| **Constitution** | ❌ None | ✅ `.specify/memory/constitution.md` |
| **Technical Plans** | ❌ None | ✅ `plan.md`, `data-model.md`, `contracts/` |
| **Task Format** | JSON array | Markdown with [P] markers, TDD ordering |
| **Quality Gates** | Basic test validation | Constitutional validation, RLHF scoring |
| **Progress Tracking** | Status field | YAML frontmatter + inline checklists |
| **Q&A** | qaRules array | Structured Clarifications section |

## Migration Steps

### Step 1: Update .specify Folder Structure

**Current:**
```
.specify/
├── spec-schema.json
└── example-spec.json
```

**Target:**
```
.specify/
├── memory/
│   └── constitution.md          # NEW: Project principles
├── scripts/
│   ├── bash/
│   │   ├── create-new-feature.sh
│   │   ├── setup-plan.sh
│   │   └── update-agent-context.sh
│   └── powershell/
│       └── (Windows equivalents)
├── specs/
│   └── 001-feature-name/       # Per-feature directory
│       ├── spec.md              # Main specification
│       ├── plan.md              # Technical plan
│       ├── data-model.md        # Data architecture
│       ├── quickstart.md        # Setup guide
│       ├── contracts/           # API contracts
│       └── tasks/
│           └── tasks.md         # Task breakdown
└── templates/
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md
```

### Step 2: Convert Spec Format

**Current JSON Format:**
```json
{
  "id": "feature-001",
  "title": "User Login",
  "description": "Implement user login and registration",
  "tasks": [...],
  "acceptanceCriteria": [...],
  "qaRules": [...]
}
```

**Target Markdown Format:**
```markdown
---
feature: "001-user-login"
status: "ready-for-planning"
created: "2025-10-19"
updated: "2025-10-19"
author: "system"
---

# Feature Overview

Implement user login and registration system allowing users to securely access their accounts.

## User Stories

- As a new user, I want to create an account so that I can access the application
- As a returning user, I want to log in so that I can access my data
- As a user, I want to reset my password if I forget it

## Functional Requirements

1. **FR-001**: System shall allow users to register with email and password
2. **FR-002**: Passwords must be at least 8 characters with complexity requirements
3. **FR-003**: System shall send verification email upon registration
4. **FR-004**: Users can log in with verified email and password
5. **FR-005**: Failed login attempts are limited to 5 per 15 minutes

## Success Criteria

- 95% of users complete registration without assistance
- Login response time under 500ms
- Zero password exposures in logs or error messages
- All authentication flows pass security audit

## Key Entities

- **User**: email, password_hash, verified, created_at, last_login
- **Session**: user_id, token, expires_at, created_at
- **PasswordReset**: user_id, token, expires_at, used

## Assumptions

- Users have valid email addresses
- Email service is available for verification
- HTTPS is enforced for all authentication endpoints
```

### Step 3: Add Constitution Document

Create `.specify/memory/constitution.md`:

```markdown
# Project Constitution

## Article I: Code Quality

All code must:
- Follow TypeScript strict mode conventions
- Include JSDoc comments for public APIs
- Maintain cyclomatic complexity below 10
- Pass ESLint without warnings
- Use meaningful variable and function names

## Article II: Testing Standards

- Minimum 80% code coverage for new features
- All functional requirements must have corresponding Playwright tests
- Tests written BEFORE implementation (TDD)
- Integration tests for all API endpoints
- Contract tests for external dependencies

## Article III: User Experience

- All interactive elements respond within 100ms
- Form validation provides immediate feedback
- Error messages are actionable and user-friendly
- Support keyboard navigation for all features
- Mobile-responsive design (viewport 320px+)

## Article IV: Performance Requirements

- API endpoints respond within 500ms (p95)
- Page load under 2 seconds on 3G networks
- Database queries optimized (< 100ms typical)
- Static assets use CDN caching
- Lazy loading for non-critical resources

## Article V: Security Principles

- All authentication uses bcrypt/argon2 for password hashing
- JWTs expire within 1 hour, with refresh token rotation
- CSRF protection on all state-changing operations
- Input validation on all user-supplied data
- Secrets never committed to version control

## Article VI: Accessibility

- WCAG 2.1 Level AA compliance minimum
- Semantic HTML for all interactive elements
- ARIA labels where semantic HTML insufficient
- Keyboard navigation for all features
- Screen reader tested on NVDA and VoiceOver

## Article VII: Architecture Principles

- Separation of concerns (presentation, business logic, data)
- Dependency injection for testability
- Single Responsibility Principle for all modules
- API-first design with OpenAPI documentation
- Stateless backend services

## Article VIII: Documentation

- README with quick start guide
- API documentation auto-generated from code
- Inline comments for complex algorithms only
- Architecture Decision Records (ADRs) for major decisions
- Runnable examples in documentation

## Article IX: Governance

- Constitution supersedes all other practices
- All PRs must validate against constitutional principles
- Deviations require explicit justification and approval
- Regular review and update of principles (quarterly)
```

### Step 4: Create Templates

Create `.specify/templates/spec-template.md`:

```markdown
---
feature: "[###-feature-name]"
status: "draft"
created: "[YYYY-MM-DD]"
updated: "[YYYY-MM-DD]"
author: "[author-name]"
---

# Feature Overview

[High-level description focusing on user value and business context]

## User Stories

- As a [user type], I want to [action] so that [benefit]
- As a [user type], I want to [action] so that [benefit]

## Functional Requirements

1. **FR-001**: [Testable requirement]
2. **FR-002**: [Testable requirement]

## Success Criteria

- [Measurable outcome 1]
- [Measurable outcome 2]

## Key Entities

- **EntityName**: field1, field2, field3
- **EntityName**: field1, field2, field3

## Assumptions

- [Assumption 1]
- [Assumption 2]

## Clarifications

### Question 1: [Topic]
**Q:** [Clarifying question]
**A:** [Answer]
**Impact:** [How this affects the spec]
```

### Step 5: Update Orchestrator Logic

**Changes needed in `src/orchestrator/SpecLoader.ts`:**

1. **Load from new structure:**
```typescript
// OLD: Load from .specify/*.json
const files = await fs.readdir(specDir);
const specFiles = files.filter(f => f.endsWith('.json'));

// NEW: Load from .specify/specs/###-feature-name/spec.md
const specsDir = path.join(specDir, 'specs');
const featureDirs = await fs.readdir(specsDir);

for (const dir of featureDirs) {
  const specPath = path.join(specsDir, dir, 'spec.md');
  const spec = await this.parseMarkdownSpec(specPath);
  specs.push(spec);
}
```

2. **Parse Markdown with YAML frontmatter:**
```typescript
async parseMarkdownSpec(filePath: string): Promise<Spec> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const yaml = frontmatterMatch ? frontmatterMatch[1] : '';
  const markdown = content.slice(frontmatterMatch[0].length);

  // Parse YAML
  const metadata = parseYAML(yaml);

  // Extract sections from Markdown
  const sections = this.extractMarkdownSections(markdown);

  return {
    id: metadata.feature,
    title: sections['Feature Overview'],
    status: metadata.status,
    userStories: sections['User Stories'],
    functionalRequirements: sections['Functional Requirements'],
    successCriteria: sections['Success Criteria'],
    entities: sections['Key Entities'],
    assumptions: sections['Assumptions'],
    clarifications: sections['Clarifications']
  };
}
```

3. **Load tasks from tasks/tasks.md:**
```typescript
async loadTasks(featureDir: string): Promise<Task[]> {
  const tasksPath = path.join(featureDir, 'tasks', 'tasks.md');
  const content = await fs.readFile(tasksPath, 'utf-8');

  // Parse task markdown
  // Format: ## T001: [P] Task description
  const taskRegex = /## (T\d{3}):\s*(\[P\])?\s*(.+)/g;
  const tasks: Task[] = [];

  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    tasks.push({
      id: match[1],
      parallel: !!match[2],
      description: match[3],
      status: 'pending'
    });
  }

  return tasks;
}
```

### Step 6: Update Extension Detection

**Changes in `extension/src/extension.ts`:**

```typescript
// OLD: Check for .specify folder
const specDir = path.join(workspacePath, '.specify');
if (!fs.existsSync(specDir)) {
  return;
}

// NEW: Check for Spec Kit structure
const specDir = path.join(workspacePath, '.specify');
const specsDir = path.join(specDir, 'specs');
const constitutionPath = path.join(specDir, 'memory', 'constitution.md');

if (!fs.existsSync(specsDir)) {
  // Offer to initialize Spec Kit structure
  const choice = await vscode.window.showWarningMessage(
    '.specify folder found but not in Spec Kit format. Initialize?',
    'Yes', 'No'
  );

  if (choice === 'Yes') {
    await initializeSpecKit(workspacePath);
  }
}
```

### Step 7: Add Constitutional Validation

Create `src/orchestrator/ConstitutionValidator.ts`:

```typescript
export class ConstitutionValidator {
  private constitution: Constitution;

  async loadConstitution(constitutionPath: string): Promise<void> {
    const content = await fs.readFile(constitutionPath, 'utf-8');
    this.constitution = this.parseConstitution(content);
  }

  async validatePlan(plan: TechnicalPlan): Promise<ValidationResult> {
    const violations: string[] = [];

    // Check against each article
    for (const article of this.constitution.articles) {
      const result = await this.validateAgainstArticle(plan, article);
      if (!result.valid) {
        violations.push(...result.violations);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      severity: violations.some(v => v.includes('CRITICAL')) ? 'critical' : 'warning'
    };
  }

  async validateImplementation(code: string, article: Article): Promise<number> {
    // RLHF scoring: -2 to +2
    // Use Claude to analyze code against constitutional principles
    const prompt = `
Rate this implementation against the following constitutional principle:

${article.content}

Implementation:
${code}

Score from -2 to +2:
-2: Architecture violations (blocks progress)
-1: Needs rework
 0: Acceptable but not optimal
+1: Good implementation, minor improvements
+2: Perfect implementation

Provide score and justification.
`;

    const response = await this.claudeClient.analyze(prompt);
    return response.score;
  }
}
```

### Step 8: Add Plan Generation

Create `src/orchestrator/PlanGenerator.ts`:

```typescript
export class PlanGenerator {
  async generatePlan(spec: Spec, userPrompt: string): Promise<TechnicalPlan> {
    const prompt = `
Based on this specification and user requirements, create a technical plan.

Specification:
${this.formatSpec(spec)}

User Requirements:
${userPrompt}

Generate:
1. plan.md - Architecture, tech stack, dependencies
2. data-model.md - Entities, relationships, TypeScript interfaces
3. contracts/ - API contracts, data flow diagrams
4. quickstart.md - Setup steps, validation

Follow Spec Kit format.
`;

    const response = await this.claudeClient.plan(prompt);

    // Parse response and create files
    await this.writePlanFiles(spec.featureDir, response);

    return response.plan;
  }
}
```

### Step 9: Update Progress Tracking

**Changes in `extension/src/progressProvider.ts`:**

```typescript
// OLD: Read status from JSON
task.status = spec.tasks[i].status;

// NEW: Read status from YAML frontmatter + task markdown
const specPath = path.join(featureDir, 'spec.md');
const content = await fs.readFile(specPath, 'utf-8');
const metadata = parseYAMLFrontmatter(content);

const tasksPath = path.join(featureDir, 'tasks', 'tasks.md');
const tasksContent = await fs.readFile(tasksPath, 'utf-8');
const tasks = this.parseTasksMarkdown(tasksContent);

// Update UI with checkboxes
task.status = tasks[i].checked ? 'completed' : 'pending';
```

### Step 10: Add AGENTS.md Support

Create `AGENTS.md` in workspace root:

```markdown
# AI Agent Instructions

This project uses Spec-Driven Development with GitHub Spec Kit.

## Workflow

1. **/speckit.constitution** - View project principles
2. **/speckit.specify** - Create feature specification
3. **/speckit.clarify** - Ask clarifying questions
4. **/speckit.plan** - Generate technical plan
5. **/speckit.tasks** - Break down into tasks
6. **/speckit.implement** - Execute implementation
7. **/speckit.analyze** - Validate all artifacts

## Constitution

Read `.specify/memory/constitution.md` for non-negotiable principles.

## Current Context

- Tech Stack: [List from plan.md]
- Active Features: [List from .specify/specs/]
- Testing: Playwright for E2E, Jest for unit tests
```

## Migration Checklist

- [ ] Create new .specify folder structure
- [ ] Write constitution.md
- [ ] Create templates (spec, plan, tasks)
- [ ] Convert existing JSON specs to Markdown
- [ ] Update SpecLoader to parse Markdown + YAML
- [ ] Implement ConstitutionValidator
- [ ] Add PlanGenerator component
- [ ] Update extension to detect new structure
- [ ] Add AGENTS.md to workspace
- [ ] Update progress tracking to use YAML frontmatter
- [ ] Add TDD task ordering to task generation
- [ ] Implement [P] marker support for parallel tasks
- [ ] Add quality gate validation
- [ ] Update documentation

## Backward Compatibility

To support both formats during migration:

```typescript
async loadAllSpecs(): Promise<Spec[]> {
  const specs: Spec[] = [];

  // Try new format first
  const specsDir = path.join(this.specDir, 'specs');
  if (fs.existsSync(specsDir)) {
    specs.push(...await this.loadMarkdownSpecs(specsDir));
  }

  // Fallback to old format
  const jsonSpecs = await this.loadJSONSpecs(this.specDir);
  specs.push(...jsonSpecs);

  return specs;
}
```

## Benefits of Migration

1. **Industry Standard** - Aligns with GitHub's open-source toolkit
2. **Better Documentation** - Markdown is human-readable
3. **Quality Gates** - Constitutional validation ensures consistency
4. **Comprehensive Planning** - Technical plans, data models, contracts
5. **TDD Workflow** - Tests before implementation
6. **Community Support** - Leverage Spec Kit ecosystem

## Timeline

- **Phase 1** (Week 1): Structure migration, template creation
- **Phase 2** (Week 2): Orchestrator updates, parser implementation
- **Phase 3** (Week 3): Extension updates, validation
- **Phase 4** (Week 4): Testing, documentation, rollout
