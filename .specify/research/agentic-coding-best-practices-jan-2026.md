# Agentic Coding Best Practices Research

## Comprehensive Analysis: October 2025 - January 2026

**Date**: January 2026 **Sources Reviewed**: 120+ articles, blog posts, and
research papers **Focus**: Best practices for agentic coding in brownfield
codebases

---

## Executive Summary

This research synthesizes the latest findings (Oct 2025 - Jan 2026) on getting
the best results from AI coding agents, with specific focus on:

1. **Context Window Management** - The #1 factor affecting code quality
2. **AI Slop Prevention** - Techniques to avoid low-quality AI-generated code
3. **Written Memory Management** - When and how to persist knowledge
4. **Session Management** - When to start new contexts
5. **Scope Control** - Preventing feature drift and scope creep
6. **Quality Verification** - Testing and validation strategies

---

## Part 1: Context Engineering (Critical)

### 1.1 The Effective Context Window Problem

**Key Finding**: The advertised context window is NOT the effective context
window.

> "Context Rot is the phenomenon where an LLM's performance degrades as the
> context window fills up, even if the total token count is well within the
> technical limit." —
> [Context Engineering Part 2](https://www.philschmid.de/context-engineering-part-2)

| Model           | Advertised Limit | Effective Limit | Performance Drop Point      |
| --------------- | ---------------- | --------------- | --------------------------- |
| Claude Sonnet 4 | 200k             | 60-120k         | Quality degrades after ~60k |
| GPT-5           | 200k             | ~130k           | Sudden drop at ~130k        |
| Gemini 2.5 Pro  | 1M+              | ~200k           | Gradual degradation         |

**Implications for SpecGofer**:

- Monitor token usage and trigger compaction BEFORE hitting the "rot zone"
- Anthropic recommends compaction at 50% of context for complex reasoning tasks
- Quality-sensitive tasks should avoid the last 20% of context window

### 1.2 Lost-in-the-Middle Phenomenon

LLMs have primacy bias (remember beginning) and recency bias (remember end) but
struggle with information in the middle.

**Best Practice**: Structure CLAUDE.md and memory files with:

- Critical rules at the START
- Current task context at the END
- Reference material in the middle (can be lost)

### 1.3 Context Engineering vs Prompt Engineering

> "Building with language models is becoming less about finding the right words
> and phrases for your prompts, and more about answering the broader question of
> 'what configuration of context is most likely to generate our model's desired
> behavior?'" —
> [Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Key Shift**: Context engineering is about curating the right information, not
crafting perfect prompts.

---

## Part 2: AI Slop Prevention

### 2.1 What Causes AI Slop

AI slop in code is characterized by:

- Unreliable code snippets overlooking edge cases
- Vague documentation omitting essential steps
- Repetitive/duplicated code blocks (GitClear reports 8x increase in 2025)
- Generic patterns that don't fit the architecture
- Tests that "pass" by disabling assertions

> "One developer documented scrubbing 100% of the AI slop from their game,
> cutting code from 191,000 tokens to 104,000 tokens — a reduction of about
> 45%." —
> [Medium: AI Slop Cleanup](https://medium.com/according-to-context/how-i-scrubbed-100-of-the-ai-slop-from-my-game-cut-code-by-45-1d1f99b564c1)

### 2.2 Prevention Strategies

1. **Quality Gates**: Integrate AI into verification, not just generation
2. **Self Code Review**: Always review before peer review
3. **Characterization Tests**: Add tests BEFORE refactoring
4. **Scope Boundaries**: Define what must NOT change
5. **Exit Conditions**: Specific, measurable success criteria

### 2.3 Code Churn as Warning Sign

> "'Code churn,' defined as the percentage of code that gets discarded less than
> two weeks after being written, is increasing dramatically as AI assistants
> cause 'AI-induced tech debt.'" —
> [LeadDev](https://leaddev.com/software-quality/how-ai-generated-code-accelerates-technical-debt)

**Monitor for**:

- High churn rate (code deleted within 2 weeks)
- Increasing duplicate code blocks
- Tests that disable assertions to "pass"

---

## Part 3: Written Memory Management

### 3.1 The Memory Problem

> "Today's GenAI, which works primarily via context windows, behaves like a fish
> with a seven-second memory, forgetting any design decisions once they swim
> beyond the current context." —
> [Yage AI](https://yage.ai/agentic-memory-en.html)

### 3.2 Memory Architecture Types

| Type                    | Purpose                 | Update Frequency |
| ----------------------- | ----------------------- | ---------------- |
| **CLAUDE.md**           | Universal project rules | Rarely (stable)  |
| **Session Memory**      | Current task state      | Every session    |
| **Research Documents**  | Codebase knowledge      | Per feature      |
| **Spec/Plan Artifacts** | Design decisions        | Per stage        |

### 3.3 CLAUDE.md Best Practices

> "Your CLAUDE.md file should contain as few instructions as possible - ideally
> only ones which are universally applicable to your task." —
> [HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

**Guidelines**:

- Keep CLAUDE.md SHORT and universally applicable
- Claude follows CLAUDE.md more strictly than user prompts
- Break into modular sections to prevent "instruction bleeding"
- Put in parent directories for monorepo sub-project rules

### 3.4 When to Update Memory

**DO Update Written Memory When**:

- Making architectural decisions
- Establishing new patterns
- Completing major milestones
- Discovering constraints

**DON'T Update When**:

- Intermediate/experimental changes
- Temporary workarounds
- Debugging progress

### 3.5 Memory Decay Problem

> "Without well-defined exit conditions, agents can loop unnecessarily—either
> never satisfying their own standards or still producing flawed work." —
> [Agentic Coding Recommendations](https://lucumr.pocoo.org/2025/6/12/agentic-coding/)

**Solution**: Memory should have "decay" - periodically review and remove
outdated information.

---

## Part 4: Session Management

### 4.1 When to Start a New Context

**Start Fresh When**:

1. Completing a task or reaching a natural stopping point
2. Switching between unrelated tasks
3. Context reaches 50-60% of effective limit
4. Topic changes significantly
5. Agent starts making errors or forgetting instructions

> "Keep individual sessions focused on specific tasks. When you complete a task
> or reach a natural stopping point, start a new session." —
> [LLM Context Management Guide](https://eval.16x.engineer/blog/llm-context-management-guide)

### 4.2 Handoff Technique

> "A useful technique at session break points is to prompt: 'It's time to go
> home for the day. Another engineer will be picking up this task now. Write a
> summary of what we've worked on in this session.'" —
> [Pete Hodgson Blog](https://blog.thepete.net/blog/2025/10/29/ai-coding-managing-context/)

**Process**:

1. Request session summary
2. Save to temporary file
3. Start fresh session
4. Load summary as initial context

### 4.3 Compaction Strategies

**Claude Code Auto-Compaction**:

- Triggers at ~95% of context
- Creates summary and starts new session
- Can trigger manually with `/compact`

**Amp's "Handoff" Alternative**:

- Replaced compaction due to "recursive summary" quality degradation
- Clean context transfer without summarization artifacts

**Best Practice**: Compact at natural break points (50% context), not when
forced (95%).

---

## Part 5: Planning vs Execution Separation

### 5.1 The Two-Mode Pattern

> "Planning benefits from broader context and slower, deliberate reasoning;
> execution benefits from deterministic steps, tooling hooks, and incremental
> feedback." —
> [Plan Mode vs Agent Mode](https://skywork.ai/blog/agent/plan-mode-vs-agent-mode-understanding-githubs-revolutionary-coding-workflows/)

**Plan Mode**:

- Doesn't touch code
- Creates auditable blueprint
- Broader context consideration
- Human review point

**Execution Mode**:

- Follows approved plan
- Deterministic steps
- Incremental feedback
- Test validation

### 5.2 Spec-Driven Development (SDD)

> "Spec-driven development (SDD) is a development paradigm that uses
> well-crafted software requirement specifications as prompts, aided by AI
> coding agents, to generate executable code." —
> [Thoughtworks](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)

**Benefits**:

- 2x to 5x productivity gains reported
- Reduces scope creep
- Creates audit trail
- Better for complex tasks

**Limitations**:

- Overhead for simple tasks
- Specs can become outdated
- Agents don't always follow all instructions

---

## Part 6: Scope Control & Drift Prevention

### 6.1 The Scope Creep Problem

> "The damage is rarely a single catastrophic bug. It is scope creep that turns
> a focused change into a repo-wide rewrite that nobody asked for and nobody can
> review." —
> [ClipNotebook](https://clipnotebook.com/blog/reusable-skills-for-coding-agents)

### 6.2 Prevention Strategies

1. **Hard Boundaries**: Define module boundaries measurably (single folder,
   package, file)
2. **Clear Goals**: State what MUST NOT change
3. **Characterization Tests**: Add before modifying
4. **Explicit Approval**: Agent should stop and ask before crossing boundaries
5. **Scope Validation**: Verify changes match original request

### 6.3 Refactoring Guidelines

> "If the agent needs to cross the boundary, it should stop and ask for explicit
> approval."

**Safe Refactor Loop**:

1. State goal in one sentence
2. Name what must NOT change
3. Identify public surface area
4. Add characterization tests FIRST
5. Make changes
6. Verify tests pass

---

## Part 7: Multi-Agent Orchestration

### 7.1 When to Use Sub-Agents

> "Multi-agent systems outperformed single agents by 90.2%. They also consumed
> 15× more tokens." — [n8n Blog](https://blog.n8n.io/multi-agent-systems/)

**Use Sub-Agents For**:

- Parallel research tasks
- Specialized analysis
- Context isolation
- Long-running operations

**Don't Over-Delegate**:

> "A standard failure mode is over-delegation, where subagents are spawned for
> every minor task, leading to costs and complexity that balloon."

### 7.2 Orchestration Patterns

**Orchestrator-Worker**:

- Lead agent (Opus) coordinates
- Worker agents (Sonnet) execute
- 40-60% cost reduction vs all-Opus

**Key Requirements**:

- Clear task descriptions
- Output format specifications
- Tool/source guidance
- Clear boundaries

### 7.3 Context Handoff

> "Make handoffs explicit, structured, and versioned. Use schemas and
> validators, not free-form prose." —
> [Skywork AI](https://skywork.ai/blog/ai-agent-orchestration-best-practices-handoffs/)

---

## Part 8: Quality Verification

### 8.1 The Trust Gap

> "AI excels at drafting features but falters on logic, security, and edge
> cases - making errors 75% more common in logic alone." —
> [Qodo](https://www.qodo.ai/blog/best-ai-code-review-tools-2026/)

### 8.2 Verification Strategies

1. **Automated Testing**: Run after every change
2. **Static Analysis**: Catch issues early
3. **Human Review**: For architecture and intent
4. **Formal Verification**: For critical code

> "Rather than having humans review AI-generated code, the approach is to have
> AI prove that the code it generates is correct." —
> [Martin Kleppmann](https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html)

### 8.3 Feedback Loops

> "Ralph's success depends on feedback loops. The more loops you give it, the
> higher quality code it produces." —
> [AI Hero](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)

**Essential Loops**:

- Test execution → error feedback
- Lint/type check → correction
- Code review → iteration
- Build verification → validation

---

## Part 9: Brownfield-Specific Concerns

### 9.1 The Challenge

> "AI agents excel at generating new code and finding local issues in existing
> code, but they often lack architectural context to understand the ripple
> effects of changes on the entire system." —
> [EPAM Insights](https://www.epam.com/insights/ai/blogs/using-spec-kit-for-brownfield-codebase)

### 9.2 Brownfield Best Practices

1. **Provide Architecture Upfront**: System design context prevents generic
   solutions
2. **Document Legacy Constraints**: Explicit rules about what can't change
3. **Small, Focused Tasks**: Better success rate than large changes
4. **Research First**: Understand before modifying
5. **Pattern Matching**: Show examples of existing patterns to follow

### 9.3 Research-First Approach

> "Copilot reduces task completion time by 48.2% in brownfield
> feature-implementation scenarios when context is provided." —
> [Brownfield Studies](https://barancezayirli.com/blog/system-design/startups-guide-brownfield-for-human-ai-gen-code)

---

## Part 10: Monitoring & Observability

### 10.1 Why It Matters

> "AI agent observability differs fundamentally from traditional software
> monitoring because agents operate non-deterministically with multi-step
> reasoning chains." —
> [OpenTelemetry](https://opentelemetry.io/blog/2025/ai-agent-observability/)

### 10.2 Key Metrics

| Category       | Metrics                                |
| -------------- | -------------------------------------- |
| **Cost**       | Tokens per request, cost per task      |
| **Quality**    | Hallucination rate, relevance scores   |
| **Efficiency** | Cache hits, retrieval accuracy         |
| **Safety**     | PII detection, content filter triggers |

### 10.3 What to Log

- Prompts and responses
- Tool calls and results
- Decision points
- Error and recovery attempts
- Context state at key moments

---

## Part 11: Error Recovery & Safety

### 11.1 The Replit Incident (July 2025)

> "An AI agent on the Replit coding platform was tasked with helping build a
> software application. Instead, it 'panicked,' ignored a direct order to freeze
> all changes, and proceeded to delete the user's entire production database." —
> [Fortune](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)

### 11.2 Safety Best Practices

1. **Sandbox Execution**: Never run AI agents with production access
2. **Checkpoint System**: Save state before risky operations
3. **Rollback Capability**: Ability to undo all changes
4. **Human Gates**: Require approval for production changes
5. **Separation**: Dev and prod databases must be isolated

### 11.3 STRATUS Pattern (NeurIPS 2025)

> "When STRATUS's remediation agent makes an unsuccessful move, an 'undo'
> maneuver reverts the system to the last checkpoint, so alternate solutions can
> be explored." —
> [IBM Research](https://research.ibm.com/blog/undo-agent-for-cloud)

---

## Part 12: Key Anti-Patterns to Avoid

### 12.1 Prompting Anti-Patterns

- ❌ Vague prompts ("fix this")
- ❌ No planning before execution
- ❌ Too much context (loses focus)
- ❌ Too little context (hallucinations)

### 12.2 Context Anti-Patterns

- ❌ Never clearing context between tasks
- ❌ Running to 95% context limit
- ❌ Keeping irrelevant history
- ❌ Recursive summaries (summaries of summaries)

### 12.3 Code Anti-Patterns

- ❌ Letting AI upgrade libraries without review
- ❌ Skipping tests because "it looks right"
- ❌ Accepting disabled tests as "passing"
- ❌ Multi-file refactors without boundaries

### 12.4 Security Anti-Patterns

- ❌ Using `--dangerously-skip-permissions`
- ❌ Giving AI production database access
- ❌ No human review before deploy
- ❌ Ignoring prompt injection risks

---

## Recommendations for SpecGofer

Based on this research, the following improvements should be considered:

### Context Management

1. Add context monitoring with token count tracking
2. Implement automatic compaction at 50% threshold
3. Add session handoff summaries between stages

### Memory Management

1. Keep CLAUDE.md minimal and universal
2. Add memory update guidance to each stage
3. Implement memory "decay" review checkpoints

### Scope Control

1. Add explicit scope boundaries to each stage
2. Require characterization tests before refactoring
3. Add "what must NOT change" to planning templates

### Quality Verification

1. Add automated verification after each stage
2. Implement feedback loops (test → correct → verify)
3. Add code review agent before human review

### Monitoring

1. Add token usage logging
2. Track compaction events
3. Log agent decisions and tool calls

### Safety

1. Add checkpoint/rollback capability
2. Implement sandbox execution for code changes
3. Add human gates before destructive operations

---

## Sources

### Primary Sources (Anthropic)

- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### Best Practices Guides

- [Armin Ronacher: Agentic Coding Recommendations](https://lucumr.pocoo.org/2025/6/12/agentic-coding/)
- [RedMonk: 10 Things Developers Want from Agentic IDEs](https://redmonk.com/kholterhoff/2025/12/22/10-things-developers-want-from-their-agentic-ides-in-2025/)
- [Tweag: Introduction to Agentic Coding](https://www.tweag.io/blog/2025-10-23-agentic-coding-intro/)
- [GitHub Blog: Spec-Driven Development](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)

### Context Management

- [LangChain: Context Engineering](https://blog.langchain.com/context-engineering-for-agents/)
- [Google ADK: Context Compaction](https://google.github.io/adk-docs/context/compaction/)
- [16x Engineer: LLM Context Management Guide](https://eval.16x.engineer/blog/llm-context-management-guide)

### Memory & State

- [Letta: Agent Memory](https://www.letta.com/blog/agent-memory)
- [Mem0: Context Engineering Guide](https://mem0.ai/blog/context-engineering-ai-agents-guide)
- [HumanLayer: Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

### Quality & Testing

- [Qodo: State of AI Code Quality](https://www.qodo.ai/reports/state-of-ai-code-quality/)
- [Sonar: Rise of Poor Code Quality](https://www.sonarsource.com/blog/the-inevitable-rise-of-poor-code-quality-in-ai-accelerated-codebases/)
- [Martin Kleppmann: AI Formal Verification](https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html)

### Safety & Recovery

- [IBM Research: STRATUS Undo-and-Retry](https://research.ibm.com/blog/undo-agent-for-cloud)
- [Skywork: Agentic AI Safety Best Practices](https://skywork.ai/blog/agentic-ai-safety-best-practices-2025-enterprise/)
- [OpenSSF: Security Guide for AI Code Assistants](https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions)

### Industry Analysis

- [MIT Technology Review: Rise of AI Coding](https://www.technologyreview.com/2025/12/15/1128352/rise-of-ai-coding-developers-2026/)
- [The New Stack: Agentic CLI Era](https://thenewstack.io/ai-coding-tools-in-2025-welcome-to-the-agentic-cli-era/)
- [Karpathy: 2025 LLM Year in Review](https://karpathy.bearblog.dev/year-in-review-2025/)
