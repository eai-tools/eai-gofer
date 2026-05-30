---
generated: true
generated_at: '2026-05-23T17:54:39.953Z'
source_commit: '047baa06f9bdd86354d43413563a98f893685fb3'
---

# Gofer - Configuration

## Executive Summary

Gofer configuration is managed through VS Code settings (50+ manifest-backed
settings), environment variables (`.env` for secrets), and file-based config
(`.specify/` directory). Configuration is layered: defaults → user settings →
workspace settings, with workspace taking precedence.

## Repo-Owned Model Policy

Gofer bootstraps `.specify/memory/gofer-model-policy.yaml` from
`.specify/templates/gofer-model-policy.yaml`. The memory copy is user-owned and
is not overwritten by bootstrap. Use it to tune model routing:

- `simple`: cheap capable defaults for routine work.
- `mechanical`: ultra-cheap locate/classify/summarize routes where supported.
- `medium`: normal implementation, synthesis, validation, and research.
- `hard`: best available model for security, architecture, release-critical
  review, or repeated failure.
- `arbiter`: optional final frontier route for cross-model disagreements.

Copilot uses `Auto` for simple/default work because Copilot model availability
is controlled by the client, plan, and organization policy.

## VS Code Settings

### API Keys

| Setting                      | Type   | Default | Description                              |
| ---------------------------- | ------ | ------- | ---------------------------------------- |
| `gofer.anthropicApiKey`      | string | `""`    | Anthropic API key for Claude models      |
| `gofer.googleApiKey`         | string | `""`    | Google AI API key for Gemini models      |
| `gofer.openaiApiKey`         | string | `""`    | OpenAI API key for GPT models            |
| `gofer.anthropicAdminApiKey` | string | `""`    | Anthropic admin API key for billing data |
| `gofer.openaiAdminApiKey`    | string | `""`    | OpenAI admin API key for billing data    |

**Security Notes:**

- API keys are stored in VS Code settings (encrypted by VS Code)
- Never commit API keys to version control
- Admin keys are optional and only used for cost tracking

### Workflow Profile

| Setting                 | Type    | Default          | Description                                                                                                                                       |
| ----------------------- | ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gofer.workflowProfile` | enum    | `"enterpriseai"` | Legacy compatibility toggle. Public Gofer usage should prefer `standard`; `enterpriseai` remains only for older workflow contracts until retired. |
| `gofer.autoInitialize`  | boolean | `false`          | Auto-initialize `.specify/` on workspace open                                                                                                     |
| `gofer.preferredAI`     | enum    | `"ask"`          | Preferred AI assistant: `ask`, `claude`, `copilot`, `codex`, `gemini`                                                                             |
| `gofer.defaultCLI`      | enum    | `"auto"`         | Default CLI surface: `auto`, `claude`, `copilot`, `codex`, `gemini`                                                                               |

### AI Usage and Billing

| Setting                             | Type    | Default   | Description                                                                        |
| ----------------------------------- | ------- | --------- | ---------------------------------------------------------------------------------- |
| `gofer.aiUsage.useApiClient`        | boolean | `true`    | Fetch provider billing data from Anthropic/OpenAI APIs instead of local usage logs |
| `gofer.aiUsage.api.pollingInterval` | number  | `60000`   | Polling interval for provider billing APIs in milliseconds                         |
| `gofer.aiUsage.statusBar.enabled`   | boolean | `true`    | Show current session AI usage cost in the VS Code status bar                       |
| `gofer.aiUsage.polling.interval`    | number  | `3600000` | Fallback usage polling interval when the watcher is not active                     |

### CLI and Workflow Selection

| Setting                                   | Type    | Default      | Description                                                                                                          |
| ----------------------------------------- | ------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `gofer.cliProvider`                       | enum    | `"auto"`     | AI CLI provider for autonomous mode: `claude`, `codex`, `copilot`, `gemini`, `auto`                                  |
| `gofer.claudeCodeMode`                    | enum    | `"standard"` | Launch mode for Claude Code: `standard`, `yolo`, `custom`                                                            |
| `gofer.claudeCodeCommand`                 | string  | `"claude"`   | Custom command used when `gofer.claudeCodeMode` is `custom`                                                          |
| `gofer.codexCommand`                      | string  | `"codex"`    | Custom path to the Codex CLI executable                                                                              |
| `gofer.markdownViewer`                    | enum    | `"preview"`  | Markdown viewer integration to open when clicking files                                                              |
| `gofer.enterpriseAiUseExternalReferences` | boolean | `false`      | Legacy external reference toggle for older compatibility flows. Public Gofer installs do not need it for normal use. |

### Autonomous Orchestration

| Setting                                           | Type    | Default  | Description                                                                |
| ------------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------- |
| `gofer.autonomousMode`                            | boolean | `true`   | Enable Gofer’s autonomous Claude Code session monitoring and response flow |
| `gofer.autonomous.showTerminals`                  | boolean | `true`   | Keep autonomous Claude Code terminals visible while work is running        |
| `gofer.autonomous.maxRetries`                     | number  | `3`      | Maximum recoverable retry attempts during autonomous execution             |
| `gofer.autonomous.tokenWarningThreshold`          | number  | `150000` | Token threshold for warning that the context window is nearing capacity    |
| `gofer.autonomous.tokenActionThreshold`           | number  | `180000` | Token threshold that triggers a fresh terminal/context handoff             |
| `gofer.autonomous.compactionThreshold`            | number  | `80`     | Context usage percentage that triggers automatic compaction                |
| `gofer.autonomous.questionTimeout`                | number  | `300000` | Milliseconds to wait for a human answer before pausing                     |
| `gofer.autonomous.runFinalValidation`             | boolean | `true`   | Run final validation after implementation completes                        |
| `gofer.autonomous.validateConstitution`           | boolean | `true`   | Validate completed work against the project constitution                   |
| `gofer.autonomous.enableEngineeringReview`        | boolean | `true`   | Request engineering reviews at configured completion milestones            |
| `gofer.autonomous.enablePerformanceReview`        | boolean | `true`   | Request performance reviews near completion                                |
| `gofer.autonomous.engineeringReviewMinCompletion` | number  | `40`     | Minimum completion percentage before engineering review can trigger        |
| `gofer.autonomous.engineeringReviewMaxCompletion` | number  | `80`     | Maximum completion percentage for engineering review triggering            |
| `gofer.autonomous.performanceReviewMinCompletion` | number  | `70`     | Minimum completion percentage before performance review can trigger        |

### Context and Memory

| Setting                                                  | Type    | Default  | Description                                                                         |
| -------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| `gofer.useLayeredMemory`                                 | boolean | `false`  | Enable MemGPT-style layered memory (core, recall, archival)                         |
| `gofer.memory.coverageThreshold`                         | number  | `30`     | Memory coverage percentage needed before skipping research documents                |
| `gofer.observationPreservePatterns`                      | array   | `[]`     | Extra regex patterns whose observations must never be masked                        |
| `gofer.stageDetectionStalenessMinutes`                   | number  | `30`     | How long cached stage detection stays fresh before heuristic fallback               |
| `gofer.contextWindow.autoExecuteSave`                    | boolean | `true`   | Automatically execute `/7_gofer_save` when context usage crosses the save threshold |
| `gofer.contextWindow.autoSaveThreshold`                  | number  | `0.65`   | Context utilization ratio that triggers an automatic save                           |
| `gofer.contextWindow.autoResumeAfterSave`                | boolean | `true`   | Automatically execute `/8_gofer_resume` after `/7_gofer_save`                       |
| `gofer.contextWindow.continuousSlopReduction.enabled`    | boolean | `false`  | Enable periodic workspace-wide slop reduction scans                                 |
| `gofer.contextWindow.continuousSlopReduction.intervalMs` | number  | `120000` | Interval for background workspace-wide slop reduction scans                         |
| `gofer.yoloSlopReduction.enabled`                        | boolean | `false`  | Remove common slop patterns on save for supported source files                      |
| `gofer.yoloSlopReduction.notifyEvery`                    | number  | `10`     | How often to surface slop-reduction notifications                                   |

### Guardrails and Diagnostics

| Setting                                          | Type    | Default      | Description                                                    |
| ------------------------------------------------ | ------- | ------------ | -------------------------------------------------------------- |
| `gofer.scopeGuard.mode`                          | enum    | `"warning"`  | ScopeGuard enforcement mode: `advisory`, `warning`, `blocking` |
| `gofer.budgets.maxCostUsd`                       | number  | `10`         | Maximum estimated USD cost for a single pipeline run           |
| `gofer.budgets.maxTokensPerRun`                  | number  | `500000`     | Maximum total tokens allowed for a single pipeline run         |
| `gofer.budgets.enforcementMode`                  | enum    | `"advisory"` | Budget response mode: `advisory`, `truncate`, `blocking`       |
| `gofer.diagnostics.resourceSnapshots.enabled`    | boolean | `true`       | Periodically log lightweight process resource snapshots        |
| `gofer.diagnostics.resourceSnapshots.intervalMs` | number  | `300000`     | Interval for logging resource snapshots                        |

## Environment Variables

Configuration via `.env` file (never commit to Git):

| Variable                 | Required | Default          | Description                                        |
| ------------------------ | -------- | ---------------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY`      | No       | -                | Anthropic API key (alternative to VS Code setting) |
| `GOOGLE_API_KEY`         | No       | -                | Google AI API key                                  |
| `OPENAI_API_KEY`         | No       | -                | OpenAI API key                                     |
| `TWILIO_ACCOUNT_SID`     | No       | -                | Twilio account SID (optional notifications)        |
| `TWILIO_AUTH_TOKEN`      | No       | -                | Twilio auth token                                  |
| `TWILIO_WHATSAPP_NUMBER` | No       | -                | Twilio WhatsApp number                             |
| `WHATSAPP_PHONE_NUMBER`  | No       | -                | Recipient WhatsApp number                          |
| `LOG_LEVEL`              | No       | `info`           | Logging level: `debug`, `info`, `warn`, `error`    |
| `SPECS_DIR`              | No       | `.specify/specs` | Specifications directory                           |
| `MAX_RETRIES`            | No       | `3`              | Max retries for failed operations                  |

**Example `.env`:**

```bash
# LLM API Keys
ANTHROPIC_API_KEY=OPENAI_API_KEY_REDACTED
GOOGLE_API_KEY=AIza-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Optional: Twilio WhatsApp Integration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
WHATSAPP_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=info

# Orchestrator
SPECS_DIR=.specify/specs
MAX_RETRIES=3
```

## File-Based Configuration

### Constitution (`.specify/memory/constitution.md`)

Project-specific coding principles and guidelines enforced by ScopeGuard and
validation agents.

**Example:**

```markdown
# Project Constitution

## Coding Principles

### Error Handling

- All async functions must have try-catch blocks
- User-facing errors must be translated to readable messages
- Never log sensitive data (passwords, tokens)

### Security

- Never store passwords in plaintext
- Use bcrypt for password hashing (min 10 rounds)
- JWT tokens expire after 1 hour

### Testing

- All new functions require unit tests
- Integration tests for API endpoints
- Minimum 80% code coverage
```

### Spec Frontmatter Configuration

Each spec can override global settings via YAML frontmatter:

```yaml
---
id: '001-login-feature'
status: 'in_progress'
protected_files:
  - 'src/auth/*.ts'
  - '.env'
budget_override: 5.0 # Override global budget for this spec
council_enabled: true # Enable LLM Council for this spec
---
```

## Configuration Precedence

1. **Workspace Settings** (`.vscode/settings.json`)
2. **User Settings** (VS Code global settings)
3. **Spec Frontmatter** (spec-specific overrides)
4. **Environment Variables** (`.env`)
5. **Defaults** (hardcoded in extension)

## Secrets Management

### Where to Store API Keys

1. **Recommended:** VS Code User Settings (encrypted by VS Code)
   - `Cmd/Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"
   - Add: `"gofer.anthropicApiKey": "sk-ant-api03-..."`

2. **Alternative:** Environment variables in `.env` file
   - Create `.env` in repository root
   - Add to `.gitignore` to prevent commit
   - Load via `dotenv` in orchestrator

3. **Not Recommended:** Workspace settings (`.vscode/settings.json`)
   - May be committed to Git if not careful
   - Use only for non-sensitive settings

### Secret Rotation

- No built-in secret rotation
- Manually update API keys in VS Code settings or `.env`
- Keys are never logged or committed by Gofer

## Required Configuration for Features

### Minimum Configuration (VS Code Extension Only)

```json
{
  "gofer.workflowProfile": "standard"
}
```

### Full AI Assistant Integration

```json
{
  "gofer.anthropicApiKey": "sk-ant-api03-...",
  "gofer.googleApiKey": "AIza-...",
  "gofer.openaiApiKey": "sk-...",
  "gofer.defaultCLI": "auto",
  "gofer.aiUsage.useApiClient": true
}
```

### Autonomous Orchestration

```json
{
  "gofer.anthropicApiKey": "sk-ant-api03-...",
  "gofer.budgets.maxCostUsd": 10,
  "gofer.budgets.enforcementMode": "advisory",
  "gofer.scopeGuard.mode": "warning",
  "gofer.useLayeredMemory": true,
  "gofer.contextWindow.autoExecuteSave": true
}
```

## Troubleshooting

### Issue: API Key Not Recognized

- **Cause:** Key not set or invalid format
- **Fix:** Verify key in VS Code settings: `Cmd/Ctrl+Shift+P` → "Preferences:
  Open User Settings (JSON)"
- **Verify:** Check extension output: `View` → `Output` → Select "Gofer"

### Issue: Automatic Context Save Not Triggering

- **Cause:** Auto-save disabled or threshold set too high
- **Fix:** Enable auto-save: `"gofer.contextWindow.autoExecuteSave": true`
- **Verify:** Check that `/7_gofer_save` is sent when usage crosses
  `gofer.contextWindow.autoSaveThreshold`

### Issue: Layered Memory Not Loading

- **Cause:** Layered memory is not enabled
- **Fix:** Enable layered memory: `"gofer.useLayeredMemory": true`
- **Verify:** Check that context assembly prefers memory coverage when it meets
  `gofer.memory.coverageThreshold`

### Issue: Cost Budget Exceeded

- **Cause:** Budget too low or unexpected high token usage
- **Fix:** Increase budget: `"gofer.budgets.maxCostUsd": 20`
- **Verify:** Check `.specify/logs/gofer-run-ledger.jsonl` for actual costs

## Configuration Migration

### From v2.x to v3.x

- Review the manifest-backed settings above and remove any legacy workspace or
  user settings that no longer appear in the current `gofer.*` manifest.
- Refresh saved workspace examples to use the current budget keys
  (`gofer.budgets.*`) and layered memory key (`gofer.useLayeredMemory`).

### Legacy `enterpriseai` Compatibility

- Set `"gofer.workflowProfile": "enterpriseai"` only if you need older legacy
  workflow contracts during migration.
- Public Gofer usage should prefer `"gofer.workflowProfile": "standard"`.
- Track removal of legacy compatibility settings before a full public launch.
