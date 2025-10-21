# Option B: LSP + MCP Integration Architecture

**Status:** In Development
**Estimated Timeline:** 3-6 months
**Complexity:** High
**Automation Level:** Full (90%+ automated)
**Quality Mode:** HIGH-QUALITY (LLM-enhanced validation)

---

## Executive Summary

This architecture enables **true bidirectional communication** between SpecGofer and Claude Code through standardized protocols:

- **Language Server Protocol (LSP)** - Communication between VSCode extension and SpecGofer Language Server
- **Model Context Protocol (MCP)** - Communication between Language Server and Claude Code

This is the ONLY viable architecture for achieving the stated goal: "Fully automated spec-driven development orchestrator that works with Claude Code."

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VSCode Extension                          │
│                           (SpecGofer Client)                        │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Progress UI  │  │ Spec Parser  │  │ Validator    │             │
│  │ (Tree View)  │  │ (Markdown)   │  │ (Constitution)│            │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                           │                                         │
│                           ▼                                         │
│                  ┌─────────────────┐                                │
│                  │  LSP Client     │                                │
│                  └─────────────────┘                                │
└───────────────────────────│─────────────────────────────────────────┘
                            │ JSON-RPC over stdio/IPC
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    SpecGofer Language Server                        │
│                    (Separate Node.js Process)                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              Task Orchestrator                       │          │
│  │  • Queue management                                  │          │
│  │  • Dependency resolution                             │          │
│  │  • Retry logic (3 attempts)                          │          │
│  │  • State persistence                                 │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │         Constitutional Validator                     │          │
│  │  • Parse constitution.md                             │          │
│  │  • Static analysis (ESLint, TypeScript)              │          │
│  │  • Test coverage validation                          │          │
│  │  • RLHF scoring (-2 to +2)                           │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              Test Runner                             │          │
│  │  • Detect test framework (Playwright, Jest, pytest)  │          │
│  │  • Execute tests                                     │          │
│  │  • Parse results                                     │          │
│  │  • Report to orchestrator                            │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
│                            ▼                                        │
│                  ┌─────────────────┐                                │
│                  │  MCP Client     │                                │
│                  └─────────────────┘                                │
└───────────────────────────│─────────────────────────────────────────┘
                            │ MCP Protocol (JSON-RPC over stdio)
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                    Claude MCP Server                                │
│                    (Anthropic-provided or custom)                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              Claude Code Integration                 │          │
│  │  • Receives task requests                            │          │
│  │  • Formats prompts with context                      │          │
│  │  • Sends to Claude API                               │          │
│  │  • Provides VSCode tool access                       │          │
│  │  • Returns results when complete                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                            │                                        │
│                            ▼                                        │
│                  Claude API (Sonnet 4.5)                            │
│                  with VSCode tools:                                 │
│                  • Read/Write files                                 │
│                  • Execute bash commands                            │
│                  • Git operations                                   │
│                  • Grep/search                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. VSCode Extension (SpecGofer Client)

**Language:** TypeScript
**Framework:** VSCode Extension API + `vscode-languageclient`
**Responsibilities:**
- UI rendering (tree views, progress panels)
- User command handling
- Spec Kit file parsing (Markdown + YAML frontmatter)
- LSP client initialization
- Configuration management

**Key Files:**
```
extension/src/
├── extension.ts              # Main activation, LSP client setup
├── specKitParser.ts          # NEW: Parse spec.md, tasks.md, plan.md
├── progressProvider.ts       # UPDATED: Display tasks from Markdown
├── constitutionProvider.ts   # NEW: Display constitution articles
├── validators/
│   └── clientValidator.ts    # NEW: Client-side validation (quick checks)
└── ui/
    ├── specCreatorWizard.ts  # NEW: Interactive spec creation
    └── taskDetailPanel.ts    # NEW: Webview for task details
```

**Dependencies:**
```json
{
  "vscode-languageclient": "^9.0.1",
  "yaml": "^2.3.4",
  "gray-matter": "^4.0.3"
}
```

---

### 2. SpecGofer Language Server

**Language:** TypeScript/Node.js
**Framework:** `vscode-languageserver`
**Responsibilities:**
- Task orchestration and queue management
- Constitutional validation (full validation suite)
- Test execution and result parsing
- State persistence (checkpointing)
- MCP client management
- Retry logic and escalation

**Key Files:**
```
language-server/src/
├── server.ts                 # LSP server entry point
├── orchestrator/
│   ├── taskQueue.ts          # Task queue with dependency resolution
│   ├── taskOrchestrator.ts   # Main orchestration logic
│   ├── retryHandler.ts       # 3-attempt retry with backoff
│   └── stateManager.ts       # Checkpoint/restore state
├── validation/
│   ├── constitutionalValidator.ts    # Full validator implementation
│   ├── articleValidators/
│   │   ├── codeQuality.ts           # Article I validation
│   │   ├── testingStandards.ts      # Article II validation
│   │   ├── userExperience.ts        # Article III validation
│   │   ├── securityPrinciples.ts    # Article IV validation
│   │   ├── performance.ts           # Article V validation
│   │   └── ...                      # Articles VI-IX
│   └── rlhfScorer.ts                # RLHF scoring algorithm
├── testing/
│   ├── testRunner.ts                # Framework-agnostic test runner
│   ├── frameworks/
│   │   ├── playwrightRunner.ts
│   │   ├── jestRunner.ts
│   │   └── pytestRunner.ts
│   └── coverageAnalyzer.ts          # Coverage parsing
├── mcp/
│   ├── mcpClient.ts                 # MCP protocol client
│   └── claudeCodeAdapter.ts         # Claude Code-specific logic
└── utils/
    ├── specKitLoader.ts             # Load specs from .specify/
    ├── constitutionParser.ts        # Parse constitution.md
    └── escalationService.ts         # SMS via Twilio/SNS
```

**Dependencies:**
```json
{
  "vscode-languageserver": "^9.0.1",
  "eslint": "^8.56.0",
  "@typescript-eslint/parser": "^6.15.0",
  "complexity-report": "^2.0.0",
  "c8": "^8.0.1",
  "yaml": "^2.3.4",
  "gray-matter": "^4.0.3",
  "twilio": "^4.20.0",
  "@anthropic-ai/sdk": "^0.30.0"
}
```

---

### 3. Claude MCP Server

**Options:**

#### Option A: Use Anthropic's Official MCP Server (When Available)
- **Status:** MCP is in beta, Claude Code integration coming soon
- **Pros:** Official support, maintained by Anthropic, automatic updates
- **Cons:** May not be available yet, limited customization

#### Option B: Build Custom MCP Server
- **Language:** TypeScript/Node.js or Python
- **Framework:** `@modelcontextprotocol/sdk` (official MCP SDK)
- **Responsibilities:**
  - Receive task requests from Language Server
  - Format prompts with spec context
  - Call Claude API with VSCode tools
  - Monitor task completion
  - Return structured results

**Custom MCP Server Files:**
```
mcp-server/src/
├── server.ts                 # MCP server entry point
├── claudeClient.ts           # Anthropic API client
├── tools/
│   ├── vscodeTools.ts        # VSCode tool definitions
│   ├── fileTools.ts          # Read/write/edit files
│   ├── bashTools.ts          # Execute commands
│   └── gitTools.ts           # Git operations
├── promptFormatter.ts        # Format task → Claude prompt
└── completionDetector.ts     # Detect when Claude finishes
```

**Dependencies:**
```json
{
  "@modelcontextprotocol/sdk": "^0.1.0",
  "@anthropic-ai/sdk": "^0.30.0"
}
```

---

## Protocol Specifications

### LSP Communication (Extension ↔ Language Server)

**Transport:** JSON-RPC over IPC (Node.js child process)

**Custom LSP Methods:**

#### 1. `specKit/getSpecs` (Request)
```typescript
interface GetSpecsRequest {
  workspaceRoot: string;
}

interface GetSpecsResponse {
  specs: Spec[];
}

interface Spec {
  id: string;                    // "001-login-feature"
  title: string;
  status: 'draft' | 'ready' | 'in_progress' | 'completed';
  tasks: Task[];
  dependencies: string[];        // IDs of dependent specs
}

interface Task {
  id: string;                    // "T001"
  description: string;
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed';
  attempts: number;
  dependencies: string[];        // Task IDs
  parallel: boolean;             // Can run in parallel?
}
```

#### 2. `specKit/executeTask` (Request)
```typescript
interface ExecuteTaskRequest {
  specId: string;
  taskId: string;
  context: TaskContext;
}

interface TaskContext {
  specContent: string;           // Full spec.md content
  planContent: string;           // Full plan.md content
  constitutionContent: string;   // Full constitution.md
  relatedFiles: string[];        // Paths to related code files
}

interface ExecuteTaskResponse {
  success: boolean;
  testResults?: TestResults;
  validationResults?: ValidationResults;
  error?: string;
}
```

#### 3. `specKit/validateCode` (Request)
```typescript
interface ValidateCodeRequest {
  files: string[];               // Paths to validate
  constitutionPath: string;
}

interface ValidationResults {
  overall: 'pass' | 'fail';
  score: number;                 // RLHF score: -2 to +2
  violations: Violation[];
}

interface Violation {
  article: string;               // "Article I: Code Quality"
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  file?: string;
  line?: number;
  suggestedFix?: string;
}
```

#### 4. `specKit/taskProgress` (Notification)
```typescript
interface TaskProgressNotification {
  specId: string;
  taskId: string;
  status: TaskStatus;
  message: string;
  timestamp: string;
}
```

---

### MCP Communication (Language Server ↔ Claude)

**Transport:** JSON-RPC over stdio

**Custom MCP Methods:**

#### 1. `claude/executeTask` (Request)
```typescript
interface ClaudeExecuteTaskRequest {
  task: {
    id: string;
    description: string;
    context: string;             // Formatted prompt with spec context
  };
  tools: Tool[];                 // VSCode tools available
  workspaceRoot: string;
}

interface ClaudeExecuteTaskResponse {
  completed: boolean;
  filesModified: string[];
  filesCreated: string[];
  commandsExecuted: string[];
  output: string;
  error?: string;
}
```

#### 2. `claude/getToolDefinitions` (Request)
Returns VSCode tool definitions that Claude can use:

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// Example tools:
const tools: Tool[] = [
  {
    name: 'read_file',
    description: 'Read a file from the workspace',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute path to file' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['file_path', 'content']
    }
  },
  {
    name: 'run_tests',
    description: 'Execute test suite',
    parameters: {
      type: 'object',
      properties: {
        test_path: { type: 'string', description: 'Path to test file/directory' }
      },
      required: []
    }
  }
];
```

---

## Workflow: End-to-End Task Execution

### Step-by-Step Flow

1. **User Action:** User clicks "Run Task T001" in VSCode tree view

2. **Extension → Language Server (LSP)**
   ```json
   {
     "method": "specKit/executeTask",
     "params": {
       "specId": "001-login-feature",
       "taskId": "T001",
       "context": {
         "specContent": "# Login Feature\n...",
         "planContent": "# Technical Plan\n...",
         "constitutionContent": "# Constitution\n...",
         "relatedFiles": ["src/auth/login.ts"]
       }
     }
   }
   ```

3. **Language Server Processing:**
   ```typescript
   async executeTask(request: ExecuteTaskRequest): Promise<ExecuteTaskResponse> {
     // Step 3a: Load task from spec
     const task = await this.specKitLoader.loadTask(request.specId, request.taskId);

     // Step 3b: Check dependencies
     if (!await this.orchestrator.areDependenciesMet(task)) {
       return { success: false, error: 'Dependencies not met' };
     }

     // Step 3c: Format prompt with context
     const prompt = this.promptFormatter.format(task, request.context);

     // Step 3d: Send to MCP
     const claudeResult = await this.mcpClient.executeTask({
       task: { id: task.id, description: task.description, context: prompt },
       tools: this.getVSCodeTools(),
       workspaceRoot: request.context.workspaceRoot
     });

     // Step 3e: Run tests
     const testResults = await this.testRunner.runTests();

     // Step 3f: Validate against constitution
     const validationResults = await this.validator.validate(
       claudeResult.filesModified,
       request.context.constitutionContent
     );

     // Step 3g: Handle results
     if (testResults.passed && validationResults.overall === 'pass') {
       await this.orchestrator.markTaskComplete(task.id);
       return { success: true, testResults, validationResults };
     } else {
       // Retry logic
       if (task.attempts < 3) {
         await this.retryHandler.scheduleRetry(task, testResults, validationResults);
         return { success: false, testResults, validationResults };
       } else {
         // Escalate to human
         await this.escalationService.sendSMS(
           `Task ${task.id} failed after 3 attempts. Manual intervention required.`
         );
         return { success: false, error: 'Max retries exceeded' };
       }
     }
   }
   ```

4. **Language Server → MCP Server**
   ```json
   {
     "method": "claude/executeTask",
     "params": {
       "task": {
         "id": "T001",
         "description": "Create login form component",
         "context": "# Context\nSpec: ...\nPlan: ...\nConstitution: ..."
       },
       "tools": [...vscodeTools],
       "workspaceRoot": "/Users/user/project"
     }
   }
   ```

5. **MCP Server → Claude API**
   ```typescript
   const response = await anthropic.messages.create({
     model: 'claude-sonnet-4-20250514',
     messages: [
       {
         role: 'user',
         content: `You are implementing: ${task.description}\n\n${task.context}`
       }
     ],
     tools: tools,
     max_tokens: 8000
   });

   // Handle tool calls
   while (response.stop_reason === 'tool_use') {
     const toolResults = await executeTools(response.content);
     response = await continueConversation(toolResults);
   }
   ```

6. **MCP Server → Language Server (Result)**
   ```json
   {
     "completed": true,
     "filesModified": ["src/components/LoginForm.tsx"],
     "filesCreated": ["tests/LoginForm.test.tsx"],
     "commandsExecuted": ["npm run test"],
     "output": "Created LoginForm component with email/password inputs..."
   }
   ```

7. **Language Server → Extension (Progress Update)**
   ```json
   {
     "method": "specKit/taskProgress",
     "params": {
       "specId": "001-login-feature",
       "taskId": "T001",
       "status": "testing",
       "message": "Running tests...",
       "timestamp": "2025-10-20T13:30:00Z"
     }
   }
   ```

8. **Language Server → Extension (Final Result)**
   ```json
   {
     "success": true,
     "testResults": {
       "passed": 15,
       "failed": 0,
       "coverage": 92.5
     },
     "validationResults": {
       "overall": "pass",
       "score": 1.5,
       "violations": []
     }
   }
   ```

9. **Extension Updates UI:**
   - Task T001 marked with ✅
   - Progress bar updated
   - Next task T002 starts automatically

---

## Implementation Priorities

### Priority 1: Core Infrastructure (Weeks 1-3)

**Goal:** Get LSP + MCP communication working end-to-end

#### Week 1: LSP Setup
- [ ] Create `language-server/` directory structure
- [ ] Implement basic LSP server (server.ts)
- [ ] Update extension to use LSP client instead of direct orchestration
- [ ] Implement `specKit/getSpecs` method
- [ ] Test: Extension can request and display specs via LSP

#### Week 2: MCP Setup
- [ ] Research MCP SDK and available examples
- [ ] Create `mcp-server/` directory structure
- [ ] Implement basic MCP server
- [ ] Implement `claude/executeTask` method (simplified)
- [ ] Test: Language Server can send task to MCP → Claude

#### Week 3: End-to-End Integration
- [ ] Connect all pieces: Extension → LSP → MCP → Claude
- [ ] Implement `specKit/executeTask` (basic version, no validation yet)
- [ ] Test: User can trigger task execution from UI, see Claude response
- [ ] Add progress notifications

---

### Priority 2: Spec Kit Parser (Week 4)

**Goal:** Read and parse Spec Kit Markdown format

- [ ] Create `specKitParser.ts` with YAML frontmatter parsing
- [ ] Parse `spec.md` files
- [ ] Parse `tasks.md` files (Markdown checkboxes → Task objects)
- [ ] Parse `plan.md` files
- [ ] Update `progressProvider.ts` to use new parser
- [ ] Test: Extension correctly displays tasks from Markdown specs

**Example Task Parsing:**
```markdown
### Tasks

- [ ] **T001**: Create login form component
  - Dependencies: None
  - Estimated: 2 hours
  - [P] Can run in parallel

- [ ] **T002**: Add form validation
  - Dependencies: T001
  - Estimated: 1 hour

- [x] **T003**: Style login form
  - Dependencies: T001
  - Estimated: 1 hour
```

Parse to:
```typescript
const tasks: Task[] = [
  {
    id: 'T001',
    description: 'Create login form component',
    status: 'pending',
    dependencies: [],
    parallel: true,
    attempts: 0
  },
  {
    id: 'T002',
    description: 'Add form validation',
    status: 'pending',
    dependencies: ['T001'],
    parallel: false,
    attempts: 0
  },
  {
    id: 'T003',
    description: 'Style login form',
    status: 'completed',
    dependencies: ['T001'],
    parallel: false,
    attempts: 0
  }
];
```

---

### Priority 3: Constitutional Validator (Weeks 5-8)

**Goal:** Implement full validation against all 9 articles

#### Week 5-6: Article I & II (Code Quality + Testing)
- [ ] Create `constitutionalValidator.ts` base class
- [ ] Implement Article I validator (code quality):
  - [ ] ESLint integration (zero warnings)
  - [ ] Cyclomatic complexity check (< 10)
  - [ ] TypeScript strict mode validation
  - [ ] File size check (< 300 lines)
- [ ] Implement Article II validator (testing standards):
  - [ ] Coverage analysis (80% minimum)
  - [ ] TDD enforcement (check Git history for test-first commits)
  - [ ] Test file existence check
- [ ] Test: Validator catches quality violations

#### Week 7: Articles III-V (UX, Security, Performance)
- [ ] Article III: UX validation
  - [ ] WCAG 2.1 AA compliance (integrate axe-core)
  - [ ] Color contrast validation
  - [ ] Keyboard navigation check
- [ ] Article IV: Security validation
  - [ ] SQL injection pattern detection
  - [ ] XSS prevention validation
  - [ ] Input validation checks
  - [ ] npm audit integration
- [ ] Article V: Performance validation
  - [ ] API response time checks (< 500ms)
  - [ ] Bundle size validation
  - [ ] Lighthouse CI integration

#### Week 8: Articles VI-IX + RLHF Scoring
- [ ] Article VI: Architecture (code review style checks)
- [ ] Article VII: Development workflow (Git commit message validation)
- [ ] Article VIII: Deployment (CI/CD checks)
- [ ] Article IX: Governance (constitution versioning)
- [ ] Implement RLHF scoring algorithm (-2 to +2)
- [ ] Test: Full constitutional validation works end-to-end

---

### Priority 4: Test Runner Integration (Week 9-10)

**Goal:** Auto-detect and run tests, parse results

- [ ] Create `testRunner.ts` with framework detection
- [ ] Implement Playwright runner
- [ ] Implement Jest runner
- [ ] Implement pytest runner (for Python projects)
- [ ] Implement coverage analyzer
- [ ] Test: Runner auto-detects framework and executes tests
- [ ] Integrate test results into validation pipeline

---

### Priority 5: Retry Logic & Escalation (Week 11-12)

**Goal:** Handle failures gracefully with retry and human escalation

- [ ] Create `retryHandler.ts` with exponential backoff
- [ ] Track attempt count per task
- [ ] Format retry prompts with previous failure context
- [ ] Implement SMS escalation service (Twilio)
- [ ] Add escalation configuration to settings
- [ ] Test: Task fails 3 times → SMS sent → orchestration pauses

---

### Priority 6: State Management (Week 13-14)

**Goal:** Persist orchestration state across VSCode restarts

- [ ] Create `stateManager.ts` with checkpoint/restore
- [ ] Save task queue state to `.specify/.state.json`
- [ ] Save conversation history
- [ ] Save validation results cache
- [ ] Implement restore on Language Server startup
- [ ] Test: Close VSCode mid-task → reopen → orchestration resumes

---

### Priority 7: UI Enhancements (Week 15-16)

**Goal:** Rich user interface for monitoring and control

- [ ] Create spec creation wizard (`specCreatorWizard.ts`)
- [ ] Create task detail webview panel
- [ ] Add constitution article tree view
- [ ] Add validation results panel
- [ ] Add test results panel
- [ ] Implement command: "Pause Orchestration"
- [ ] Implement command: "Resume Orchestration"
- [ ] Implement command: "Skip Task"

---

## Configuration

### VSCode Settings (HIGH-QUALITY Mode)

```json
{
  "specGofer.lsp.enabled": true,
  "specGofer.lsp.serverPath": "${workspaceFolder}/language-server/dist/server.js",
  "specGofer.mcp.enabled": true,
  "specGofer.mcp.serverPath": "${workspaceFolder}/mcp-server/dist/server.js",
  "specGofer.mcp.useOfficial": false,

  // VALIDATION SETTINGS (High-Quality LLM-Enhanced)
  "specGofer.validation.enabled": true,
  "specGofer.validation.strictMode": true,
  "specGofer.validation.useLLM": true,
  "specGofer.validation.llmModel": "claude-sonnet-4-20250514",
  "specGofer.validation.llmOnlyForCritical": false,

  // IMPLEMENTATION SETTINGS
  "specGofer.implementation.model": "claude-sonnet-4-20250514",
  "specGofer.implementation.maxTokens": 8000,
  "specGofer.implementation.temperature": 0.7,

  // REVIEW SETTINGS (Use best model for quality)
  "specGofer.review.model": "claude-sonnet-4-20250514",
  "specGofer.review.enabled": true,
  "specGofer.review.deepAnalysis": true,

  // RETRY SETTINGS (LLM-enhanced failure analysis)
  "specGofer.retry.maxAttempts": 3,
  "specGofer.retry.backoffMultiplier": 2,
  "specGofer.retry.useLLMAnalysis": true,
  "specGofer.retry.llmModel": "claude-sonnet-4-20250514",

  // ESCALATION SETTINGS
  "specGofer.escalation.smsEnabled": true,
  "specGofer.escalation.twilioAccountSid": "",
  "specGofer.escalation.twilioAuthToken": "",
  "specGofer.escalation.phoneNumber": ""
}
```

### Cost Estimates (High-Quality Mode)

**Per-Task Costs:**
- Implementation: $0.50 - $3.00 (Claude Sonnet 4.5)
- Validation (LLM-enhanced): $0.30 - $1.00
- Test Failure Analysis: $0.20 - $0.50
- Retry Analysis: $0.20 - $0.50

**Per-Feature Costs (assuming 20 tasks):**
- Small feature: $20 - $100
- Medium feature (50 tasks): $50 - $250
- Large feature (200 tasks): $200 - $1,000

**Monthly Costs (active development):**
- Startup/rapid development: $500 - $2,000/month
- Steady state: $100 - $500/month
- Maintenance: $50 - $200/month

**Quality Benefits:**
- 95%+ code quality adherence vs 70% with rule-based
- 90%+ constitutional compliance vs 60% with static analysis only
- Fewer retry cycles due to better initial implementation
- Superior architectural decisions
- Better test coverage and quality

---

## Testing Strategy

### Unit Tests
- Language Server components (validators, parsers, runners)
- MCP Server (tool execution, prompt formatting)
- Extension components (UI providers, parsers)

### Integration Tests
- LSP communication (Extension ↔ Language Server)
- MCP communication (Language Server ↔ MCP Server)
- End-to-end task execution (mock Claude API)

### E2E Tests
- Full workflow with real Claude API (test mode)
- Retry logic (simulate failures)
- Validation enforcement (create violating code)
- UI interactions (click tasks, view results)

---

## Deployment

### Development Mode
```bash
# Terminal 1: Language Server
cd language-server
npm run watch

# Terminal 2: MCP Server
cd mcp-server
npm run watch

# Terminal 3: VSCode Extension
cd extension
npm run watch
# Press F5 to launch Extension Development Host
```

### Production Build
```bash
# Build Language Server
cd language-server
npm run build

# Build MCP Server
cd mcp-server
npm run build

# Package Extension
cd extension
npm run package
vsce package
```

### Distribution
- VSIX package includes:
  - Extension code (`dist/extension.js`)
  - Language Server (`language-server/dist/`)
  - MCP Server (`mcp-server/dist/`)
- Auto-updater checks for new releases
- Seamless update with state preservation

---

## Success Metrics

### Automation Level
- **Target:** 90%+ of tasks completed without human intervention
- **Measurement:** Track tasks completed automatically vs. escalated

### Quality Score
- **Target:** Average RLHF score > 1.0 (Good implementation)
- **Measurement:** Track validation scores per task

### Test Coverage
- **Target:** 80%+ coverage for all implemented features
- **Measurement:** Coverage reports from c8/nyc

### User Satisfaction
- **Target:** Developers trust the system enough to run unattended
- **Measurement:** Usage analytics, escalation frequency

---

## Risk Mitigation

### Risk 1: MCP Not Available Yet
**Mitigation:** Build custom MCP server first, swap to official when available

### Risk 2: Claude API Changes
**Mitigation:** Abstract API calls behind interface, easy to update

### Risk 3: Constitutional Validation Too Strict
**Mitigation:** Make validation configurable, allow overrides

### Risk 4: Performance (LSP + MCP overhead)
**Mitigation:** Use efficient IPC, cache validation results, parallel execution

### Risk 5: Complexity Too High for Users
**Mitigation:** Provide sane defaults, automatic setup, clear documentation

---

## Next Steps

1. **Week 1 Task:** Set up Language Server with basic LSP communication
2. **Week 2 Task:** Research MCP SDK and create basic MCP server
3. **Week 3 Task:** Connect Extension → LSP → MCP → Claude (hello world)
4. **Week 4 Task:** Implement Spec Kit Markdown parser

Let's begin! 🚀
