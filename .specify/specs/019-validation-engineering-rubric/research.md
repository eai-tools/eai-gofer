---
date: '2026-02-10T08:30:00Z'
researcher: Claude
feature: '019-validation-engineering-rubric'
status: complete
---

# Research: Validation Engineering Rubric

## Feature Summary

Overhaul the Gofer validation phase (`6_gofer_validate.md`) to transform it from
a ceremonial gate into a rigorous engineering quality assessment. This includes:

1. A 10-category engineering quality rubric with 100-point scoring
2. 6 specialist validation agents replacing the current 3 generic agents
3. A brownfield restart loop when score < 100%
4. Mutation testing gate (Stryker), property-based testing (fast-check)
5. Mock ratio enforcement, semantic AI slop detection
6. Contract testing, hotspot risk scoring, attribution-based feedback loops

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| Validate Command | `.claude/commands/6_gofer_validate.md` | Main validation orchestration prompt — **complete rewrite** |
| Correctness Agent | `.claude/agents/validation-correctness.md` | NEW: Spec compliance and logic verification |
| Security Agent | `.claude/agents/validation-security.md` | NEW: Data-flow analysis, secret scanning |
| Performance Agent | `.claude/agents/validation-performance.md` | NEW: I/O patterns, cyclomatic complexity |
| Test Quality Agent | `.claude/agents/validation-test-quality.md` | NEW: Mutation score, mock ratio, hallucinated tests |
| Integration Agent | `.claude/agents/validation-integration.md` | NEW: Contract compliance, API boundaries |
| Standards Agent | `.claude/agents/validation-standards.md` | NEW: Constitution compliance, architecture patterns |
| Extension copies | `extension/resources/claude-commands/6_gofer_validate.md` | Mirror of command for extension bundling |
| Copilot prompt | `extension/resources/copilot-prompts/6_gofer_validate.prompt.md` | GitHub Copilot version |
| GitHub prompt | `.github/prompts/6_gofer_validate.prompt.md` | GitHub Prompts version |

### Existing Patterns to Follow

#### Pattern 1: Parallel Agent Spawning

Found in: `.claude/commands/6_gofer_validate.md:79-106` (current implementation)

The current validation already spawns 3 agents in parallel:
- Agent 1: Code Change Analyzer (`codebase-analyzer`)
- Agent 2: Test Coverage Checker (`codebase-locator`)
- Agent 3: Integration Verifier (`codebase-pattern-finder`)

These use Claude Code's Task tool with `subagent_type`. The new 6 specialist
agents will follow this exact pattern but with dedicated agent definition files
in `.claude/agents/`.

#### Pattern 2: Agent Definition Format

Found in: `.claude/agents/codebase-locator.md`, `codebase-analyzer.md`,
`codebase-pattern-finder.md`

Existing agents are markdown files that define the agent's role, tools, and
prompt structure. New validation agents will follow this format.

#### Pattern 3: Validation Report Generation

Found in: `.claude/commands/6_gofer_validate.md:270-393`

The current command generates `validation-report.md` with YAML frontmatter,
summary tables, and checklists. The new rubric scoring extends this pattern with
a numeric scoring system.

#### Pattern 4: Brownfield/Remediation Loop

Found in: `.claude/commands/0_business_scenario.md` (resume logic)

The orchestrator already detects existing artifacts and resumes from the most
advanced stage. The brownfield restart loop extends this by generating a
`remediation-report.md` and re-entering the pipeline with focused scope.

### Integration Points

1. **0_business_scenario.md**: Must understand the brownfield restart route —
   when `6_validate` fails, it generates `remediation-report.md` and signals the
   orchestrator to restart with focused scope
2. **5_gofer_implement.md**: Must be aware that implementation may be invoked
   multiple times for the same feature (remediation iterations)
3. **Constitution**: The rubric categories should reference
   `.specify/memory/constitution.md` for project-specific standards
4. **Validation findings log**: New JSONL file at
   `.specify/logs/validation-findings.jsonl` for attribution tracking

### Related Code

- `.claude/commands/6_gofer_validate.md` — Current validation command (570 lines)
- `.claude/agents/codebase-analyzer.md` — Example agent definition
- `.claude/agents/codebase-locator.md` — Example agent definition
- `.claude/agents/codebase-pattern-finder.md` — Example agent definition
- `extension/resources/claude-commands/6_gofer_validate.md` — Extension copy
- `extension/resources/copilot-prompts/6_gofer_validate.prompt.md` — Copilot copy
- `.github/prompts/6_gofer_validate.prompt.md` — GitHub Prompts copy

## Current State Assessment

### Test Suite Audit (Completed In-Session)

| Metric | Value | Assessment |
|--------|-------|------------|
| Total test files | ~90 | Appears healthy |
| Placeholder-only assertions (`expect(true).toBe(true)`) | 81 across 12 files | **Critical — tests nothing** |
| `vi.fn()` mock calls | 460 across 46 files | **Over-mocked** |
| `it.skip` / `describe.skip` | 17 across 10 files | **Hiding failures** |
| Playwright UI tests (real) | 0 | **Framework mismatch** |
| Source files with zero tests | 15+ (AutonomousDriver, OutputMonitor, IPC, SlopDetector, etc.) | **Major gaps** |
| Pre-existing test failures | 5 in agent-stop-extraction.test.ts | **Known issue** |

**Worst offenders:**
- `tests/e2e/autoCompaction.spec.ts`: 462 lines, 27 test cases, **none test anything**
- `tests/e2e/autonomous-execution.test.ts`: `test.skip(() => expect(true).toBe(true))`
- `tests/unit/autonomous/ClaudeCodeAutonomousResponder.test.ts`: 8 skipped tests

### Current Validation Gaps

The current `6_gofer_validate.md`:
- Checks: build passes, tests pass, lint passes, type check passes
- Does NOT check: mutation scores, mock ratios, test authenticity, spec traceability
- AI slop detection: basic grep for TODO/empty catch blocks only
- No brownfield restart mechanism
- No numeric scoring system

## Industry Research (Feb 2026)

### AI-Generated Code Quality Statistics

| Source | Finding |
|--------|---------|
| CodeRabbit 2026 | AI PRs contain **1.7x more issues** (10.83 vs 6.45 per PR) |
| CodeRabbit 2026 | **Logic/correctness errors** 1.75x more frequent |
| CodeRabbit 2026 | **Performance inefficiencies** (I/O) nearly **8x more often** |
| Veracode 2026 | **45% of AI-generated code** contains security flaws |
| Veracode 2026 | **62%** contain design flaws or known vulnerabilities |
| MSR '26 (Hora & Robbes) | AI agents mock **36%** of test commits vs **26%** for humans |
| MSR '26 | AI agents use 95% `mock` type vs humans' diverse mix (mock/fake/spy) |
| Qodo 2026 | **48% of engineering leaders** say quality harder to maintain with AI |
| GitHub/Register | Considering **PR kill switch** for AI slop (Feb 3, 2026) |

### Recommended Techniques & Tools

| Technique | Tool/Framework | Target Metric | Source |
|-----------|---------------|---------------|--------|
| Mutation testing | Stryker Mutator | >= 60% mutation score | Meta ACH, Qodo 2026 |
| Property-based testing | fast-check | All pure functions covered | PGS Framework, Amazon Kiro |
| Mock ratio enforcement | Custom analysis | <= 30% mock ratio | MSR '26, Addy Osmani |
| Semantic slop detection | Multi-pattern analysis | Zero red-severity findings | Cognition Devin Review |
| Contract testing | Pact / custom | All service boundaries | TestSprite 2026 |
| Hotspot risk scoring | complexity x churn x ownership | Flag high-risk modules | Qodo, CodeScene |
| Attribution tracking | JSONL logging | Feedback loop to constitution | Qodo Prediction #4 |
| Formal verification | TypeScript branded types (start) | Critical paths typed | Kleppmann Dec 2025 |

### Specialist-Agent Architecture (2026 Best Practice)

Qodo's 2026 Prediction #3: "Instead of a single 'review' step, spin up
specialized agents with focused objectives."

| Agent | Reviews | Blocks If |
|-------|---------|-----------|
| Correctness Agent | Logic, spec compliance | Any acceptance criterion unmet |
| Security Agent | Data-flow, secrets, auth | Any high-severity finding |
| Performance Agent | I/O patterns, complexity | Cyclomatic complexity > 12 |
| Test Quality Agent | Mutation score, mock ratio | Mutation score < 60% |
| Integration Agent | Contract compliance, API boundaries | Contract violation |
| Standards Agent | Constitution compliance, patterns | Deviation from research.md patterns |

### Rubric Scoring System

Based on "Rubric Is All You Need" (arxiv, 2025) and Qodo's 10 Code Quality
Metrics for 2026. Key insight: **question-specific rubrics outperform generic
approaches**.

| # | Category | Points | Pass Criteria |
|---|----------|--------|---------------|
| 1 | Functional Correctness | 15 | Every acceptance criterion has a real test that passes |
| 2 | Test Authenticity | 15 | Zero skips, zero placeholders, mutation score >= 60% |
| 3 | UI/E2E Verification | 10 | Playwright/@vscode/test-electron tests for all UI paths |
| 4 | Security Posture | 10 | Zero secrets, data-flow analysis passes |
| 5 | Integration Reality | 10 | Real dependencies tested, contract tests pass |
| 6 | Error Path Coverage | 10 | All public functions tested for failure modes |
| 7 | Architecture Compliance | 10 | File structure and patterns match plan.md |
| 8 | Performance Baseline | 5 | No sync I/O in async paths, no unbounded loops |
| 9 | Code Hygiene | 10 | Zero AI slop (TODO, redundant comments, magic numbers) |
| 10 | Specification Traceability | 5 | Every requirement maps to tests maps to code |

**Scoring rules:**
- 100/100 = PASS
- < 100 in ANY category = FAIL → brownfield restart
- Max 3 remediation iterations before human escalation

## Technology Decisions

### Decision 1: Agent Architecture

- **Choice**: 6 specialist agent markdown files in `.claude/agents/`
- **Rationale**: Follows existing pattern (3 agents already there). Claude
  Code's Task tool spawns them in parallel. Each agent has focused context →
  better results per Qodo's specialist-agent research.
- **Alternatives**: Single monolithic validation, external tool integration
- **Why not alternatives**: Monolithic loses focus; external tools add
  dependencies and break the prompt-only architecture

### Decision 2: Mutation Testing Approach

- **Choice**: Instruct the validate command to run Stryker if available, or
  guide users to install it. The rubric scores mutation testing but the command
  itself is a prompt, not code.
- **Rationale**: `6_gofer_validate.md` is a Claude Code prompt, not executable
  code. It instructs Claude to run `npx stryker run` and interpret results.
- **Alternatives**: Build Stryker into the extension, custom mutation engine
- **Why not alternatives**: Over-engineering; the prompt approach is consistent
  with all other Gofer commands

### Decision 3: Brownfield Restart Loop

- **Choice**: Generate `remediation-report.md` with failed categories, then
  re-invoke `/0_business_scenario` with remediation scope
- **Rationale**: Leverages existing orchestrator routing. No new code needed —
  the orchestrator already detects artifacts and routes.
- **Alternatives**: Custom remediation command, in-place retry
- **Why not alternatives**: Reusing the pipeline is simpler and ensures full
  artifact consistency

### Decision 4: Attribution Logging

- **Choice**: JSONL file at `.specify/logs/validation-findings.jsonl`
- **Rationale**: Consistent with existing logging patterns
  (`council-usage.jsonl`, `context-usage.jsonl`, `pipeline.jsonl`)
- **Alternatives**: SQLite database, in-memory only
- **Why not alternatives**: JSONL is human-readable, appendable, grep-friendly

## Constraints & Considerations

- **Prompt-only architecture**: All Gofer commands are markdown prompts, not
  executable code. The validation command instructs Claude what to do — it cannot
  run Stryker or fast-check directly. It instructs Claude to run them.
- **Agent tool availability**: Specialist agents use Claude Code's Task tool.
  They have access to Grep, Glob, Read, LS but NOT Edit or Write.
- **VSCode extension testing**: Real UI tests require `@vscode/test-electron`,
  not Playwright browser mode. The rubric must account for this.
- **Existing agent names**: New agents should be clearly namespaced
  (`validation-*`) to avoid confusion with existing `codebase-*` agents.
- **Mirror files**: Changes to `.claude/commands/6_gofer_validate.md` must be
  mirrored to `extension/resources/claude-commands/` and other locations.

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact |
|-----------------|-------------|--------|
| Prompt architecture | Commands are markdown, not code | Validation logic is instructional, not programmatic |
| Agent tools | Task agents have Read/Grep/Glob only | Agents analyze but don't modify code |
| Existing tests | 81 placeholders, 17 skips exist | Rubric will initially fail — that's the point |
| Mirror files | 4 copies of validate command | Must update all copies |

### Downstream Dependencies

- `/0_business_scenario` reads validation results to determine pipeline status
- `/5_gofer_implement` may be re-invoked during remediation loops
- `extension/src/autonomous/SlopDetector.ts` — existing slop detection code (no tests)
- `extension/src/autonomous/CheckpointValidator.ts` — existing checkpoint validation (no tests)

## Open Questions

- [ ] Should the rubric point weights be configurable per-project via constitution.md?
- [ ] Should remediation iterations count toward the max-3 limit per feature or per session?
- [ ] Should the UI/E2E category (10 pts) be redistributed when a feature has no UI?

## Recommendations

1. **Rewrite `6_gofer_validate.md` completely** — the current 570-line command
   gets replaced with the rubric-based approach
2. **Create 6 new agent files** in `.claude/agents/validation-*.md`
3. **Add brownfield restart logic** — generate `remediation-report.md` on
   failure, signal orchestrator to re-enter pipeline
4. **Update all mirror copies** of the validate command
5. **Do NOT modify existing test files** as part of this feature — the rubric
   will correctly identify them as failures, and that's the intended behavior

## Sources

- [CodeRabbit: AI vs Human Code Generation Report](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)
- [Veracode: AI-Generated Code Security Risks](https://www.veracode.com/blog/ai-generated-code-security-risks/)
- [MSR '26: Are Coding Agents Generating Over-Mocked Tests?](https://arxiv.org/html/2602.00409v1)
- [Qodo: 10 Code Quality Metrics for 2026](https://www.qodo.ai/blog/code-quality-metrics-2026/)
- [Qodo: 5 AI Code Review Patterns 2026](https://www.qodo.ai/blog/5-ai-code-review-pattern-predictions-in-2026/)
- [Meta: Mutation-Guided LLM-based Test Generation](https://www.infoq.com/news/2026/01/meta-llm-mutation-testing/)
- [Kleppmann: AI Will Make Formal Verification Mainstream](https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html)
- [Cognition: Devin Review](https://cognition.ai/blog/devin-review)
- [Addy Osmani: Code Review in the Age of AI](https://addyosmani.com/blog/code-review-ai/)
- [Rubric Is All You Need (arxiv)](https://arxiv.org/html/2503.23989v1)
- [iSync Evolution: AI Code Slop Crisis](https://www.isyncevolution.com/blog/ai-code-slop-crisis-vibe-coding-security-risks)
- [GitHub PR Kill Switch](https://www.theregister.com/2026/02/03/github_kill_switch_pull_requests_ai/)
