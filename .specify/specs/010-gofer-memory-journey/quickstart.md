# Quickstart: Gofer Memory and Journey System

## Prerequisites

- VSCode with SpecGofer extension installed (v4.5.0+)
- Claude Code CLI configured
- Node.js 20.x LTS
- TypeScript 5.7.2+

## Setup

1. **Create memory storage directory**:

   ```bash
   mkdir -p .specify/memory/memory-notes
   ```

2. **Initialize memory storage** (if not exists):

   ```bash
   echo "[]" > .specify/memory/agentic-memories.json
   touch .specify/memory/memory-log.jsonl
   ```

3. **Verify extension is updated**:
   - Open VSCode Command Palette
   - Run "SpecGofer: Check for Updates"

## Testing the Feature

### 1. Agentic Memory System

**Manual Testing**:

1. Start a coding session with Claude Code
2. Complete a task that learns a pattern
3. Verify memory stored: `cat .specify/memory/agentic-memories.json`
4. Start a new session
5. Perform similar task - verify pattern is applied

**Expected Result**:

- Memory appears in `agentic-memories.json` with citations
- Priority index increments on use
- Memory note created in `memory-notes/`

### 2. Interactive Journey Confirmation

**Manual Testing**:

1. Run `/0_business_scenario` with a feature involving user interaction
2. System should prompt: "Confirm the customer journey"
3. Review actors and steps presented
4. Modify or confirm journey

**Expected Result**:

- AskUserQuestion prompt appears with journey details
- Journey saved to `.specify/specs/{feature}/journeys/base-journey.md`

### 3. Journey Variant Generation

**Manual Testing**:

1. Complete journey confirmation
2. Run `/1_gofer_research`
3. Check variant generation output

**Expected Result**:

- Random 10-50 variants generated
- Variants span 10 industries
- Stored in `.specify/specs/{feature}/journeys/variants/`

### 4. Sequence Diagram Options

**Manual Testing**:

1. Complete journey confirmation
2. Run `/2_gofer_specify`
3. Review 5 sequence diagram options
4. Select preferred option

**Expected Result**:

- 5 options generated (Minimal → Innovative)
- Each has Mermaid diagram, scores, effort
- Selected option saved to `sequence-diagrams/selected-option.md`

### Automated Tests

```bash
# Run all memory system tests
npm test -- tests/unit/autonomous/memory.test.ts

# Run agentic memory tests specifically
npm test -- tests/unit/autonomous/agenticMemory.test.ts

# Run integration tests
npm test -- tests/integration/gofer-pipeline.test.ts
```

## Key Files

| File                                            | Purpose                                   |
| ----------------------------------------------- | ----------------------------------------- |
| `extension/src/autonomous/memory.ts`            | Memory interfaces including AgenticMemory |
| `extension/src/autonomous/MemoryManager.ts`     | Memory CRUD with priority handling        |
| `extension/src/autonomous/ContextBuilder.ts`    | Context injection with priority sorting   |
| `.github/prompts/0_business_scenario.prompt.md` | Journey confirmation step                 |
| `.github/prompts/1_gofer_research.prompt.md`    | Variant generation                        |
| `.github/prompts/2_gofer_specify.prompt.md`     | Sequence diagram options                  |
| `.specify/memory/agentic-memories.json`         | Project-wide memory storage               |
| `.specify/memory/memory-log.jsonl`              | Memory operation log                      |

## Common Issues

### Issue 1: Memory Not Persisting

**Problem**: Memories not saved between sessions **Solution**:

- Ensure `.specify/memory/` directory exists with write permissions
- Check `agentic-memories.json` is valid JSON (not corrupted)
- Verify MemoryManager is initialized before use

### Issue 2: Priority Index Not Incrementing

**Problem**: Priority stays at 0 despite usage **Solution**:

- Verify memory is used in an actual decision (not just retrieved)
- Check `decisionUseCount` vs `usedCount` - they track different things
- Retrieval for context injection does NOT increment priority

### Issue 3: Citation Verification Failing

**Problem**: All citations marked as unverified **Solution**:

- Ensure file paths are relative to project root
- Check if source files have been modified (hash mismatch)
- Clear verification cache and retry

### Issue 4: Journey Confirmation Not Appearing

**Problem**: /0_business_scenario skips journey step **Solution**:

- Feature must involve user interaction to trigger journey
- Check prompt file has journey confirmation section
- Ensure AskUserQuestion tool is available

### Issue 5: Variant Count Not Random

**Problem**: Always getting same number of variants **Solution**:

- Random is calculated per invocation, not cached
- Check prompt file has `random(10, 50)` logic
- Verify no hardcoded count override

## Verification Checklist

- [ ] Memory storage directory exists
- [ ] Memory JSON file is valid
- [ ] Extension is v4.5.0 or later
- [ ] Gofer prompts have been updated
- [ ] Journey confirmation appears in pipeline
- [ ] Variants generate across industries
- [ ] Sequence diagram options span spectrum
- [ ] Priority index increments correctly
