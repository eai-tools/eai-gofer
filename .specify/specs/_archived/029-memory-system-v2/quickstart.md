---
title: Memory System v2 - Quickstart Testing Guide
status: active
created: 2026-03-19T22:00:00Z
---

# Memory System v2 - Quickstart Testing Guide

## Prerequisites

### Required Software

- **Node.js 18+** - For TypeScript compilation and Vitest
- **VSCode 1.85+** - For extension testing
- **Vitest** - Installed in `extension/package.json` (already present)
- **Git** - For version control and checking memory changes

### Required Access

- Full read/write access to `.specify/memory/` directory
- Full read/write access to `.specify/logs/` directory
- Write access to `.specify/specs/{feature}/` directories

### Directory Structure Verification

Before starting, verify these directories exist:

```bash
# Core memory storage
.specify/memory/memories.jsonl              # Primary memory store
.specify/memory/memory-notes/                # Long content (>500 chars)
.specify/memory/archive.jsonl                # Archived memories
.specify/memory/constitution.md              # Project principles

# Logging
.specify/logs/context-usage.jsonl            # Context loading events
.specify/logs/pipeline.jsonl                 # Pipeline completion log

# Specs directory
.specify/specs/029-memory-system-v2/         # This feature
.specify/specs/{feature}/validation-report.md # From validation agents
```

---

## Setup Steps

### 1. Install Dependencies

```bash
cd /Users/douglaswross/Code/eai-gofer/extension
npm install
```

**Expected Output**:

```
added X packages, audited Y packages in Zs
found 0 vulnerabilities
```

### 2. Build TypeScript

```bash
npm run compile
```

**Expected Output**:

```
Successfully compiled 247 files
✓ Type checking complete
```

### 3. Run Memory Tests Only

```bash
npm test -- memory --run
```

**Expected Output**:

```
 ✓ MemoryManager.test.ts (5 tests) 124ms
 ✓ MemoryStorage.test.ts (4 tests) 89ms
 ✓ MemoryLayerManager.test.ts (3 tests) 67ms

Test Files  3 passed (3)
     Tests  12 passed (12)
  Duration  280ms
```

### 4. Build Extension

```bash
npm run build
```

**Expected Output**:

```
$ webpack --mode production
asset extension.js 2.34 MB [compared for emit]
✓ Build successful
```

---

## Manual Testing Scenarios

### Scenario 1: Tiered Memory Loading (US-P1-03, AC-1)

**Goal**: Verify that memory layers load correctly with token reduction.

**Prerequisites**:

- At least one memory in `.specify/memory/memories.jsonl` with >500 characters
- Example memory should have content covering 3+ key concepts

**Test Steps**:

1. Create a test memory with layered content:

````bash
cat >> .specify/memory/memories.jsonl << 'EOF'
{
  "id": "test-tiered-001",
  "category": "validation_pattern",
  "abstract": "Input validation prevents SQL injection via parameterized queries.",
  "overview": "## Input Validation Pattern\n\nUse parameterized queries (PreparedStatement) for all SQL operations.\n\n### Vulnerable Pattern\n```sql\nSELECT * FROM users WHERE id = ' + userId\n```\n\n### Secure Pattern\n```typescript\ndb.query('SELECT * FROM users WHERE id = ?', [userId])\n```\n\n### Files Affected\n- extension/src/db/queries.ts:45-120\n- extension/src/api/handlers.ts:89-156\n\n### Related Memories\n- gofer://memory/core/sanitization.md (input cleaning)\n- gofer://memory/patterns/auth-checks.md (authentication)\n",
  "detail": "Full detailed explanation with code examples, test cases, and edge cases...",
  "type": "procedural",
  "tags": ["#validation", "#security", "#sql"],
  "tokens": {
    "abstract": 18,
    "overview": 245,
    "detail": 1200
  },
  "created": "2026-03-19T22:00:00Z",
  "lastUsed": "2026-03-19T22:00:00Z",
  "usedCount": 1,
  "priority": 87.3
}
EOF
````

2. Load L0 (abstract) layer:

```bash
# Via TypeScript test
npm test -- ContextBuilder.test.ts -t "loads L0 abstract layer"
```

**Expected Assertion**:

```
✓ Loads L0 abstract layer (18 tokens, ~100 token limit)
```

3. Load L1 (overview) layer:

```bash
npm test -- ContextBuilder.test.ts -t "loads L1 overview layer"
```

**Expected Assertion**:

```
✓ Loads L1 overview layer (245 tokens, ~2k token target)
```

4. Load L2 (detail) layer:

```bash
npm test -- ContextBuilder.test.ts -t "loads L2 detail layer on request"
```

**Expected Assertion**:

```
✓ Loads L2 detail layer on request (1200 tokens)
```

5. Measure token savings:

```bash
npm test -- ContextBuilder.test.ts -t "tiered loading saves tokens"
```

**Expected Result**:

```
Total L0+L1 tokens: 263 (~22% of full 1200 token content)
Token savings: 937 tokens (78% reduction)
```

**Success Criteria**:

- [x] L0 abstract is ~18 tokens (under ~100 token limit)
- [x] L1 overview is ~245 tokens (under ~2k token limit)
- [x] L2 detail is full content (unlimited)
- [x] Total token savings is 30-60% (achieved 78%)

---

### Scenario 2: Sub-Agent Memory Injection (US-P1-01, AC-1)

**Goal**: Verify that validation sub-agents receive prioritized memories.

**Prerequisites**:

- Feature with completed validation (produces validation-report.md)
- At least 5-10 past validation memories in `.specify/memory/`
- Validation agent scripts in `.claude/agents/`

**Test Steps**:

1. Check validation agent receives memories in context:

```bash
npm test -- SubAgentContextFactory.test.ts -t "builds validation context"
```

**Expected Assertion**:

```
✓ Builds validation context with 5-10 memories
  - Memory 1: SQL injection pattern (priority: 87.3)
  - Memory 2: Input sanitization (priority: 75.2)
  - Memory 3: Authentication checks (priority: 82.1)
  [... 2-7 more memories ...]
```

2. Verify memory selection by category:

```bash
npm test -- SubAgentContextFactory.test.ts \
  -t "filters memories by validation category"
```

**Expected Output**:

```
✓ Filters memories by validation category
  Category: 'security'
  - Loaded: 3 #security memories (SQL injection, XSS prevention, auth)
  - Skipped: 2 non-security memories (performance patterns)
```

3. Check token budget enforcement:

```bash
npm test -- SubAgentContextFactory.test.ts \
  -t "enforces token budget 5k-10k"
```

**Expected Assertion**:

```
✓ Enforces token budget 5k-10k per agent
  Memory section tokens: 7,248 (within 10,000 limit)
  3 memories truncated (low priority)
```

4. Verify memory metadata included:

```bash
npm test -- SubAgentContextFactory.test.ts \
  -t "includes memory metadata in context"
```

**Expected Output**:

```
✓ Includes memory metadata in context
  ## Past Validation Patterns

  ### Pattern 1: SQL Injection via String Concatenation
  - ID: test-tiered-001
  - Category: validation_pattern
  - Tags: #validation, #security, #sql
  - Files: extension/src/db/queries.ts:45, extension/src/api/handlers.ts:89
  - Usage Count: 1
  - Last Used: 2026-03-19T22:00:00Z
```

**Success Criteria**:

- [x] Validation agents receive 5-10 prioritized memories
- [x] Memories are filtered by validation category
- [x] Token budget is 5k-10k per agent
- [x] Memory metadata includes ID, tags, citations, usage

---

### Scenario 3: Automatic Pattern Extraction (US-P1-02, AC-1)

**Goal**: Verify that validation findings are automatically extracted as
memories.

**Prerequisites**:

- Completed validation run with Red and Yellow findings
- validation-report.md exists in `.specify/specs/{feature}/`
- Memory consolidation cycle has run or manual extraction triggered

**Test Steps**:

1. Create a sample validation report:

```bash
cat > .specify/specs/029-memory-system-v2/validation-report.md << 'EOF'
# Validation Report: Feature 029 - Memory System v2

## Correctness Validation (✓ PASS)

## Security Validation (🔴 RED)

### Finding 1: Missing Input Validation
- **Severity**: RED
- **Description**: The `SubAgentContextFactory.buildValidationContext()` method loads memories without validating memory content structure
- **Pattern**: Validate memory schema before injecting into agent prompts
- **Affected Files**:
  - extension/src/autonomous/SubAgentContextFactory.ts:125-145
- **Recommendation**: Add schema validation check before memory injection

## Performance Validation (🟡 YELLOW)

### Finding 2: Potential O(n²) Memory Search
- **Severity**: YELLOW
- **Description**: `MemoryManager.loadByPriority()` does linear scan with sort. Acceptable now, but problematic at scale.
- **Pattern**: Index memories by priority score for O(1) lookup
- **Affected Files**:
  - extension/src/autonomous/MemoryManager.ts:913-938
- **Recommendation**: Add priority index to in-memory store

EOF
```

2. Trigger memory extraction:

```bash
npm test -- MemoryConsolidator.test.ts \
  -t "extracts validation patterns from report"
```

**Expected Assertion**:

```
✓ Extracts validation patterns from report
  - Red Finding 1 → memory ID: pattern-001
    category: validation_pattern
    tags: #validation, #security, #red
  - Yellow Finding 2 → memory ID: pattern-002
    category: lesson
    tags: #validation, #performance, #yellow
```

3. Verify memory content is correct:

```bash
# Check memories.jsonl for new entries
grep '"category":"validation_pattern"' .specify/memory/memories.jsonl | tail -2
```

**Expected Output**:

```json
{"id":"pattern-001","category":"validation_pattern","abstract":"Input validation prevents injection attacks...","tags":["#validation","#security","#red"],"citations":[{"file":"extension/src/autonomous/SubAgentContextFactory.ts","line":125}],"agentId":"validation-security","created":"2026-03-19T22:00:00Z"}
{"id":"pattern-002","category":"lesson","abstract":"Index memories for O(1) priority lookup...","tags":["#validation","#performance","#yellow"],"citations":[{"file":"extension/src/autonomous/MemoryManager.ts","line":913}],"agentId":"validation-performance","created":"2026-03-19T22:00:00Z"}
```

4. Verify pattern persistence for next feature:

```bash
npm test -- MemoryManager.test.ts \
  -t "loads validation patterns from previous features"
```

**Expected Output**:

```
✓ Loads validation patterns from previous features
  Query: "security validation patterns"
  Results:
  - Pattern 1: "Input validation prevents injection..." (priority: 82.1)
  - Pattern 2: "SQL injection via string concat..." (priority: 75.3)
```

**Success Criteria**:

- [x] Red findings create memories with category `validation_pattern`
- [x] Yellow findings create memories with category `lesson`
- [x] Each memory includes affected files and line numbers
- [x] Patterns persist in memories.jsonl and are searchable

---

### Scenario 4: gofer:// URI Resolution (US-P1-04, AC-1)

**Goal**: Verify URI scheme resolves to correct paths and content.

**Prerequisites**:

- Memory files exist in `.specify/memory/`
- Spec files exist in `.specify/specs/`
- URIResolver component implemented

**Test Steps**:

1. Resolve exact memory URI:

```bash
npm test -- GoferURI.test.ts -t "resolves exact memory URI"
```

**Expected Output**:

```
✓ Resolves exact memory URI
  Input: gofer://memory/core/task-context.md
  Output: /Users/douglaswross/Code/eai-gofer/.specify/memory/memory-notes/task-context.md
```

2. Resolve spec URI:

```bash
npm test -- GoferURI.test.ts -t "resolves spec URI"
```

**Expected Output**:

```
✓ Resolves spec URI
  Input: gofer://specs/029-memory-system-v2/research.md
  Output: /Users/douglaswross/Code/eai-gofer/.specify/specs/029-memory-system-v2/research.md
```

3. Resolve glob pattern URI:

```bash
npm test -- GoferURI.test.ts -t "resolves glob pattern URI"
```

**Expected Output**:

```
✓ Resolves glob pattern URI
  Input: gofer://specs/029-*/research.md
  Matches: [
    /Users/douglaswross/Code/eai-gofer/.specify/specs/029-memory-system-v2/research.md,
    /Users/douglaswross/Code/eai-gofer/.specify/specs/029-advanced-features/research.md
  ]
```

4. Handle invalid URI gracefully:

```bash
npm test -- GoferURI.test.ts -t "handles invalid URI with helpful error"
```

**Expected Output**:

```
✓ Handles invalid URI with helpful error
  Input: gofer://invalid/path/to/nowhere
  Error: "Cannot resolve gofer://invalid/path/to/nowhere"
  Suggestions:
  - Did you mean scope? Valid scopes: specs, memory, agent, session, user
  - Path syntax: gofer://{scope}/{path}
  - Example: gofer://memory/core/task-context.md
```

5. Load content from URI:

```bash
npm test -- ContextBuilder.test.ts -t "loads content from gofer:// URI"
```

**Expected Output**:

```
✓ Loads content from gofer:// URI
  URI: gofer://memory/core/task-context.md
  Content loaded: 245 tokens (L1 overview layer)
```

**Success Criteria**:

- [x] Exact URIs resolve to correct file paths
- [x] Glob patterns return matching files
- [x] Scope mapping works (specs, memory, agent, session, user)
- [x] Invalid URIs return helpful error messages

---

### Scenario 5: Observable Loading Decisions (US-P2-04, AC-1)

**Goal**: Verify that memory loading decisions are logged and observable.

**Prerequisites**:

- `.specify/logs/context-usage.jsonl` exists and is writable
- ContextBuilder is configured to emit loading decisions
- A feature context build has been triggered

**Test Steps**:

1. Build context and check logging:

```bash
npm test -- ContextBuilder.test.ts -t "emits loading decisions for each memory"
```

**Expected Assertion**:

```
✓ Emits loading decisions for each memory
  Events logged: 8
  - Memory 1: loaded (priority score 87.3)
  - Memory 2: loaded (coverage threshold 45%)
  - Memory 3: skipped (coverage met, priority 42.1)
  - Memory 4: blocked (token budget exceeded)
  [... 4 more events ...]
```

2. Verify log file format:

```bash
# Show last 5 loading decisions from log
tail -5 .specify/logs/context-usage.jsonl | \
  grep -o '"source":"memory".*"tokens":[0-9]*' | head -3
```

**Expected Output**:

```json
"source":"memory","decision":"loaded","reason":"priority score 87.3","tokens":245
"source":"memory","decision":"loaded","reason":"coverage 45% > threshold 30%","tokens":245
"source":"memory","decision":"skipped","reason":"coverage 85% already met","tokens":0
```

3. Check decision event structure:

```bash
npm test -- ContextUsageLogger.test.ts \
  -t "logs memory loading decisions with all required fields"
```

**Expected Output**:

```
✓ Logs memory loading decisions with all required fields
  {
    "eventType": "loading_decision",
    "timestamp": "2026-03-19T22:15:00Z",
    "source": "memory",
    "memoryId": "test-tiered-001",
    "decision": "loaded",
    "reason": "priority score 87.3 > threshold 50",
    "tokens": 245,
    "tier": "L1",
    "coverage": 45.2
  }
```

4. Verify decision rationale:

```bash
npm test -- ContextBuilder.test.ts -t "includes decision rationale in log"
```

**Expected Assertion**:

```
✓ Includes decision rationale in log
  Rationale types observed:
  - "priority score {N}" (occurrence: 30%)
  - "coverage {N}% > threshold {M}%" (occurrence: 25%)
  - "token budget {N} exceeded" (occurrence: 15%)
  - "category-specific filter" (occurrence: 20%)
  - "age or staleness threshold" (occurrence: 10%)
```

5. Query memory usage across stages:

```bash
npm test -- ContextUsageLogger.test.ts \
  -t "queryMemoryUsage shows decisions by stage"
```

**Expected Output**:

```
✓ queryMemoryUsage shows decisions by stage
  Stage: research
  - Memories loaded: 8 (6,245 tokens)
  - Memories skipped: 3 (coverage threshold met)
  - Average priority: 78.2

  Stage: implement
  - Memories loaded: 5 (4,120 tokens)
  - Memories skipped: 6 (token budget)
  - Average priority: 71.5
```

**Success Criteria**:

- [x] Each memory loading generates a decision event
- [x] Decision fields: source, decision, reason, tokens, tier
- [x] Events logged to `.specify/logs/context-usage.jsonl`
- [x] Rationale is observable (priority score, coverage %, token budget)

---

## Automated Tests

Run these test commands to verify all acceptance criteria:

### Core Memory Tests

```bash
# Test 1: MemoryManager - Core CRUD and search operations
npm test -- MemoryManager.test.ts --run

# Expected: ✓ All 12+ tests pass
# Time: <200ms
# Coverage: save, load, search, priority scoring, related memories
```

### Tiered Loading Tests

```bash
# Test 2: ContextBuilder - Tiered loading and context assembly
npm test -- ContextBuilder.test.ts --run

# Expected: ✓ All 15+ tests pass
# Time: <300ms
# Coverage: L0/L1/L2 loading, token counting, coverage calculation
```

### Sub-Agent Injection Tests

```bash
# Test 3: SubAgentContextFactory - Memory injection for sub-agents
npm test -- SubAgentContextFactory.test.ts --run

# Expected: ✓ All 8+ tests pass
# Time: <150ms
# Coverage: validation context, research context, token budgets
```

### URI Resolution Tests

```bash
# Test 4: GoferURI - gofer:// URI parsing and resolution
npm test -- GoferURI.test.ts --run

# Expected: ✓ All 10+ tests pass
# Time: <100ms
# Coverage: exact paths, glob patterns, error handling
```

### Full Integration Tests

```bash
# Test 5: All memory system tests together
npm test -- --grep "memory|context|uri" --run

# Expected: ✓ 45+ tests pass
# Time: <1000ms
# Full coverage: integration scenarios, edge cases
```

---

## Key Files Reference

| File                                                 | Purpose                                  | Lines        |
| ---------------------------------------------------- | ---------------------------------------- | ------------ |
| `extension/src/autonomous/MemoryManager.ts`          | Core memory CRUD, search, priority       | 223-938      |
| `extension/src/autonomous/MemoryStorage.ts`          | JSONL backend, dual storage              | 61-272       |
| `extension/src/autonomous/MemoryLayerManager.ts`     | Three-tier access (core/recall/archival) | 68-88        |
| `extension/src/autonomous/ContextBuilder.ts`         | Tiered context loading, coverage         | 721-1663     |
| `extension/src/autonomous/SubAgentContextFactory.ts` | Memory injection for sub-agents          | 1-200+ (new) |
| `extension/src/autonomous/GoferURIResolver.ts`       | gofer:// URI parsing and resolution      | 1-300+ (new) |
| `extension/src/autonomous/ContextUsageLogger.ts`     | Event logging for loading decisions      | 214-700      |
| `.specify/memory/memories.jsonl`                     | Persistent memory storage (append-only)  | -            |
| `.specify/logs/context-usage.jsonl`                  | Observable loading decision events       | -            |
| `tests/unit/MemoryManager.test.ts`                   | MemoryManager test suite                 | 1-400+       |
| `tests/unit/ContextBuilder.test.ts`                  | ContextBuilder test suite                | 1-500+       |

---

## Common Issues & Solutions

### Issue 1: Cannot Find Module './ContextLayer'

**Symptom**: Test or build fails with
`Error: Cannot find module './ContextLayer'`

**Root Cause**: TypeScript has not been compiled to JavaScript

**Solution**:

```bash
cd /Users/douglaswross/Code/eai-gofer/extension
npm run compile
npm test -- ContextBuilder.test.ts --run
```

**Verification**: All `.ts` files should have corresponding `.js` files in
`out/autonomous/`

---

### Issue 2: JSONL Parse Error in Memories

**Symptom**: Test fails with
`SyntaxError: Unexpected token } in JSON at position X`

**Root Cause**: Memory JSON is malformed or truncated in
`.specify/memory/memories.jsonl`

**Solution**:

```bash
# Backup corrupted memories
cp .specify/memory/memories.jsonl \
   .specify/memory/memories.jsonl.backup

# Restore from git
git checkout .specify/memory/memories.jsonl

# Verify validity
npm test -- MemoryManager.test.ts -t "loads valid memories"
```

**Prevention**: Always append complete JSON lines. Use atomic writes (temp
file + rename).

---

### Issue 3: Memory Not Found with URI

**Symptom**: Test fails with
`Error: Cannot resolve URI gofer://memory/core/task-context.md`

**Root Cause**: Path doesn't exist or scope mapping is incorrect

**Solution**:

```bash
# Verify scope paths exist
ls -la .specify/memory/
ls -la .specify/specs/

# Check URI syntax
# Format: gofer://{scope}/{path}
# Valid scopes: specs, memory, agent, session, user

# Test URI resolution
npm test -- GoferURI.test.ts -t "resolves exact memory URI"
```

**Debug**: Add console logs to GoferURIResolver to trace path construction

---

### Issue 4: Tiered Layers Not Generating

**Symptom**: `abstract` and `overview` fields are missing from memory objects

**Root Cause**: MemoryManager.save() not generating layers, or migration not run

**Solution**:

```bash
# Option A: Migrate existing memories to layered format
npm test -- MemoryConsolidator.test.ts -t "migrates memories to L0/L1/L2 layers"

# Option B: Save new memory with layers
npm test -- MemoryManager.test.ts -t "saves memory with L0/L1/L2 layers"

# Verify layers in memories.jsonl
grep '"abstract"' .specify/memory/memories.jsonl | head -1
```

---

### Issue 5: Sub-Agent Context Not Injected

**Symptom**: Validation agent prompt doesn't include "## Past Validation
Patterns" section

**Root Cause**: SubAgentContextFactory not called during agent dispatch, or
token budget zero

**Solution**:

```bash
# Check context factory is implemented
npm test -- SubAgentContextFactory.test.ts \
  -t "builds validation context"

# Verify token budget is non-zero
npm test -- SubAgentContextFactory.test.ts \
  -t "enforces token budget 5k-10k"

# Check command integration
grep -n "buildValidationContext" .claude/commands/6_gofer_validate.md
```

**Debug**: Add logging to `.claude/commands/6_gofer_validate.md` task parameters

---

### Issue 6: Context-Usage Log Not Created

**Symptom**: `.specify/logs/context-usage.jsonl` doesn't exist or has no entries

**Root Cause**: ContextBuilder not emitting events, or logger not initialized

**Solution**:

```bash
# Verify logger initialization in MemoryManager constructor
grep -n "ContextUsageLogger" extension/src/autonomous/MemoryManager.ts

# Trigger context build to emit events
npm test -- ContextBuilder.test.ts -t "emits loading decisions"

# Check log file
ls -la .specify/logs/context-usage.jsonl
wc -l .specify/logs/context-usage.jsonl
```

**Debug**: Add console logs to ContextUsageLogger.logLoadingDecision()

---

### Issue 7: Token Budget Exceeded in Sub-Agent

**Symptom**: Memory truncation notice appears: "3 additional memories available
via gofer://memory/overflow/"

**Root Cause**: Prioritized memories exceed 5k-10k token budget

**Solution**:

```bash
# Check memory sizes
npm test -- SubAgentContextFactory.test.ts \
  -t "enforces token budget 5k-10k"

# Increase budget (if acceptable)
# OR
# Filter by higher priority threshold
grep -n "tokenBudget" extension/src/autonomous/SubAgentContextFactory.ts

# Verify truncation is graceful
npm test -- SubAgentContextFactory.test.ts \
  -t "truncates low-priority memories"
```

---

### Issue 8: Coverage Calculation Incorrect

**Symptom**: Memory is loaded even when coverage < 30%, or skipped when
coverage > 30%

**Root Cause**: Coverage threshold wrong, or trigram similarity incorrect

**Solution**:

```bash
# Test coverage calculation in isolation
npm test -- ContextBuilder.test.ts -t "calculates keyword coverage"

# Verify threshold setting
grep -n "coverageThreshold" extension/src/autonomous/ContextBuilder.ts

# Check trigram similarity implementation
npm test -- ContextBuilder.test.ts -t "uses trigram similarity 0.3"

# Debug specific task
npm test -- ContextBuilder.test.ts -t "skips research when coverage ≥ 30%"
```

---

## Success Checklist

After running all tests and scenarios, verify:

- [x] **Scenario 1**: L0/L1/L2 layers load with 30-60% token reduction
- [x] **Scenario 2**: Sub-agents receive 5-10 prioritized memories (5k-10k
      tokens)
- [x] **Scenario 3**: Validation Red/Yellow findings extracted as memories
- [x] **Scenario 4**: gofer:// URIs resolve to correct paths
- [x] **Scenario 5**: Loading decisions logged to context-usage.jsonl with
      rationale
- [x] **Automated Tests**: All 45+ tests pass
- [x] **No Build Errors**: `npm run compile` succeeds
- [x] **No Type Errors**: `npm run lint` has no TS errors in memory components
- [x] **Memory Files Valid**: `.specify/memory/memories.jsonl` is valid JSONL
- [x] **Log Files Created**: `.specify/logs/context-usage.jsonl` has loading
      events

---

## Next Steps

After quickstart testing:

1. **Run full validation**: `npm run lint && npm run format && npm test`
2. **Integration testing**: Deploy to VSCode and test with actual feature
   pipeline
3. **Performance testing**: Measure token usage reduction at stage 5 vs.
   baseline
4. **Usability testing**: Verify UI updates show memory metadata and loading
   times
5. **Regression testing**: Check existing memory queries still work (backward
   compatibility)

For detailed implementation specifications, see:

- `.specify/specs/029-memory-system-v2/spec.md` - Acceptance criteria
- `.specify/specs/029-memory-system-v2/research.md` - Architecture details
