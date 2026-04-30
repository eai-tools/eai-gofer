# Configuration Reference

All Gofer settings are configured in VS Code Settings (`Cmd/Ctrl+,`). Search for
"Gofer" to see all options.

`extension/package.json` is the authoritative contract for the currently
supported settings and defaults. This guide highlights the main user-facing
settings without repeating every manifest field verbatim.

## API Keys

These keys enable the optional LLM Council feature, which uses multiple AI
providers for consensus-driven research and validation.

| Setting                      | Type   | Default | Description                                          |
| ---------------------------- | ------ | ------- | ---------------------------------------------------- |
| `gofer.anthropicApiKey`      | string | `""`    | Anthropic API Key for Claude                         |
| `gofer.googleApiKey`         | string | `""`    | Google AI API Key for Gemini                         |
| `gofer.openaiApiKey`         | string | `""`    | OpenAI API Key for GPT models                        |
| `gofer.anthropicAdminApiKey` | string | `""`    | Anthropic Admin API key for billing and usage access |
| `gofer.openaiAdminApiKey`    | string | `""`    | OpenAI Admin API key with `api.usage.read` scope     |

> **Note**: Extension features primarily read these keys from VS Code settings.
> Some local integrations can also use environment-variable placeholders.
> Avoid workspace-level settings for shared or team projects because they are
> plain local config, and treat the admin keys as higher-sensitivity credentials
> than standard provider API keys.

## General Settings

| Setting                | Type    | Default     | Description                                                            |
| ---------------------- | ------- | ----------- | ---------------------------------------------------------------------- |
| `gofer.autoInitialize` | boolean | `false`     | Automatically offer to initialize Gofer when opening a repo without it |
| `gofer.markdownViewer` | string  | `"preview"` | How to view markdown files in the tree view                            |
| `gofer.preferredAI`    | string  | `"ask"`     | Preferred AI tool: `ask`, `claude`, or `copilot`                       |

## Claude Code Integration

| Setting                    | Type    | Default      | Description                                            |
| -------------------------- | ------- | ------------ | ------------------------------------------------------ |
| `gofer.claudeCodeMode`    | string  | `"standard"` | How to launch Claude Code from the status bar          |
| `gofer.claudeCodeCommand` | string  | `"claude"`   | Custom command for Claude Code (when mode is `custom`) |
| `gofer.autonomousMode`    | boolean | `true`       | Enable autonomous monitoring and response preparation  |

## Context Window Management

Settings for managing context window health during long pipeline runs.

| Setting                                   | Type    | Default  | Description                                    |
| ----------------------------------------- | ------- | -------- | ---------------------------------------------- |
| `gofer.autonomous.tokenWarningThreshold`  | number  | `150000` | Show warning at this token count               |
| `gofer.autonomous.tokenActionThreshold`   | number  | `180000` | Spawn new terminal at this token count         |
| `gofer.autonomous.compactionThreshold`    | number  | `80`     | Trigger compaction at this percentage (50-95%) |
| `gofer.contextWindow.autoExecuteSave`     | boolean | `true`   | Auto-execute `/7_gofer_save` at threshold      |
| `gofer.contextWindow.autoSaveThreshold`   | number  | `0.65`   | Context utilization for auto-save (0.0-1.0)    |
| `gofer.contextWindow.autoResumeAfterSave` | boolean | `true`   | Auto-resume after save completes               |

## Autonomous Execution

Settings for autonomous pipeline execution behavior.

| Setting                                 | Type    | Default  | Description                                 |
| --------------------------------------- | ------- | -------- | ------------------------------------------- |
| `gofer.autonomous.showTerminals`        | boolean | `true`   | Show Claude Code terminals during execution |
| `gofer.autonomous.maxRetries`           | number  | `3`      | Max retry attempts for errors (1-5)         |
| `gofer.autonomous.questionTimeout`      | number  | `300000` | Wait time for user responses (milliseconds) |
| `gofer.autonomous.runFinalValidation`   | boolean | `true`   | Run validation after implementation         |
| `gofer.autonomous.validateConstitution` | boolean | `true`   | Validate against constitution principles    |

## Engineering Reviews

Settings for proactive reviews during implementation.

| Setting                                           | Type    | Default | Description                                      |
| ------------------------------------------------- | ------- | ------- | ------------------------------------------------ |
| `gofer.autonomous.enableEngineeringReview`        | boolean | `true`  | Enable engineering reviews during implementation |
| `gofer.autonomous.enablePerformanceReview`        | boolean | `true`  | Enable performance reviews during implementation |
| `gofer.autonomous.engineeringReviewMinCompletion` | number  | `40`    | Min completion % to trigger review               |
| `gofer.autonomous.engineeringReviewMaxCompletion` | number  | `80`    | Max completion % to trigger review               |
| `gofer.autonomous.performanceReviewMinCompletion` | number  | `70`    | Min completion % for performance review          |

## Advanced Settings

| Setting                                | Type    | Default     | Description                                           |
| -------------------------------------- | ------- | ----------- | ----------------------------------------------------- |
| `gofer.useLayeredMemory`               | boolean | `false`     | Enable three-layer memory (core/recall/archival)      |
| `gofer.stageDetectionStalenessMinutes` | number  | `30`        | Minutes before stage detection is stale               |
| `gofer.yoloSlopReduction.enabled`      | boolean | `false`     | Auto-reduce AI slop on file save                      |
| `gofer.yoloSlopReduction.notifyEvery`  | number  | `10`        | Show notification every N slop fixes                  |
| `gofer.scopeGuard.mode`                | string  | `"warning"` | Scope guard enforcement: `advisory`, `warning`, or `blocking` |

## Budget Controls

| Setting                         | Type   | Default      | Description                                        |
| ------------------------------- | ------ | ------------ | -------------------------------------------------- |
| `gofer.budgets.maxCostUsd`      | number | `10`         | Max cost (USD) per pipeline run                    |
| `gofer.budgets.maxTokensPerRun` | number | `500000`     | Max total tokens per pipeline run                  |
| `gofer.budgets.enforcementMode` | string | `"advisory"` | Budget enforcement: `advisory`, `truncate`, or `blocking` |
