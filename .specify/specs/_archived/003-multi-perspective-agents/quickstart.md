# Quickstart: Multi-Perspective Sub-Agent Strategies

## Prerequisites

- Claude Code CLI with Task tool support
- Access to `.claude/agents/` and `.claude/commands/` directories
- VSCode extension compiled (`cd extension && npm run compile`)

## Verifying Agent Files

After implementation, verify all 21 new agent files exist:

```bash
ls .claude/agents/ | grep -E '^(multi-perspective|research-|specify-|plan-|tasks-|validate-security-red|implement-)' | wc -l
# Expected: 21
```

## Verifying Model Parameters

Check that all Task tool calls in commands have model parameters:

```bash
grep -n 'subagent_type=' .claude/commands/*.md | grep -v 'model'
# Expected: no output (all Task calls should have model parameter)
```

## Verifying Command Sync

Check all 4 command locations are in sync:

```bash
for cmd in 1_gofer_research 2_gofer_specify 3_gofer_plan 4_gofer_tasks 5_gofer_implement 6_gofer_validate; do
  diff .claude/commands/${cmd}.md extension/resources/claude-commands/${cmd}.md
done
# Expected: no differences
```

## Testing the Tasks.md Watcher

1. Open VSCode with Gofer extension
2. Edit a tasks.md file — change `- [ ]` to `- [X]`
3. The Specification list should auto-refresh within 2 seconds
4. Verify Harvey ball and percentage update

## Testing the Minimal Change Principle

1. Run `/5_gofer_implement` on any feature
2. Verify the "Minimal Changes Only" checklist appears before task execution
3. Verify the 7-point check is referenced for each file modification

## Key Files

| File                                            | Purpose                                   |
| ----------------------------------------------- | ----------------------------------------- |
| `.claude/agents/multi-perspective-judge.md`     | Judge/synthesis agent for all strategies  |
| `.claude/agents/implement-variant-generator.md` | Highest-impact strategy (#1)              |
| `.claude/agents/plan-architecture-diverger.md`  | Second-highest impact (#2)                |
| `.specify/memory/constitution.md`               | Principle VIII: Minimal Necessary Changes |
| `extension/src/services/EventHandlers.ts`       | Tasks.md file watcher                     |

## Running Tests

```bash
npm test
```
