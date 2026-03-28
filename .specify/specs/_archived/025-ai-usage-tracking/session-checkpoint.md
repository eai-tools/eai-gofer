---
feature: AI Token Usage Tracking Panel
created: 2026-03-13T13:15:00Z
stage: 2_specify
status: paused
context_usage: 58%
last_commit: c0ab35ff9ab8ff9fd5a9781bc351dab6b781848b
branch: main
---

# Session Checkpoint: AI Token Usage Tracking Panel

## Current State

### Pipeline Progress

| Stage              | Status     | Artifact                                 |
| ------------------ | ---------- | ---------------------------------------- |
| 0_business_scenario| ✅ done    | orchestration complete                   |
| 1_gofer_research   | ✅ done    | research.md (25,952 bytes)               |
| 2_gofer_specify    | ✅ done    | spec.md (18,242 bytes)                   |
| 3_gofer_plan       | ⏸️ paused  | **NEXT STAGE** - not started             |
| 4_gofer_tasks      | pending    | -                                        |
| 5_gofer_implement  | pending    | -                                        |
| 6_gofer_validate   | pending    | -                                        |

### Active Task

- **Current Stage**: `/3_gofer_plan` was about to start when context health check triggered save
- **What Was Happening**: Specification completed successfully. Planning stage was invoked but paused due to context warning (58% usage, 117,895 tokens)
- **Next Action**: Resume with `/8_gofer_resume` then continue with `/3_gofer_plan`

### Context Health at Save

```json
{
  "status": "warning",
  "dataSource": "real",
  "totalTokens": 117895,
  "contextLimit": 200000,
  "effectiveLimit": true,
  "usagePercent": 58,
  "recommendation": "Consider running /7_gofer_save to checkpoint progress. Use sub-agents for exploration."
}
```

**Why saved**: Context at warning threshold (58%). Planning stage will load additional documents (research.md, spec.md, constitution.md) which could push past 70% critical threshold. Best practice is to checkpoint before heavy context stages.

## Code Changes

### Committed This Session

None - all work is in specification artifacts, not code yet.

### Uncommitted Changes

| File | Status | Description |
|------|--------|-------------|
| `.specify/.gofer-version` | Modified | Version metadata update (non-critical) |
| `extension/package-lock.json` | Modified | Dependency lock file update (non-critical) |
| `.specify/specs/025-ai-usage-tracking/` | New directory | Complete feature specification artifacts |
| `.specify/specs/025-ai-usage-tracking/discovery.md` | New | Business discovery findings (2,043 bytes) |
| `.specify/specs/025-ai-usage-tracking/research.md` | New | Technical research document (25,952 bytes) |
| `.specify/specs/025-ai-usage-tracking/spec.md` | New | Feature specification (18,242 bytes) |
| `.specify/specs/025-ai-usage-tracking/journeys/base-journey.md` | New | Customer journey map (confirmed) |
| `.specify/specs/025-ai-usage-tracking/checklists/requirements.md` | New | Spec quality checklist (✅ ALL PASS) |

**Commit recommendation**: These artifacts should be committed before proceeding to implementation:

```bash
git add .specify/specs/025-ai-usage-tracking/
git commit -m "spec: AI Token Usage Tracking Panel (025)

Complete specification for replacing CONTEXT WINDOW panel with AI TOKEN USAGE
section showing real-time costs across Anthropic, OpenAI, Google.

Artifacts:
- discovery.md: Business context and success metrics
- research.md: Codebase analysis and integration points
- spec.md: 4 user stories, 8 functional requirements
- journeys/base-journey.md: Confirmed customer journey
- checklists/requirements.md: Quality validation (✅ PASS)

Success criteria:
- <1s cost display latency
- 3+ provider support (Anthropic, OpenAI, Google)
- Within 1% cost accuracy vs provider invoices

Next: /3_gofer_plan to generate implementation architecture

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Files NOT to Modify (Protected)

None identified yet - will be documented in plan.md and tasks.md during planning stage.

## Context for Resumption

### Key Decisions Made

1. **External library rejection**: Research concluded to build custom integration using existing Gofer infrastructure (CostBudgetEnforcer, UsageLogger) rather than external npm packages (ai-sdk-cost-calculator, llm-token-tracker, tokentop, openusage). Rationale: openusage is a macOS app (not a library), others require middleware integration into Claude Code CLI which is out of scope.

2. **Panel architecture**: TreeDataProvider (not WebView) following existing ContextWindowProvider pattern. Hierarchical display: Time Periods → Providers → Token/Cost breakdown.

3. **Update mechanism**: Hybrid approach - FileSystemWatcher on `.specify/logs/council-usage.jsonl` for <500ms updates, with 5s polling fallback. Matches ContextHealthMonitor pattern.

4. **Panel replacement**: User request is to REPLACE CONTEXT WINDOW (not add alongside). Impact documented in spec - users lose token category breakdown. Marked for user confirmation before implementation.

5. **Provider pricing**: Consolidate duplicate pricing data from CostBudgetEnforcer and UsageLogger into shared config. Rates as of March 2026: Anthropic ($3/$15 per 1M), OpenAI ($5/$15), Google ($0.25/$0.50).

6. **Scope phasing**:
   - Phase 1-2 (MVP): Core panel with real-time updates
   - Phase 3: Enhanced tracking (all LLM calls, not just Council mode)
   - Phase 4: Optional status bar
   - Phase 5: Polish (progress bars, tooltips, export)

### Discovery Findings (From Business Context)

**Problem**: Developers can't see AI API costs/usage across providers
**Users**: Developers using Gofer extension (intermediate to advanced)
**Value**: Real-time cost awareness with <1s latency
**Metrics**:
- Cost display latency <1 second
- Provider coverage 3+ (Anthropic, OpenAI, Google minimum)
- Cost accuracy within 1% of actual provider bills

### Research Findings (From Codebase Analysis)

**Integration Points**:
1. **CostBudgetEnforcer** (`extension/src/autonomous/CostBudgetEnforcer.ts`) - Reuse pricing data, extend for per-provider breakdown
2. **UsageLogger** (`extension/src/council/UsageLogger.ts`) - Read historical data via `getUsageSummary()`
3. **MultiSessionBridgeWatcher** (`extension/src/autonomous/MultiSessionBridgeWatcher.ts`) - Detect active sessions for "Current Session" display
4. **Package.json** (`extension/package.json:284-287`) - Replace `goferContextWindow` view registration
5. **Extension.ts** (`extension/src/extension.ts:250-251`) - Replace ContextWindowProvider registration

**Patterns to Follow**:
- Status bar pattern: `ContextHealthStatusBar.ts:123-185` (event-driven updates)
- TreeView pattern: `contextWindowProvider.ts:57-231` (hierarchical data)
- EventEmitter pattern: `ContextHealthMonitor.ts:560-584` (service layer)
- FileWatcher pattern: `HookBridgeWatcher.ts:76-150` (real-time updates)

**Constraints**:
- Claude Code CLI is external (cannot modify to emit events)
- Token counts from CLI response metadata (may be missing - needs estimation fallback in Phase 3)
- Panel replacement removes CONTEXT WINDOW features (user confirmation needed)
- Session detection via MultiSessionBridgeWatcher (reliable per research)

### Specification Quality

**Validation Results** (from checklists/requirements.md):
- ✅ Content Quality: PASS
- ✅ Requirement Completeness: PASS
- ✅ Research Integration: PASS (16 findings traced)
- ✅ Discovery Integration: PASS

**Specification Coverage**:
- 4 user stories (US1-US4) with 19 total acceptance criteria
- 8 functional requirements (FR1-FR8)
- 6 success criteria with measurable targets
- 6 internal dependencies (no external npm packages)
- 10 items explicitly scoped out (charts, alerts, export, etc.)
- Research traceability matrix with 16 mappings

### Open Questions

- [ ] **Panel replacement confirmation**: User confirmed "replace" but should verify impact (lose token category breakdown)
- [ ] **Time ranges**: Spec recommends Current Session + Today + This Week. User can confirm or add "This Month"
- [ ] **Status bar default**: Spec recommends enabled by default (`gofer.aiUsage.statusBar.enabled: true`). User can confirm.

These questions are documented in spec.md but don't block planning - defaults are based on research recommendations.

### Blockers Encountered

None - all stages completed successfully without blockers.

### Gotchas Discovered

1. **openusage misconception**: User initially mentioned openusage library, but research revealed it's a macOS menu bar app, not an npm package. This discovery led to the decision to build custom integration.

2. **Context accumulation**: Research and specification stages accumulated significant context (117k tokens). This is expected for comprehensive discovery → research → spec pipeline. Checkpoint at this stage prevents planning from exceeding 70% critical threshold.

3. **Duplicate pricing data**: CostBudgetEnforcer and UsageLogger both define identical `COST_PER_1K_TOKENS`. Planning should consolidate into shared config (`extension/src/config/pricing.ts`).

## Resumption Instructions

### Quick Resume

```bash
cd /Users/douglaswross/Code/gofer
git checkout main
/8_gofer_resume
# Resume will automatically detect paused state and continue with /3_gofer_plan
```

### Manual Resume Steps

1. Read this checkpoint file
2. Commit specification artifacts:
   ```bash
   git add .specify/specs/025-ai-usage-tracking/
   git commit -m "spec: AI Token Usage Tracking Panel (025) [see commit message above]"
   ```
3. Review artifacts for context:
   - `discovery.md` - Business problem and metrics
   - `research.md` - Integration points and patterns
   - `spec.md` - Requirements and success criteria
4. Continue with `/3_gofer_plan`

### Context to Load First

**Essential for planning** (load in this order):
1. `.specify/specs/025-ai-usage-tracking/spec.md` - What to build (requirements)
2. `.specify/specs/025-ai-usage-tracking/research.md` - How to integrate (patterns and constraints)
3. `.specify/memory/constitution.md` - Project principles (if exists)

**Reference as needed**:
- `discovery.md` - Business context (already incorporated into spec)
- `journeys/base-journey.md` - Customer journey (reference for UX planning)
- `checklists/requirements.md` - Quality validation results

## Test Status

Not applicable - no code written yet. Specification artifacts only.

After planning completes, implementation will require:
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Lint passes: `npm run lint`

## Next Stage: Planning Checklist

When `/3_gofer_plan` resumes, it will:

1. **Load context**: research.md (25k), spec.md (18k), constitution.md
2. **Design architecture**: Component diagram, data flow, service layer
3. **Create data model**: `data-model.md` (if needed - minimal for this feature)
4. **Design contracts**: `contracts/` (minimal - mostly internal APIs)
5. **Generate plan**: `plan.md` with 5 implementation phases
6. **Validate coverage**: Ensure all 4 user stories and 8 FRs are covered
7. **Create quickstart**: `quickstart.md` for testing

**Expected artifacts after planning**:
- `plan.md` - Implementation phases, architecture, file structure
- `data-model.md` - AIUsageData, ProviderUsage entities (if needed)
- `contracts/internal-api.md` - AIUsageMonitor events, AIUsageProvider interface
- `quickstart.md` - How to test the panel manually

**Planning complexity**: Medium
- Architecture: Straightforward (follows existing patterns)
- Integration: Well-defined (6 integration points identified)
- New components: 3 (AIUsageProvider, AIUsageMonitor, AIUsageStatusBar)
- Reuse: High (CostBudgetEnforcer, UsageLogger, MultiSessionBridgeWatcher)

## Notes

### Why This Feature?

User's initial request referenced openusage (GitHub repo for menu bar app). After discovering it's not a library, we validated the business problem:
- Developers lack real-time visibility into AI costs across providers
- Current CONTEXT WINDOW panel doesn't show cost/usage data
- Multi-provider support needed (Claude Code uses Anthropic, OpenAI, Google)

### Why the Checkpoint?

Context health check recommended save at 58% usage (warning threshold). Planning will load additional context:
- Spec.md (~18k tokens)
- Research.md (~26k tokens)
- Constitution.md (~5-10k tokens)
- Template documents

This could push past 70% critical threshold. Best practice (from Gofer MEMORY.md) is to checkpoint before heavy stages and resume with fresh context.

### Resume Optimization

Resume session will start with:
1. This checkpoint file (~4k tokens)
2. Essential artifacts (spec + research ~44k tokens)
3. Clean conversation history

Total resume context: ~48k tokens (24% of limit) - healthy starting point for planning stage.

### Session Summary

**Completed**:
- ✅ Business discovery (4 questions, 6 decisions documented)
- ✅ Customer journey mapping (6 steps, 4 actors, confirmed)
- ✅ Codebase research (6 patterns, 5 integration points, 4 tech decisions)
- ✅ Feature specification (4 user stories, 8 FRs, 6 success criteria)
- ✅ Spec quality validation (100% pass on all categories)

**Pending**:
- ⏸️ Technical planning (architecture, data model, implementation phases)
- ⏳ Task breakdown (dependency-ordered tasks)
- ⏳ Implementation (3 new components, extend 2 existing)
- ⏳ Validation (6-agent 100-point rubric)

**Time to resume**: ~5 minutes to review checkpoint + artifacts
**Estimated time to complete planning**: ~30-45 minutes (medium complexity)
