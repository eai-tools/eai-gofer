# Gofer Business Consultant Pipeline

## The Problem This Solves

Gofer's original pipeline (stages 1-6) is powerful engineering infrastructure.
But it assumes the user already knows what they want to build. A business
consultant doesn't start with "I need OAuth2 authentication." They start with
"Our clients are losing 30% of deals because the proposal process takes too
long."

This update adds **business validation before** the engineering pipeline and
**business communication after** it, with translation layers throughout. The
core engineering pipeline stays untouched.

---

## What Changed: Before vs After

### Before (Engineering-First Pipeline)

```
Problem → Research Code → Spec → Plan → Tasks → Code → Validate
```

The user needed to already understand:
- What feature to build
- Technical requirements
- User stories in Given-When-Then format
- Implementation options by complexity tier

### After (Business-First Pipeline)

```
Problem → Validate Problem → Research Market + Code → Options with
Business Trade-offs → Plain English Spec → Plan → Tasks (with scope
check) → Code → Validate (with assumption check) → Stakeholder Comms
```

The user only needs to describe their **business problem in plain English**.
Everything else is handled automatically.

---

## New Pipeline Stages

### Stage 0a: Problem Validation (`/0a_problem_validation`)

**What it does**: Validates the business problem before any solution design.

**New artifacts produced**:
- `problem-brief.md` — The validated problem with root cause, stakeholder
  impact, business case, and constraints
- `assumptions.md` — Living document tracking all assumptions

**New agents used**:
- `business-problem-validator` — Runs 5 Whys root cause analysis, stakeholder
  impact mapping, business case assessment
- `research-market-scanner` — Finds commercial solutions, open-source
  alternatives, and industry benchmarks

**Key interactions**:
1. User describes problem in plain English
2. Agent runs 5 Whys to find root cause
3. Agent researches market for existing solutions
4. User confirms root cause and build/buy decision
5. Business case is quantified

### Stage 2 Enhancement: Plain English Spec Summary

**What changed**: After generating the technical `spec.md`, the pipeline now
also generates `spec-summary.md` — a one-pager that non-technical stakeholders
can review.

**Contents of spec-summary.md**:
- Executive Summary (3 sentences)
- What Changes for Users (before/after table)
- Risk Assessment (business terms, not technical)
- ROI Estimate
- Decision Points for stakeholder approval
- Success Metrics

**Enhanced option selection**: The 5 implementation options now include:
- Business trade-offs (timeline, cost, risk)
- Case study framing ("This is how Amazon would approach it")
- Plain English descriptions

### Stage 4 Enhancement: Scope Creep Detection

**What changed**: Before the engineer review gate, a new `scope-creep-detector`
agent compares the current spec/tasks against the original problem brief.

**Creep score thresholds**:
- 0-10%: Healthy (proceed)
- 11-25%: Warning (logged)
- 26-50%: Alert (requires user approval)
- 51%+: Critical (halts pipeline for stakeholder review)

### Stage 6 Enhancement: Assumption Validation + Business Summary

**What changed**:
- `assumption-tracker` agent validates technical assumptions against
  implementation evidence
- Business validation summary added to validation report in plain English
- Auto-chains to stakeholder communications if problem-brief exists

### Stage 7a: Stakeholder Communications (`/7a_stakeholder_comms`)

**What it does**: Generates a complete business communications package after
validation passes.

**New artifacts produced**:
- `stakeholder-comms.md` — Release notes, demo script, change management brief
- `business-metrics.md` — Portfolio-level metrics dashboard

**New agents used**:
- `comms-writer` — Writes for business audiences (release notes, demo scripts,
  change management briefs, training outlines, metrics specs)
- `business-metrics-analyzer` — Analyzes pipeline logs for velocity, cost,
  quality, and scope health metrics
- `assumption-tracker` — Final assumption review post-implementation
- `scope-creep-detector` — Final scope analysis

---

## New Agents (6)

| Agent | Purpose | Tools |
|-------|---------|-------|
| `business-problem-validator` | 5 Whys, stakeholder impact, business case | Read, Grep, Glob, LS |
| `research-market-scanner` | Commercial solutions, open-source, build vs buy | Read, Grep, Glob, LS, WebSearch, WebFetch |
| `scope-creep-detector` | Compares spec/tasks against problem brief | Read, Grep, Glob, LS |
| `comms-writer` | Non-technical release notes, demo scripts, change mgmt | Read, Grep, Glob, LS |
| `assumption-tracker` | Tracks assumption lifecycle across pipeline | Read, Grep, Glob, LS |
| `business-metrics-analyzer` | Portfolio velocity, cost, quality metrics | Read, Grep, Glob, LS |

---

## New Templates (5)

| Template | Location | Purpose |
|----------|----------|---------|
| `problem-brief-template.md` | `.specify/templates/` | Problem validation output |
| `spec-summary-template.md` | `.specify/templates/` | Business-readable spec summary |
| `assumptions-template.md` | `.specify/templates/` | Assumption register |
| `stakeholder-comms-template.md` | `.specify/templates/` | Communications package |
| `business-metrics-template.md` | `.specify/templates/` | Metrics dashboard |

---

## New Commands (2)

| Command | Description |
|---------|-------------|
| `/0a_problem_validation` | Pre-pipeline business problem validation |
| `/7a_stakeholder_comms` | Post-pipeline stakeholder communications |

---

## Modified Commands (4)

| Command | What Changed |
|---------|-------------|
| `/0_business_scenario` | New "Solve a Problem" option (Route A), "Business Metrics" option (Route H), updated pipeline diagram, updated routing |
| `/1_gofer_research` | Loads problem-brief.md and assumptions.md if they exist, validates technical assumptions, adds market landscape research |
| `/2_gofer_specify` | Generates `spec-summary.md` alongside `spec.md`, enhanced option selector with business trade-offs |
| `/4_gofer_tasks` | Scope creep detection before engineer review gate |
| `/6_gofer_validate` | Assumption validation post-implementation, business summary in validation report, auto-chains to `/7a_stakeholder_comms` |

---

## Example 1: Consultant with a Business Problem

**Scenario**: Sarah is a management consultant. Her client, a mid-size law firm,
is losing clients because their proposal process takes 2 weeks.

### What Sarah types:

```
/0_business_scenario
```

Gofer asks: "What would you like to accomplish today?"

Sarah selects: **A. Solve a Problem**

Gofer asks: "What business problem are you trying to solve?"

Sarah types: "Our client's law firm takes 2 weeks to produce proposals for new
clients. They're losing 30% of potential deals because competitors respond in
2-3 days."

### What happens automatically:

**Stage 0a — Problem Validation** (5 minutes)

The `business-problem-validator` runs 5 Whys:

```
Why 1: Why do proposals take 2 weeks?
→ Because lawyers manually research case law and draft from scratch

Why 2: Why do they draft from scratch?
→ Because there's no template library or proposal reuse system

Why 3: Why is there no template library?
→ Because each proposal is treated as unique despite 70% overlap

Why 4: Why is each treated as unique?
→ Because no one has categorized proposal types or mapped common sections

Why 5: Why hasn't anyone categorized them?
→ ROOT CAUSE: No one has analyzed historical proposals to identify patterns
```

The `research-market-scanner` finds:

```
Commercial Solutions:
- PandaDoc ($49/user/mo) — Good fit, 4/5
- Proposify ($35/user/mo) — Good fit, 3.5/5
- Qwilr ($66/user/mo) — Moderate fit, 3/5

Open Source:
- None specifically for legal proposals

Recommendation: HYBRID — Use PandaDoc for base platform, build custom
legal case-law integration
```

Sarah confirms the root cause and selects HYBRID approach.

**Artifacts created**:
- `problem-brief.md` — Validated problem with $200K/year impact estimate
- `assumptions.md` — 8 assumptions tracked (3 critical)

**Stage 1 — Research** (auto-chains)

Researches the codebase AND the PandaDoc API for integration patterns.

**Stage 2 — Specification** (auto-chains)

Generates `spec.md` (technical) AND `spec-summary.md`:

```
# Proposal Accelerator — Executive Summary

## What We're Building
An automated proposal system that categorizes templates from historical
proposals and integrates with PandaDoc for document assembly, reducing
proposal turnaround from 2 weeks to 2-3 days.

## What Changes for Users

| Who | Before | After |
|-----|--------|-------|
| Partners | 2 weeks drafting | 2-3 days review + customize |
| Associates | Manual case law research | AI-suggested precedents |
| Clients | 2-week wait | 2-3 day response |

## ROI Estimate
| Metric | Value |
|--------|-------|
| Development cost | ~$25,000 |
| Annual value | $200,000 (recovered deals) |
| Payback period | 6-8 weeks |
```

Sarah shares `spec-summary.md` with her client for approval.

5 implementation options are presented with business framing:

```
Option 2 (Efficient): "Template library with manual categorization.
Takes 1 week. Like how Stripe started — simple but effective."

Option 3 (Standard): "AI-assisted categorization with PandaDoc integration.
Takes 2-3 weeks. Like how DocuSign evolved — smart but manageable."

Option 4 (Enhanced): "Full AI proposal drafting with case-law suggestions.
Takes 4-5 weeks. Like how Harvey AI works — powerful but more complex."
```

Sarah selects Option 3.

**Stages 3-6** proceed as normal (plan → tasks → implement → validate)

During Stage 4, the scope creep detector runs and confirms 5% creep (Healthy).
During Stage 6, assumptions are validated:
- "PandaDoc API supports template creation" → VALIDATED
- "70% of proposals have common sections" → UNVALIDATED (needs data)
- "Lawyers will adopt the tool" → UNVALIDATED (needs change management)

**Stage 7a — Stakeholder Communications** (auto-chains after validation)

Generates `stakeholder-comms.md`:

```
## Demo Script (5 minutes)

Step 1: Show the template library (30s)
"Notice how 47 templates were auto-generated from your last 2 years
of proposals. Each one is categorized by practice area."

Step 2: Start a new proposal (60s)
"I'll select 'Corporate M&A' and the system pre-fills 70% of the
proposal from templates. Previously this took 3 days of drafting."

Step 3: Show AI case-law suggestions (60s)
"The system suggests relevant precedents from your firm's history.
Your associates used to spend 2 days on this research."

Step 4: Export to PandaDoc (60s)
"One click sends it to PandaDoc where your client signs digitally.
Total time: 2 hours instead of 2 weeks."
```

Sarah uses this demo script to present to her client's partners.

---

## Example 2: Consultant Solving an Internal Operations Problem

**Scenario**: Marcus is an operations consultant. His client, a logistics
company, has warehouse staff spending 3 hours/day on manual inventory counts
that are 85% accurate.

### What Marcus types:

```
/0_business_scenario
```

Selects: **A. Solve a Problem**

Types: "Warehouse staff spend 3 hours per day on manual inventory counts.
The counts are only 85% accurate, leading to stockouts and overstocking
that cost $500K/year."

### What happens automatically:

**Stage 0a — Problem Validation**

5 Whys analysis:

```
Why 1: Why spend 3 hours on manual counts?
→ No automated inventory tracking system

Why 2: Why no automated system?
→ Existing WMS doesn't integrate with physical stock locations

Why 3: Why doesn't WMS integrate?
→ Stock locations aren't digitized — paper-based bin system

Why 4: Why paper-based?
→ Warehouse layout changes frequently, nobody updates digital maps

Why 5: Why frequent layout changes?
→ ROOT CAUSE: No standardized warehouse zone system — ad-hoc organization
```

Market research finds:

```
Commercial Solutions:
- NetSuite WMS ($999/mo) — Overkill for this use case, 2/5 fit
- Fishbowl ($349/mo) — Good fit, 4/5
- inFlow ($89/mo) — Basic but sufficient, 3.5/5

Recommendation: BUY — Fishbowl covers 90% of needs. Build a small
zone standardization module on top.
```

**Key insight from market research**: The root cause (no standardized zones)
means even buying software won't fully solve the problem. A **process change**
(standardizing zones) is needed FIRST, then software supports it.

Problem brief recommends: "CONDITIONAL — Implement zone standardization
process first (2 weeks, no code needed), then deploy Fishbowl with custom
zone integration."

Marcus's `spec-summary.md` includes:

```
## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Staff resist new process | High | High | Phase rollout with champions |
| Fishbowl doesn't fit edge cases | Medium | Medium | 30-day trial first |
| Layout changes break zones | Medium | Low | Quarterly zone review process |

## Key Assumptions

1. Warehouse staff can learn Fishbowl in 2 days — UNVALIDATED
2. Zone standardization reduces count time by 60% — UNVALIDATED
3. Fishbowl API supports custom zone fields — VALIDATED (confirmed in docs)
```

**Stage 4 — Scope creep detected at 15%** (Warning)

The scope creep detector flags:

```
Warning: Task T015 "Add predictive restocking suggestions" is not traceable
to the original problem (inventory count accuracy). This appears to be scope
creep from the "Enhanced" option tier, but Option 2 was selected.
```

Marcus is informed and decides to remove T015 (saves 2 days).

**Stage 7a — Stakeholder Communications**

The change management brief is particularly important here:

```
## Change Management Brief

Impact Level: HIGH
Users Affected: 12 warehouse staff, 3 supervisors

### Rollout Recommendation

Phase 1: Zone standardization (Week 1-2)
  - No software changes
  - Physical reorganization + labeling
  - Success: All zones labeled and documented

Phase 2: Fishbowl pilot (Week 3-4)
  - 3 staff members trial the system
  - Success: Count accuracy > 95%, time < 1 hour

Phase 3: Full rollout (Week 5-6)
  - All staff on Fishbowl
  - Paper counts as backup for 2 weeks
  - Success: Zero stockouts attributed to count errors

### Communication Timeline

| When | What | Audience | Channel |
|------|------|----------|---------|
| Week -2 | "We're improving inventory" | All warehouse staff | Team meeting |
| Week -1 | Zone standardization training | All staff | Hands-on workshop |
| Week 1 | Fishbowl introduction | Pilot group | 1-on-1 training |
| Week 3 | Pilot results sharing | All staff | Team meeting |
| Week 5 | Full rollout kickoff | All staff | Workshop + guide |
```

The `business-metrics.md` shows:

```
## Portfolio Status

| Feature | Stage | Status | Days | Risk |
|---------|-------|--------|------|------|
| Proposal Accelerator | Complete | Deployed | 18 | Low |
| Inventory Zone System | Implementing | On Track | 5 | Medium |

## Business Impact Summary

| Feature | Problem Solved | Est. Annual Value |
|---------|---------------|-------------------|
| Proposal Accelerator | 2-week proposal cycle | $200,000 |
| Inventory Zone System | 85% count accuracy | $500,000 |

Total estimated annual value delivered: $700,000
```

---

## How the Orchestrator Routes

When `/0_business_scenario` is invoked, the user now sees these options:

| Option | Description | When to Use |
|--------|-------------|-------------|
| A. Solve a Problem | Validate a business problem end-to-end | Consultants, business users |
| B. New Feature | Build with clear requirements | Technical users who know what to build |
| C. Modify Existing | Change existing functionality | Enhancement requests |
| D. Fix a Bug | Diagnose and fix | Bug reports |
| E. Explore/Research | Understand the codebase | Learning / onboarding |
| F. Resume Work | Continue from checkpoint | Multi-session work |
| G. Setup Project | Initialize standards | New project setup |
| H. Business Metrics | View portfolio dashboard | Management reporting |

**Option A** is the new business-first path that runs the full extended pipeline:
`0a → 1 → 2 → 3 → 4 → 5 → 6 → 7a`

**Options B-G** are the existing paths, unchanged.

**Option H** is new — runs the `business-metrics-analyzer` agent to produce a
portfolio dashboard without starting any feature work.

---

## Design Rationale: Original Analysis

### What Gofer Does Well Today

Gofer's existing pipeline (stages 1-6) is excellent engineering infrastructure:

- **Structured research** with parallel agents (locator, analyzer, pattern-finder)
- **Spec-driven development** with 5 implementation options on the
  efficiency-to-innovation spectrum
- **Dependency-ordered tasks** with parallel execution opportunities
- **Validation rubric** (100 points across 10 categories)
- **Session management** for context continuity

But it assumes the user already thinks in engineering terms. The gap is between
"I have a business problem" and "I need OAuth2 with JWT refresh tokens."

### The 10 Recommendations

The following improvements were identified and prioritized:

| Priority | Item | Description | Status |
|----------|------|-------------|--------|
| 1 | Problem Validation Stage (0a) | 5 Whys root cause analysis, stakeholder impact mapping, business case quantification | IMPLEMENTED |
| 2 | Market Landscape Research | Commercial solutions, open-source alternatives, build-vs-buy analysis | IMPLEMENTED |
| 3 | Assumption Lifecycle Tracking | Track assumptions from problem statement through implementation with VALIDATED/UNVALIDATED/DISPROVEN status | IMPLEMENTED |
| 4 | Plain English Spec Summary | One-page business-readable summary of the technical spec with ROI, risk assessment, decision points | IMPLEMENTED |
| 5 | Scope Creep Detection | Compare current spec/tasks against original problem brief, flag untraceable items | IMPLEMENTED |
| 6 | Stakeholder Communications Package | Release notes, demo scripts, change management briefs, training outlines — all in business language | IMPLEMENTED |
| 7 | Guided Intake Form (VSCode Webview) | A step-by-step wizard that asks business questions and builds the problem statement | FUTURE |
| 8 | Business Metrics Dashboard | Portfolio-level velocity, cost, quality, and scope health metrics across features | IMPLEMENTED |
| 9 | Option Selector with Business Framing | Enhanced implementation options with timeline, cost, risk trade-offs and case study comparisons | IMPLEMENTED |
| 10 | "Explain Like I'm a Consultant" Mode | Constitution.md audience flag that adjusts all pipeline outputs for non-technical readers | FUTURE |

### Detailed Descriptions of Each Improvement

#### 1. Problem Validation Stage (Stage 0a) — IMPLEMENTED

Before any solution design, the pipeline now validates the business problem
itself. The `business-problem-validator` agent runs a structured 5 Whys root
cause analysis, maps stakeholder impact (who is affected, how, and how much),
and builds a quantified business case. This prevents the common consulting
anti-pattern of jumping to solutions before understanding the problem.

The output is a `problem-brief.md` that becomes the anchor document for the
entire pipeline — every subsequent stage references it to stay aligned with the
original business need.

#### 2. Market Landscape Research — IMPLEMENTED

The `research-market-scanner` agent uses WebSearch and WebFetch to find
commercial SaaS products, open-source alternatives, and industry benchmarks
relevant to the problem. It scores each option on fit, cost, and complexity,
then recommends BUILD, BUY, or HYBRID.

This is critical for consultants because the right answer is often "don't build
this — buy Fishbowl for $349/month." The pipeline now surfaces that option
before investing engineering effort.

#### 3. Assumption Lifecycle Tracking — IMPLEMENTED

Every pipeline stage generates assumptions — "the API supports this,"
"users will adopt that," "data exists in this format." Previously these
were scattered across documents and never tracked.

The `assumption-tracker` agent extracts assumptions from all artifacts,
classifies them by type (Business, Technical, Data, User, Market, Regulatory),
and tracks their status through the pipeline. At validation (Stage 6), it
cross-references assumptions against implementation evidence.

#### 4. Plain English Spec Summary — IMPLEMENTED

Technical specs are necessary for engineers but useless for stakeholder
approval. The pipeline now generates `spec-summary.md` alongside `spec.md` —
a one-page document with:

- Executive Summary (3 sentences max)
- What Changes for Users (before/after table)
- Risk Assessment (in business terms, not technical)
- ROI Estimate (development cost vs. annual value)
- Decision Points (what stakeholders need to approve)

Consultants can share this directly with clients without translation.

#### 5. Scope Creep Detection — IMPLEMENTED

The `scope-creep-detector` agent compares the current spec and tasks against
the original `problem-brief.md`. It calculates a creep score based on the
percentage of items that can't be traced back to the original problem.

Thresholds:
- 0-10%: Healthy — natural refinement
- 11-25%: Warning — logged for awareness
- 26-50%: Alert — requires explicit user approval
- 51%+: Critical — halts pipeline for stakeholder review

This prevents the common project failure mode where "add a login page" becomes
"build a complete identity management platform."

#### 6. Stakeholder Communications Package — IMPLEMENTED

After validation passes, the `comms-writer` agent generates a complete
communications package in business language:

- **Release Notes**: What changed, in language clients understand
- **Demo Script**: A 5-minute walkthrough with timing and talking points
- **Change Management Brief**: Impact assessment, rollout phases, training plan
- **Communication Timeline**: Who needs to know what, when, and how

This is the deliverable consultants actually need — they don't ship code,
they present outcomes.

#### 7. Guided Intake Form (VSCode Webview) — FUTURE ROADMAP

A step-by-step wizard in the VSCode sidebar that guides non-technical users
through problem articulation:

- "Describe what's happening now" (current state)
- "What should be happening?" (desired state)
- "Who is affected?" (stakeholders)
- "What happens if we do nothing?" (business impact)
- "What's the budget/timeline?" (constraints)

The form would build the problem statement progressively, with examples and
suggestions at each step. This is the most user-friendly approach but requires
VSCode webview development, so it's deferred to a future update.

#### 8. Business Metrics Dashboard — IMPLEMENTED

The `business-metrics-analyzer` agent reads pipeline logs to produce
portfolio-level metrics:

- **Feature Velocity**: Average days from problem to deployed solution
- **Stage Duration**: Where time is being spent in the pipeline
- **Quality Trends**: Validation scores over time
- **Cost Analysis**: Token usage and estimated costs per feature
- **Scope Health**: Historical creep scores across features

Consultants managing multiple features can track the portfolio as a whole.

#### 9. Option Selector with Business Framing — IMPLEMENTED

The existing 5 implementation options (Minimal → Innovative) now include:

- **Timeline estimate**: "Takes 1 week" vs "Takes 4-5 weeks"
- **Cost estimate**: Relative development cost
- **Risk level**: What could go wrong at this complexity level
- **Case study**: "Like how Stripe started — simple but effective"
- **Plain English description**: No technical jargon

This helps consultants make informed trade-off decisions without needing to
understand the underlying technology.

#### 10. "Explain Like I'm a Consultant" Mode — FUTURE ROADMAP

A planned enhancement to `constitution.md` that adds an `audience` flag:

```yaml
audience: business-consultant
```

When set, all pipeline outputs would be adjusted:
- Technical terms get parenthetical explanations
- Architecture diagrams include business context
- Error messages suggest business implications
- Validation reports include executive summaries

This is a cross-cutting concern that touches every pipeline stage, so it's
planned as a separate, focused update.

### The Big Picture Shift

| Dimension | Before (Engineering-First) | After (Business-First) |
|-----------|---------------------------|----------------------|
| **Entry point** | "What feature do you want?" | "What problem are you solving?" |
| **Research** | Codebase patterns only | Market landscape + codebase |
| **Options** | Technical complexity tiers | Business trade-off analysis |
| **Spec output** | Technical spec only | Technical spec + plain English summary |
| **Quality gates** | Engineering rubric | Engineering rubric + scope creep + assumptions |
| **Final output** | Validated code | Validated code + stakeholder comms package |
| **Audience** | Engineers | Consultants who work with engineers |

---

## Future Roadmap

### Guided Intake Form (VSCode Webview)

A step-by-step wizard in the VSCode sidebar that replaces free-text problem
input with a structured form. Each step includes examples, suggestions, and
validation. The form progressively builds the problem statement and feeds
directly into Stage 0a.

**Why deferred**: Requires VSCode webview development (HTML/CSS/JS panel),
which is a different technology stack from the current markdown-and-agent
approach. The current plain-text input works well enough for the initial release.

### "Explain Like I'm a Consultant" Mode

A `constitution.md` audience flag that adjusts all pipeline outputs for
non-technical readers. When enabled, every stage would:

- Replace jargon with plain language (or add parenthetical explanations)
- Include business context in architecture diagrams
- Add executive summaries to all technical documents
- Frame error messages in terms of business impact

**Why deferred**: This is a cross-cutting concern that touches every pipeline
stage and every agent prompt. It needs careful design to avoid degrading the
technical quality of outputs while adding business accessibility.

---

## Files Created/Modified in This Update

### New Files (13)

**Agents** (`.claude/agents/`):
- `business-problem-validator.md`
- `research-market-scanner.md`
- `scope-creep-detector.md`
- `comms-writer.md`
- `assumption-tracker.md`
- `business-metrics-analyzer.md`

**Commands** (`.claude/commands/`):
- `0a_problem_validation.md`
- `7a_stakeholder_comms.md`

**Templates** (`.specify/templates/`):
- `problem-brief-template.md`
- `spec-summary-template.md`
- `assumptions-template.md`
- `stakeholder-comms-template.md`
- `business-metrics-template.md`

### Modified Files (5)

**Commands** (`.claude/commands/`):
- `0_business_scenario.md` — New routes A and H, updated pipeline diagram
- `1_gofer_research.md` — Problem brief + assumptions loading, market research
- `2_gofer_specify.md` — Plain English spec summary, enhanced options
- `4_gofer_tasks.md` — Scope creep detection gate
- `6_gofer_validate.md` — Assumption validation, business summary, auto-chain to comms
