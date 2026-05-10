# Session Management

Gofer supports saving and resuming work across sessions. This is essential for
long-running features that exceed context window limits or span multiple work
sessions.

## When to Save

- **Context window filling up** - Gofer monitors context health and warns at 50%
  usage
- **Ending a work session** - Save progress before closing VS Code
- **Handing off to a teammate** - Create a checkpoint for someone else to
  continue
- **Before risky operations** - Save as a rollback point

## Save: `/7_gofer_save`

```text
/7_gofer_save
```

This creates a comprehensive checkpoint at
`.specify/specs/{feature}/session-handoff.md` containing:

| What's Saved       | Details                                         |
| ------------------ | ----------------------------------------------- |
| Current progress   | Which tasks are complete, which are in progress |
| Key decisions      | Architecture choices and their rationale        |
| File modifications | List of files created or modified               |
| Remaining work     | What still needs to be done                     |
| Blockers           | Any issues preventing progress                  |
| Context summary    | Condensed version of research/spec findings     |

## Resume: `/8_gofer_resume`

```text
/8_gofer_resume
```

In a new session, this command:

1. **Finds the checkpoint** in the feature directory
2. **Restores context** from the handoff document
3. **Detects progress** by reading tasks.md for completed items
4. **Continues work** from the next incomplete task

## Auto-Save

Gofer can automatically save when context reaches a threshold:

| Setting                                   | Default | Description               |
| ----------------------------------------- | ------- | ------------------------- |
| `gofer.contextWindow.autoExecuteSave`     | `true`  | Enable auto-save          |
| `gofer.contextWindow.autoSaveThreshold`   | `0.65`  | Save at 65% context usage |
| `gofer.contextWindow.autoResumeAfterSave` | `true`  | Auto-resume after saving  |

## Context Health Monitoring

The VS Code status bar shows real-time context health:

| Indicator | Context Usage | Action               |
| --------- | ------------- | -------------------- |
| Green     | < 50%         | Continue normally    |
| Yellow    | 50-70%        | Consider saving soon |
| Red       | > 70%         | Save immediately     |

## Adaptive Context Compaction (ACC)

When context pressure builds, Gofer applies graduated compaction automatically
through 5 stages. This extends effective context life without manual
intervention.

| Stage | Threshold | Action              | What Happens                                           |
| ----- | --------- | ------------------- | ------------------------------------------------------ |
| 1     | 70%       | Delegation advisory | Logs warning, recommends delegating to sub-agents      |
| 2     | 80%       | Observation masking | Older tool outputs replaced with compact references    |
| 3     | 85%       | Fast pruning        | Budget enforcement enabled, oversized sections trimmed |
| 4     | 90%       | Aggressive masking  | All observations forced to masked tier                 |
| 5     | 99%       | Full compaction     | LLM-based summarization of completed work              |

Each stage has a 30-second cooldown to prevent rapid re-triggering. Higher
stages always supersede lower ones. All stage actions are error-safe and will
never crash the extension.

ACC works alongside the existing auto-save system. Auto-save fires at 65% and
creates a session checkpoint. ACC then provides additional compaction if context
continues to grow.

### How Observation Masking Works

Gofer tracks tool outputs (file reads, command results, search results) as
"observations." As context fills up:

1. **Full tier** - Recent observations kept in full detail
2. **Key-points tier** - Older observations show only key findings
3. **Masked tier** - Old observations show a compact placeholder (~15 tokens vs
   thousands)

Masked observations can be expanded on demand via the MCP `expand_observation`
tool if the AI needs to revisit earlier results.

## Typical Workflow

```text
Session 1:
  /0_business_scenario Add search feature
  → Research completes
  → Specify completes
  → Plan completes
  → Tasks approved
  → Implementation starts... (context filling up)
  /7_gofer_save
  → session-handoff.md created

Session 2:
  /8_gofer_resume
  → Context restored from handoff
  → Implementation continues from last task
  → Validate completes
  → Feature done!
```
