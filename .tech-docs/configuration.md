---
generated: true
generated_at: "2026-05-10T13:38:38.782Z"
source_commit: "d7fa4cc243aeb1b82cdcc44fd69e610fb02dc507"
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
- **Get Key:** [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **Storage:** Securely stored in VSCode settings

**Anthropic Admin API Key**

```json
{
  "gofer.anthropicAdminApiKey": "sk-ant-admin-..."
}
```

- **Description:** Your Anthropic Admin API key for billing data
- **Usage:** AI Usage Panel - real-time cost tracking
- **Get Key:** [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **Required for:** Provider billing API integration

**Google AI API Key**

```json
{
  "gofer.googleApiKey": "AIza..."
}
```

- **Description:** Your Google AI API key for Gemini
- **Usage:** LLM council (optional)
- **Get Key:** [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**OpenAI API Key**

```json
{
  "gofer.openaiApiKey": "sk-proj-..."
}
```

- **Description:** Your OpenAI API key for GPT models
- **Usage:** LLM council (optional)
- **Get Key:** [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**OpenAI Admin API Key**

```json
{
  "gofer.openaiAdminApiKey": "sk-proj-..."
}
```

- **Description:** Your OpenAI Admin API key for billing data
- **Usage:** AI Usage Panel - real-time cost tracking
- **Required for:** Provider billing API integration with `api.usage.read` scope

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

**Default CLI Platform (v3.0+)**

```json
{
  "gofer.defaultCLI": "auto"
}
```

- **Options:** `"auto"`, `"claude"`, `"copilot"`, `"codex"`, `"gemini"`
- **Default:** `"auto"`
- **Description:** AI CLI for Gofer command routing
- **Auto-detection:** Automatically detects installed CLI

**Workflow Profile (v3.0+)**

```json
{
  "gofer.workflowProfile": "enterpriseai"
}
```

- **Options:** `"standard"`, `"enterpriseai"`
- **Default:** `"enterpriseai"`
- **Description:** EnterpriseAI-focused workflow guidance

**Use External References**

```json
{
  "gofer.enterpriseAiUseExternalReferences": false
}
```

- **Default:** `false`
- **Description:** Prefer external EnterpriseAI URLs vs local fallback

**Preferred AI Tool (Legacy)**

```json
{
  "gofer.preferredAI": "claude"
}
```

- **Options:** `"claude"`, `"copilot"`, `"ask"`
- **Default:** `"ask"`
- **Description:** Which AI to use when sending tasks (legacy setting)

---

### Context Management

**Auto-Save Threshold**

```json
{
  "gofer.contextWindow.autoSaveThreshold": 0.65
}
```

- **Default:** `0.65` (65%)
- **Range:** `0.0` to `1.0`
- **Description:** Context utilization threshold for automatic session save

**Auto-Execute Save**

```json
{
  "gofer.contextWindow.autoExecuteSave": true
}
```

- **Default:** `true`
- **Description:** Automatically execute `/7_gofer_save` when threshold reached

**Auto-Resume After Save**

```json
{
  "gofer.contextWindow.autoResumeAfterSave": true
}
```

- **Default:** `true`
- **Description:** Automatically execute `/8_gofer_resume` after save

**Compaction Threshold**

```json
{
  "gofer.autonomous.compactionThreshold": 80
}
```

- **Default:** `80` (80%)
- **Range:** `50-95`
- **Description:** Context usage percentage that triggers auto-compaction

---

### Memory Management

**Use Layered Memory**

```json
{
  "gofer.useLayeredMemory": false
}
```

- **Default:** `false`
- **Description:** Enable MemGPT-inspired three-layer memory (core/recall/archival)

**Memory Coverage Threshold**

```json
{
  "gofer.memory.coverageThreshold": 30
}
```

- **Default:** `30` (30%)
- **Range:** `0-100`
- **Description:** Memory coverage threshold for tiered context loading

---

### Code Quality

**Slop Reduction**

```json
{
  "gofer.yoloSlopReduction.enabled": false
}
```

- **Default:** `false`
- **Description:** Auto-remove console.log, debugger, @ts-ignore on save

**Slop Notification Frequency**

```json
{
  "gofer.yoloSlopReduction.notifyEvery": 10
}
```

- **Default:** `10`
- **Description:** Show notification every N slop fixes

**Continuous Slop Reduction**

```json
{
  "gofer.contextWindow.continuousSlopReduction.enabled": false
}
```

- **Default:** `false`
- **Description:** Enable periodic background workspace-wide slop scans

**Continuous Slop Interval**

```json
{
  "gofer.contextWindow.continuousSlopReduction.intervalMs": 120000
}
```

- **Default:** `120000` (2 minutes)
- **Range:** `60000-1800000`
- **Description:** Interval for background slop scans

---

### Scope Guard

**Scope Guard Mode**

```json
{
  "gofer.scopeGuard.mode": "warning"
}
```

- **Options:** `"advisory"`, `"warning"`, `"blocking"`
- **Default:** `"warning"`
- **Description:** ScopeGuard enforcement mode for protected file boundaries

---

### Budget Enforcement

**Max Cost (USD)**

```json
{
  "gofer.budgets.maxCostUsd": 10
}
```

- **Default:** `10`
- **Description:** Maximum cost in USD per pipeline run

**Max Tokens Per Run**

```json
{
  "gofer.budgets.maxTokensPerRun": 500000
}
```

- **Default:** `500000`
- **Description:** Maximum total tokens (input + output) per run

**Budget Enforcement Mode**

```json
{
  "gofer.budgets.enforcementMode": "advisory"
}
```

- **Options:** `"advisory"`, `"truncate"`, `"blocking"`
- **Default:** `"advisory"`
- **Description:** How cost budget is enforced when limits exceeded

---

### AI Usage Tracking

**Use API Client**

```json
{
  "gofer.aiUsage.useApiClient": true
}
```

- **Default:** `true`
- **Description:** Use billing API client for usage data

**Polling Interval**

```json
{
  "gofer.aiUsage.api.pollingInterval": 60000
}
```

- **Default:** `60000` (1 minute)
- **Range:** `15000-300000`
- **Description:** How often to poll provider billing APIs

**Status Bar Enabled**

```json
{
  "gofer.aiUsage.statusBar.enabled": true
}
```

- **Default:** `true`
- **Description:** Show AI usage cost in status bar

---

### Engineering Reviews

**Enable Engineering Review**

```json
{
  "gofer.autonomous.enableEngineeringReview": true
}
```

- **Default:** `true`
- **Description:** Enable proactive engineering reviews during implementation

**Enable Performance Review**

```json
{
  "gofer.autonomous.enablePerformanceReview": true
}
```

- **Default:** `true`
- **Description:** Enable proactive performance reviews during implementation

**Engineering Review Min Completion**

```json
{
  "gofer.autonomous.engineeringReviewMinCompletion": 40
}
```

- **Default:** `40` (40%)
- **Range:** `0-100`
- **Description:** Minimum completion % to trigger engineering review

**Engineering Review Max Completion**

```json
{
  "gofer.autonomous.engineeringReviewMaxCompletion": 80
}
```

- **Default:** `80` (80%)
- **Range:** `0-100`
- **Description:** Maximum completion % to trigger engineering review

**Performance Review Min Completion**

```json
{
  "gofer.autonomous.performanceReviewMinCompletion": 70
}
```

- **Default:** `70` (70%)
- **Range:** `0-100`
- **Description:** Minimum completion % to trigger performance review

---

### Diagnostics

**Resource Snapshots Enabled**

```json
{
  "gofer.diagnostics.resourceSnapshots.enabled": true
}
```

- **Default:** `true`
- **Description:** Write lightweight resource snapshots to output log

**Resource Snapshots Interval**

```json
{
  "gofer.diagnostics.resourceSnapshots.intervalMs": 300000
}
```

- **Default:** `300000` (5 minutes)
- **Range:** `60000-3600000`
- **Description:** Interval for resource snapshots

---

## Configuration Files

### `.specify/` Directory Structure

```
.specify/
├── specs/               # Feature specifications
│   └── {spec-id}/
│       ├── spec.md      # Main specification
│       ├── plan.md      # Implementation plan
│       ├── tasks.md     # Task breakdown
│       └── research.md  # Research findings
├── memory/              # Project memory
│   ├── constitution.md  # Coding principles
│   ├── memories.jsonl   # Memory storage
│   └── hints/           # Context hints
├── logs/                # JSONL logs
│   ├── council-usage.jsonl
│   ├── tool-audit.jsonl
│   ├── slop-reduction.jsonl
│   └── gofer-run-ledger.jsonl
├── commands/            # CLI command sources
└── current-stage.json   # Current pipeline stage
```

### Extension Manifest

**File:** `extension/package.json`

- Defines all VSCode commands (30+)
- Defines all configuration settings (50+)
- Defines views and panels (3)
- Activation events

### Claude Code Plugin

**File:** `.claude-plugin/plugin.json`

- MCP tool definitions
- Plugin metadata
- Tool categories

### Gemini CLI Extension

**File:** `.gemini/extension.json`

- Gemini command metadata
- Extension configuration

### Codex Configuration

**File:** `codex-config.toml`

- Codex skill configuration scaffold
- Skill discovery paths

---

## Feature Flags

Gofer does not use traditional feature flags. All features are controlled via VSCode settings (see above).

**Feature Toggle Settings:**

- `gofer.autonomousMode` - Autonomous execution
- `gofer.yoloSlopReduction.enabled` - Slop reduction
- `gofer.useLayeredMemory` - Layered memory system
- `gofer.aiUsage.useApiClient` - Billing API client
- `gofer.contextWindow.autoExecuteSave` - Auto-save execution
- `gofer.autonomous.enableEngineeringReview` - Engineering reviews
- `gofer.autonomous.enablePerformanceReview` - Performance reviews

---

## Secrets and Credentials

**Required Secrets:** None (extension works without API keys)

**Optional Secrets:**

1. **Anthropic API Key** - For Claude AI access
2. **Anthropic Admin API Key** - For billing data
3. **Google API Key** - For Gemini AI
4. **OpenAI API Key** - For GPT models
5. **OpenAI Admin API Key** - For billing data
6. **Twilio Credentials** - For WhatsApp notifications

**Storage:**

- VSCode Settings (encrypted by VSCode)
- Environment variables (`.env` file, gitignored)
- Never committed to git
- Never logged to output channels

**Best Practices:**

- Use VSCode settings for API keys (preferred)
- Use environment variables for CI/CD
- Never hardcode credentials
- Rotate keys periodically
- Use separate keys for dev/prod
