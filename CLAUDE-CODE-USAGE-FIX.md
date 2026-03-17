# Claude Code Usage Tracking Fix

## Problem

The AI Usage Panel was showing **council-usage.jsonl data** ($16.69) instead of **actual Claude Code conversation usage**. The user never uses the council feature, but does use Claude Code, Codex, and Copilot extensively.

## Root Cause

**BUG in ClaudeCodeUsageAdapter.parseConversationFile():**

```typescript
// WRONG - Looking for usage at wrong location
if (!entry.usage) continue;
const usage = entry.usage;
```

**ACTUAL Claude Code format:**

```json
{
  "type": "assistant",
  "timestamp": "2026-03-13T03:31:01.966Z",
  "message": {
    "model": "claude-sonnet-4-5-20250929",
    "usage": {
      "input_tokens": 2,
      "cache_creation_input_tokens": 9028,
      "cache_read_input_tokens": 19413,
      "output_tokens": 1
    }
  }
}
```

Usage data is at **`entry.message.usage`**, NOT `entry.usage`.

## The Fix

### File: extension/src/autonomous/ClaudeCodeUsageAdapter.ts

**Lines 169-178** - Changed from:
```typescript
if (!entry.usage) continue;
const usage = entry.usage;
```

**To:**
```typescript
if (!entry.message?.usage) continue;
const usage = entry.message.usage;
```

## Test Results

### Before Fix
```
ClaudeCodeAdapter Parsed workspace usage
Data: { "entryCount": 0, "totalCost": 0 }
```
- Found 54 conversation files
- Parsed **0 usage entries** ❌
- Panel showed council data ($16.69) instead of Claude Code data

### After Fix

Test on single conversation file (236f5b2b-ba76-4f38-bc01-29f488a9a535.jsonl):

```
✓ SUCCESS: Claude Code conversation parsing is working!

Total lines: 2,890
Assistant entries: 1,044
With usage data: 1,044

Token usage:
  Input: 18,278
  Output: 50,948
  Cache creation: 7,341,487
  Cache read: 106,837,804
  Total: 114,248,517

Estimated cost: $22.84
```

**For all 54 conversation files**, the total will be significantly higher and will show **actual Claude Code usage**.

## How It Works (OpenUsage Pattern)

1. **ClaudeCodeUsageAdapter** reads from `~/.claude/projects/<project>/*.jsonl`
2. **Parses assistant entries** with `entry.message.usage` data
3. **Calculates costs** using Anthropic pricing (supports cache tokens)
4. **Syncs to council-usage.jsonl** with `stage: "auto-discovered-claude-code"`
5. **AIUsageMonitor** reads the combined log (council + auto-discovered)
6. **AIUsageProvider** displays in the panel

## Multi-Provider Support

The adapter detects provider from conversation metadata:

```typescript
detectProvider(entry):
  - Check entry.version for "claude" → claude-code
  - Check entry.version for "codex" → codex
  - Check entry.source for "copilot" → copilot
  - Default → claude-code (if has message.model)
```

## Next Steps

**Reload VSCode window to test**:

1. Press F1 → "Developer: Reload Window"
2. Wait ~2 minutes for auto-discovery to scan all 54 conversation files
3. Check Output → Gofer for:
   ```
   ClaudeCodeAdapter Parsed workspace usage: { entryCount: 1000+, totalCost: $XXX }
   Auto-discovered XXX Claude Code sessions
   ```
4. Open Sidebar → Gofer → AI Usage panel
5. Should now show:
   ```
   Current Session: $XXX (much larger than $16.69!)
   Today: $XXX
   This Week: $XXX
   ```

## What You'll See

The panel will now show:
- **User account** at the top (read from ~/.claude/settings.json)
- **All Projects** aggregate (scans all 39 Claude Code projects)
- **Per-period breakdowns** with provider icons
- **Actual Claude Code usage**, not council usage

The council-usage.jsonl file will now contain:
- Original 17 council entries (stage: "auto-discovered", etc.)
- NEW auto-discovered entries (stage: "auto-discovered-claude-code")
- All displayed together in the panel

## Files Modified

1. **extension/src/autonomous/ClaudeCodeUsageAdapter.ts** (lines 169-178)
   - Fixed: `entry.usage` → `entry.message.usage`
   - This was the CRITICAL bug preventing usage parsing

2. **extension/src/extension.ts** (lines 543-648)
   - Wrapped AIUsageMonitor init in try-catch for robustness
   - Added detailed logging

3. **extension/src/ui/AIUsageProvider.ts**
   - Added comprehensive logging to trace data flow
   - Added CRITICAL error if monitor not set

4. **extension/src/autonomous/UsageAdapterFactory.ts** (line 125)
   - Fixed TypeScript compilation error

## Verification Commands

```bash
# Check how many assistant entries with usage exist
grep -h '"type":"assistant"' ~/.claude/projects/-Users-douglaswross-Code-gofer/*.jsonl 2>/dev/null | \
  grep -c '"usage":'

# Check total conversation files
ls ~/.claude/projects/-Users-douglaswross-Code-gofer/*.jsonl 2>/dev/null | wc -l

# Sample one conversation's usage
grep '"type":"assistant"' ~/.claude/projects/-Users-douglaswross-Code-gofer/*.jsonl 2>/dev/null | \
  head -1 | jq '.message.usage'
```

Now the AI Usage Panel will show your **actual Claude Code usage** from conversation logs, exactly like OpenUsage!
