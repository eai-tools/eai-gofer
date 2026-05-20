---
generated: true
generated_at: "2026-05-20T18:34:35.325Z"
source_commit: "f8627eca842fa72136a17e0b208b9410b832357c"
---
# Gofer - Configuration

## Executive Summary

Gofer configuration is managed through VS Code settings (91+ settings), environment variables (`.env` for secrets), and file-based config (`.specify/` directory). Configuration is layered: defaults → user settings → workspace settings, with workspace taking precedence.

## VS Code Settings

### API Keys

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.anthropicApiKey` | string | `""` | Anthropic API key for Claude models |
| `gofer.googleApiKey` | string | `""` | Google AI API key for Gemini models |
| `gofer.openaiApiKey` | string | `""` | OpenAI API key for GPT models |
| `gofer.anthropicAdminApiKey` | string | `""` | Anthropic admin API key for billing data |
| `gofer.openaiAdminApiKey` | string | `""` | OpenAI admin API key for billing data |

**Security Notes:**
- API keys are stored in VS Code settings (encrypted by VS Code)
- Never commit API keys to version control
- Admin keys are optional and only used for cost tracking

### Workflow Profile

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.workflowProfile` | enum | `"enterpriseai"` | Workflow profile: `enterpriseai` or `standard` |
| `gofer.autoInitialize` | boolean | `false` | Auto-initialize `.specify/` on workspace open |
| `gofer.preferredAI` | enum | `"ask"` | Preferred AI assistant: `ask`, `claude`, `copilot`, `codex`, `gemini` |
| `gofer.defaultCLI` | enum | `"auto"` | Default CLI surface: `auto`, `claude`, `copilot`, `codex`, `gemini` |

### Context Management

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.contextHealth.enabled` | boolean | `true` | Enable context health monitoring |
| `gofer.contextHealth.pollInterval` | number | `30000` | Poll interval in milliseconds (30s) |
| `gofer.contextHealth.thresholds.delegation` | number | `70` | Delegation advisory threshold (%) |
| `gofer.contextHealth.thresholds.masking` | number | `80` | Observation masking threshold (%) |
| `gofer.contextHealth.thresholds.pruning` | number | `85` | Fast pruning threshold (%) |
| `gofer.contextHealth.thresholds.aggressive` | number | `90` | Aggressive masking threshold (%) |
| `gofer.contextHealth.thresholds.compaction` | number | `99` | Full compaction threshold (%) |
| `gofer.acc.maskingTurnThreshold` | number | `5` | Turns before observation masking |

### Memory Management

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.memory.enabled` | boolean | `true` | Enable memory system |
| `gofer.memory.layered` | boolean | `false` | Use 3-layer memory system (opt-in) |
| `gofer.memory.maxMemories` | number | `1000` | Maximum memories to keep |
| `gofer.memory.compactionThreshold` | number | `0.8` | Compaction trigger (80% full) |
| `gofer.memory.tfidfMinScore` | number | `0.1` | Minimum TF-IDF score for retrieval |
| `gofer.memory.showSystemMemories` | boolean | `false` | Show system-generated memories in panel |

### Scope Guard

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.scopeGuard.mode` | enum | `"advisory"` | Protection mode: `advisory`, `warning`, `blocking` |
| `gofer.scopeGuard.enabled` | boolean | `true` | Enable file access protection |
| `gofer.scopeGuard.logViolations` | boolean | `true` | Log violations to tool-audit.jsonl |

### Cost Budget

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.budget.enabled` | boolean | `true` | Enable cost budget enforcement |
| `gofer.budget.maxCostPerRun` | number | `10.0` | Maximum cost per pipeline run (USD) |
| `gofer.budget.warnThreshold` | number | `0.8` | Warning threshold (80% of budget) |

### LLM Council

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.council.enabled` | boolean | `false` | Enable multi-model validation |
| `gofer.council.models` | array | `["claude-3-5-sonnet-20241022", "gemini-1.5-pro", "gpt-4o"]` | Models for validation |
| `gofer.council.consensusThreshold` | number | `0.67` | Consensus threshold (2/3) |

### Slop Reduction

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.slopReduction.enabled` | boolean | `false` | Auto-remove console.log, debugger, etc. (opt-in) |
| `gofer.slopReduction.patterns` | array | `["console.log", "debugger", "@ts-ignore"]` | Patterns to detect |
| `gofer.slopReduction.onSave` | boolean | `false` | Run on file save |

### Auto-Update

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.autoUpdate.enabled` | boolean | `true` | Check for extension updates |
| `gofer.autoUpdate.frequency` | enum | `"daily"` | Check frequency: `daily`, `weekly`, `never` |

### UI Preferences

| Setting | Type | Default | Description |
| ------- | ---- | ------- | ----------- |
| `gofer.ui.progressIcons` | enum | `"harvey-balls"` | Progress icons: `harvey-balls`, `percentages`, `checkmarks` |
| `gofer.ui.showBranchInTitle` | boolean | `true` | Show Git branch in spec title |
| `gofer.ui.compactView` | boolean | `false` | Use compact tree view |

## Environment Variables

Configuration via `.env` file (never commit to Git):

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key (alternative to VS Code setting) |
| `GOOGLE_API_KEY` | No | - | Google AI API key |
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `TWILIO_ACCOUNT_SID` | No | - | Twilio account SID (optional notifications) |
| `TWILIO_AUTH_TOKEN` | No | - | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | No | - | Twilio WhatsApp number |
| `WHATSAPP_PHONE_NUMBER` | No | - | Recipient WhatsApp number |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `SPECS_DIR` | No | `.specify/specs` | Specifications directory |
| `MAX_RETRIES` | No | `3` | Max retries for failed operations |

**Example `.env`:**

```bash
# LLM API Keys
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
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

Project-specific coding principles and guidelines enforced by ScopeGuard and validation agents.

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
id: "001-login-feature"
status: "in_progress"
protected_files:
  - "src/auth/*.ts"
  - ".env"
budget_override: 5.0  # Override global budget for this spec
council_enabled: true  # Enable LLM Council for this spec
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
  "gofer.workflowProfile": "enterpriseai"
}
```

### Full AI Assistant Integration

```json
{
  "gofer.anthropicApiKey": "sk-ant-api03-...",
  "gofer.googleApiKey": "AIza-...",
  "gofer.openaiApiKey": "sk-...",
  "gofer.defaultCLI": "auto",
  "gofer.council.enabled": true
}
```

### Autonomous Orchestration

```json
{
  "gofer.anthropicApiKey": "sk-ant-api03-...",
  "gofer.budget.enabled": true,
  "gofer.budget.maxCostPerRun": 10.0,
  "gofer.scopeGuard.mode": "warning",
  "gofer.memory.layered": true,
  "gofer.contextHealth.enabled": true
}
```

## Troubleshooting

### Issue: API Key Not Recognized

- **Cause:** Key not set or invalid format
- **Fix:** Verify key in VS Code settings: `Cmd/Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"
- **Verify:** Check extension output: `View` → `Output` → Select "Gofer"

### Issue: Context Health Not Updating

- **Cause:** Polling disabled or cache stale
- **Fix:** Enable polling: `"gofer.contextHealth.enabled": true`
- **Verify:** Check status bar shows context percentage

### Issue: Memory Not Persisting

- **Cause:** Memory system disabled or file permissions
- **Fix:** Enable memory: `"gofer.memory.enabled": true`
- **Verify:** Check `.specify/memory/memories.jsonl` exists and is writable

### Issue: Cost Budget Exceeded

- **Cause:** Budget too low or unexpected high token usage
- **Fix:** Increase budget: `"gofer.budget.maxCostPerRun": 20.0`
- **Verify:** Check `.specify/logs/gofer-run-ledger.jsonl` for actual costs

## Configuration Migration

### From v2.x to v3.x

- **Old:** `gofer.claudeApiKey` → **New:** `gofer.anthropicApiKey`
- **Old:** `gofer.enableCouncil` → **New:** `gofer.council.enabled`
- **Old:** `gofer.contextThreshold` → **New:** `gofer.contextHealth.thresholds.compaction`

### From Standard to EnterpriseAI Workflow

- Set `"gofer.workflowProfile": "enterpriseai"`
- Add EnterpriseAI platform integration settings (if applicable)
- No breaking changes to existing specs
