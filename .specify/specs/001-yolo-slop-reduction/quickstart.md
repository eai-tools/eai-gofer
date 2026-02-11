# Quickstart: YOLO Slop Reduction Mode

## Prerequisites

- VSCode with Gofer extension installed
- Gofer extension activated in a workspace

## Setup

1. Open VSCode Settings (Cmd+,)
2. Search for "gofer slop"
3. Enable "Gofer: Yolo Slop Reduction: Enabled"
4. Optionally adjust "Gofer: Yolo Slop Reduction: Notify Every" (default: 10)

## Testing the Feature

### Manual Testing

1. Enable the setting
2. Open any `.ts` file in the workspace (not in `tests/` directory)
3. Add `console.log('test');` on its own line
4. Save the file (Cmd+S)
5. The `console.log` line should be removed
6. Check `.specify/logs/slop-reduction.jsonl` for the audit entry

### Automated Tests

```bash
cd /Users/douglaswross/Code/gofer
npx vitest run tests/unit/slopReducer.test.ts
```

## Key Files

| File                                       | Purpose              |
| ------------------------------------------ | -------------------- |
| `extension/src/autonomous/SlopReducer.ts`  | Auto-fix engine      |
| `extension/src/autonomous/SlopDetector.ts` | Detection (existing) |
| `extension/src/config.ts`                  | Settings access      |
| `extension/package.json`                   | Settings declaration |
| `.specify/logs/slop-reduction.jsonl`       | Audit trail          |

## Common Issues

### Slop not being fixed

**Problem**: File saved but console.log not removed **Solutions**:

- Verify `gofer.yoloSlopReduction.enabled` is `true` in settings
- Ensure the file is `.ts/.tsx/.js/.jsx` (other extensions are skipped)
- Ensure the file is NOT in a test directory
- Check that `console.log(...)` is on its own line (inline usage is not matched)

### No notification appearing

**Problem**: Fixes happening but no notification **Solution**: Notifications
appear every N fixes (default 10). Check `gofer.yoloSlopReduction.notifyEvery`
setting.
