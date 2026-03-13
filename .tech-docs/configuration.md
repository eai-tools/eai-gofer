---
generated: '2026-03-11T22:14:00Z'
source_commit: '29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c'
---

# Configuration

## Environment Variables

### Required

None - Gofer works out of the box without environment variables.

### Optional (Autonomous Mode)

| Variable              | Purpose                            | Default | Required |
| --------------------- | ---------------------------------- | ------- | -------- |
| `ANTHROPIC_API_KEY`   | Claude API access for orchestrator | -       | No       |
| `GOOGLE_API_KEY`      | Gemini API for LLM council         | -       | No       |
| `OPENAI_API_KEY`      | GPT API for LLM council            | -       | No       |
| `TWILIO_ACCOUNT_SID`  | WhatsApp notifications             | -       | No       |
| `TWILIO_AUTH_TOKEN`   | WhatsApp notifications             | -       | No       |
| `TWILIO_PHONE_NUMBER` | WhatsApp sender                    | -       | No       |

**Note:** These can be set via `.env` file in project root or VSCode settings
(preferred).

### Example `.env`

```bash
# Optional: For autonomous mode
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-proj-...

# Optional: For WhatsApp notifications
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

---

## VSCode Settings

Configure via `Cmd/Ctrl+,` or `.vscode/settings.json`

### API Keys

**Anthropic API Key**

```json
{
  "gofer.anthropicApiKey": "sk-ant-api03-..."
}
```

- **Description:** Your Anthropic API key for Claude
- **Usage:** Orchestrator, autonomous mode, LLM council
- **Get Key:** https://console.anthropic.com/settings/keys
- **Storage:** Securely stored in VSCode settings

**Google AI API Key**

```json
{
  "gofer.googleApiKey": "AIza..."
}
```

- **Description:** Your Google AI API key for Gemini
- **Usage:** LLM council (optional)
- **Get Key:** https://aistudio.google.com/apikey

**OpenAI API Key**

```json
{
  "gofer.openaiApiKey": "sk-proj-..."
}
```

- **Description:** Your OpenAI API key for GPT models
- **Usage:** LLM council (optional)
- **Get Key:** https://platform.openai.com/api-keys

---

### Autonomous Mode

**Enable Autonomous Mode**

```json
{
  "gofer.autonomousMode": true
}
```

- **Default:** `true`
- **Description:** Automatically answer Claude Code questions using Haiku
- **Requires:** `gofer.anthropicApiKey`

**Preferred AI Tool**

```json
{
  "gofer.preferredAI": "claude"
}
```

- **Options:** `"claude"`, `"copilot"`, `"ask"`
- **Default:** `"ask"`
- **Description:** Which AI to use when sending tasks

**Claude Code Launch Mode**

```json
{
  "gofer.claudeCodeMode": "standard"
}
```

- **Options:** `"standard"`, `"yolo"`, `"custom"`
- **Default:** `"standard"`
- **Description:**
  - `standard` - Asks for permission before tools
  - `yolo` - `--dangerously-skip-permissions`
  - `custom` - Uses `gofer.claudeCodeCommand`

**Custom Claude Command**

```json
{
  "gofer.claudeCodeCommand": "claude"
}
```

- **Default:** `"claude"`
- **Description:** Custom command when mode is `"custom"`
- **Examples:** `"claude-skip"`, `"/usr/local/bin/claude --flag"`

**Terminal Name Pattern**

```json
{
  "gofer.claudeTerminalName": "Claude"
}
```

- **Default:** `"Claude"`
- **Description:** Name pattern to identify Claude Code terminals

---

### Autonomous Execution Settings

**Show Terminals**

```json
{
  "gofer.autonomous.showTerminals": true
}
```

- **Default:** `true`
- **Description:** Show Claude Code terminals during execution

**Notification Channel**

```json
{
  "gofer.autonomous.notificationChannel": "vscode"
}
```

- **Options:** `"vscode"`, `"whatsapp"`, `"email"`
- **Default:** `"vscode"`

**WhatsApp Phone Number**

```json
{
  "gofer.autonomous.whatsappPhoneNumber": "+1234567890"
}
```

- **Format:** Include country code with `+`

**Email Address**

```json
{
  "gofer.autonomous.emailAddress": "you@example.com"
}
```

**Max Retries**

```json
{
  "gofer.autonomous.maxRetries": 3
}
```

- **Default:** `3`
- **Range:** 1-5
- **Description:** Retry attempts for recoverable errors

**Question Timeout**

```json
{
  "gofer.autonomous.questionTimeout": 300000
}
```

- **Default:** `300000` (5 minutes)
- **Unit:** Milliseconds
- **Description:** Wait time for user responses

**Run Final Validation**

```json
{
  "gofer.autonomous.runFinalValidation": true
}
```

- **Default:** `true`
- **Description:** Validate against constitution after completion

---

### Context Window Management

**Auto-Execute Save**

```json
{
  "gofer.contextWindow.autoExecuteSave": true
}
```

- **Default:** `true`
- **Description:** Automatically run `/7_gofer_save` at threshold

**Auto-Save Threshold**

```json
{
  "gofer.contextWindow.autoSaveThreshold": 0.65
}
```

- **Default:** `0.65` (65%)
- **Range:** 0.0-1.0
- **Description:** Context utilization that triggers auto-save

**Auto-Resume After Save**

```json
{
  "gofer.contextWindow.autoResumeAfterSave": true
}
```

- **Default:** `true`
- **Description:** Automatically run `/8_gofer_resume` after save

**Token Warning Threshold**

```json
{
  "gofer.autonomous.tokenWarningThreshold": 150000
}
```

- **Default:** `150000` (75% of 200K context)

**Token Action Threshold**

```json
{
  "gofer.autonomous.tokenActionThreshold": 180000
}
```

- **Default:** `180000` (90% of 200K context)

**Compaction Threshold**

```json
{
  "gofer.autonomous.compactionThreshold": 80
}
```

- **Default:** `80` (80% utilization)
- **Range:** 50-95
- **Description:** Triggers memory compaction

---

### Engineering Reviews

**Enable Engineering Review**

```json
{
  "gofer.autonomous.enableEngineeringReview": true
}
```

- **Default:** `true`
- **Description:** Proactive reviews during implementation

**Engineering Review Min Completion**

```json
{
  "gofer.autonomous.engineeringReviewMinCompletion": 40
}
```

- **Default:** `40` (40% complete)
- **Range:** 0-100

**Engineering Review Max Completion**

```json
{
  "gofer.autonomous.engineeringReviewMaxCompletion": 80
}
```

- **Default:** `80` (80% complete)
- **Range:** 0-100

**Enable Performance Review**

```json
{
  "gofer.autonomous.enablePerformanceReview": true
}
```

- **Default:** `true`

**Performance Review Min Completion**

```json
{
  "gofer.autonomous.performanceReviewMinCompletion": 70
}
```

- **Default:** `70` (70% complete)

**Engineering Review Prompt**

```json
{
  "gofer.autonomous.engineeringReviewPrompt": "Please perform an engineering review..."
}
```

- **Default:** See extension/package.json line 643
- **Customizable:** Yes

**Performance Review Prompt**

```json
{
  "gofer.autonomous.performanceReviewPrompt": "Please perform a performance analysis..."
}
```

- **Default:** See extension/package.json line 651
- **Customizable:** Yes

---

### Memory Management

**Use Layered Memory**

```json
{
  "gofer.useLayeredMemory": false
}
```

- **Default:** `false`
- **Description:** Enable MemGPT-inspired three-layer memory
- **Layers:** Core (always loaded), Recall (recent), Archival (searchable)

**Observation Preserve Patterns**

```json
{
  "gofer.observationPreservePatterns": ["timeout", "ECONNREFUSED"]
}
```

- **Default:** `[]`
- **Description:** Regex patterns for observations that should never be masked
- **Built-in Patterns:** `error`, `exception`, `failed`, `failure`, `critical`,
  `fatal`

---

### Security & Scope

**Scope Guard Mode**

```json
{
  "gofer.scopeGuard.mode": "warning"
}
```

- **Options:** `"advisory"`, `"warning"`, `"blocking"`
- **Default:** `"warning"`
- **Description:**
  - `advisory` - Log violations only
  - `warning` - Show VSCode warnings
  - `blocking` - Throw `ScopeViolationError`

---

### Cost & Budget

**Max Cost USD**

```json
{
  "gofer.budgets.maxCostUsd": 10
}
```

- **Default:** `10` (USD)
- **Description:** Maximum cost per pipeline run

**Max Tokens Per Run**

```json
{
  "gofer.budgets.maxTokensPerRun": 500000
}
```

- **Default:** `500000`

**Enforcement Mode**

```json
{
  "gofer.budgets.enforcementMode": "advisory"
}
```

- **Options:** `"advisory"`, `"truncate"`, `"blocking"`
- **Default:** `"advisory"`
- **Description:**
  - `advisory` - Log warnings only
  - `truncate` - Reduce context aggressively
  - `blocking` - Stop pipeline execution

---

### Code Quality

**Yolo Slop Reduction**

```json
{
  "gofer.yoloSlopReduction.enabled": false
}
```

- **Default:** `false`
- **Description:** Auto-fix code quality issues on save
- **Fixes:** Remove `console.log`, `debugger`, upgrade `@ts-ignore`

**Notify Every N Fixes**

```json
{
  "gofer.yoloSlopReduction.notifyEvery": 10
}
```

- **Default:** `10`

---

### UI Preferences

**Auto-Initialize**

```json
{
  "gofer.autoInitialize": false
}
```

- **Default:** `false`
- **Description:** Prompt to initialize when opening repo

**Auto-Validate**

```json
{
  "gofer.autoValidate": true
}
```

- **Default:** `true`
- **Description:** Validate specs against constitution

**Show Welcome**

```json
{
  "gofer.showWelcome": true
}
```

- **Default:** `true`

**Markdown Viewer**

```json
{
  "gofer.markdownViewer": "preview"
}
```

- **Options:** `"preview"`, `"mark-sharp"`, `"markdown-editor"`,
  `"markdown-wysiwyg"`
- **Default:** `"preview"`
- **Description:** How to view markdown in tree views

---

## Configuration Files

### `.vscode/mcp.json`

Created automatically by `Gofer: Initialize Repository`.

```json
{
  "mcpServers": {
    "gofer": {
      "command": "node",
      "args": ["/absolute/path/to/extension/language-server/dist/server.js"],
      "transportType": "stdio"
    }
  }
}
```

**Purpose:** Registers MCP tools with VSCode for Claude Code integration.

---

### `.specify/memory/context-profiles.yaml`

Defines stage-specific context budget allocation.

```yaml
# Research stage
research:
  researchBudget: 0.30 # 30% for research findings
  memoryBudget: 0.20 # 20% for memories
  codeBudget: 0.30 # 30% for code context
  observationWindow: 10 # Keep last 10 observations

# Implementation stage
implement:
  researchBudget: 0.15
  memoryBudget: 0.25
  codeBudget: 0.40
  observationWindow: 5

# Validation stage
validate:
  researchBudget: 0.10
  memoryBudget: 0.20
  codeBudget: 0.50
  observationWindow: 3
```

**Purpose:** Allocates context window budget by workflow stage.

---

### `.specify/memory/council-config.yaml`

Configures LLM Council for multi-provider validation.

```yaml
providers:
  - name: anthropic
    model: claude-3-5-sonnet-20241022
    weight: 1.0

  - name: google
    model: gemini-1.5-pro
    weight: 0.8

  - name: openai
    model: gpt-4-turbo
    weight: 0.8

votingStrategy: majority # or "unanimous", "weighted"
minimumVotes: 2
```

**Purpose:** Defines LLM council composition and voting strategy.

---

## Feature Flags

Gofer does not use runtime feature flags. All features are controlled via VSCode
settings.

To enable/disable features:

- Use the settings above
- Changes take effect immediately (no reload required)

---

## Secrets Management

### Storage

**VSCode Settings:**

- API keys stored in user or workspace settings
- Encrypted by VSCode (platform-specific keychain/credential manager)
- Never committed to git

**Environment Variables:**

- `.env` file in project root
- **Important:** Add `.env` to `.gitignore`

### Best Practices

1. **Never commit API keys** - Use `.gitignore` for `.env`
2. **Use workspace settings** for team shared config
3. **Use user settings** for personal API keys
4. **Rotate keys regularly** - Especially if shared

### Credential Hierarchy

Settings priority (highest to lowest):

1. Workspace settings (`.vscode/settings.json`)
2. User settings (VSCode global config)
3. Environment variables (`.env`)

---

## Stage Detection

**File:** `.specify/logs/current-stage.json`

Gofer automatically detects which workflow stage you're in.

```json
{
  "stage": "implement",
  "feature": "auth-001",
  "timestamp": 1642534800000,
  "confidence": 0.95
}
```

**Stages:**

- `research` - Exploring codebase
- `specify` - Writing specification
- `plan` - Creating implementation plan
- `tasks` - Breaking down tasks
- `implement` - Coding
- `validate` - Testing and validation

**Staleness:** Data older than 30 minutes falls back to heuristic detection.

---

## Recommended Settings

### For Solo Developers

```json
{
  "gofer.autonomousMode": true,
  "gofer.claudeCodeMode": "yolo",
  "gofer.contextWindow.autoExecuteSave": true,
  "gofer.autonomous.showTerminals": true,
  "gofer.yoloSlopReduction.enabled": true
}
```

### For Teams

```json
{
  "gofer.autonomousMode": false,
  "gofer.claudeCodeMode": "standard",
  "gofer.scopeGuard.mode": "warning",
  "gofer.budgets.maxCostUsd": 25,
  "gofer.budgets.enforcementMode": "truncate"
}
```

### For CI/CD

```json
{
  "gofer.autonomous.showTerminals": false,
  "gofer.autoValidate": true,
  "gofer.budgets.enforcementMode": "blocking",
  "gofer.budgets.maxCostUsd": 5
}
```
