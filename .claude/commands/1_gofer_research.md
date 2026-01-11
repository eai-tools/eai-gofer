---
description: Deep codebase and technology research for feature implementation
---

# Gofer Research

You are conducting comprehensive research to understand the codebase before
specifying a new feature. This combines deep codebase exploration with
technology research.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This is the **first stage** of the unified Gofer pipeline. Your job is to:

1. Check context health
2. Understand what the user wants to build
3. Research the codebase to find where it should be implemented
4. Identify patterns, existing code, and integration points
5. Document technology decisions and constraints

**Output**: `.specify/specs/{feature}/research.md`

---

## Step 0: Context Health Check

Before starting research, assess context window health:

```bash
.specify/scripts/bash/check-context-health.sh
```

- If **< 50%**: Proceed normally
- If **50-70%**: Consider compacting after this stage completes
- If **> 70%**: Start a new session with a handoff summary

Research is typically the heaviest context stage - monitor usage.

---

## Step 1: Get Feature Context

If no feature description provided in $ARGUMENTS:

1. Ask: **"What feature or change would you like to work on?"**
2. Wait for user response

Once you have the feature description:

1. **Generate a short name** (2-4 words) for the feature
2. Run `.specify/scripts/bash/create-new-feature.sh --json "$DESCRIPTION"` with
   `--short-name "your-short-name"` to create the feature directory
3. Parse JSON output for FEATURE_DIR and BRANCH_NAME

---

## Step 2: Spawn Parallel Research Agents

Launch these specialized agents **in parallel** using the Task tool:

### Agent 1: Codebase Locator

```
Task: subagent_type="codebase-locator"
Prompt: "Find all code related to [FEATURE AREA] in this codebase.
Identify: entry points, related files, directory structure, key classes/functions.
Focus on: [specific aspects from user's description]"
```

### Agent 2: Codebase Analyzer

```
Task: subagent_type="codebase-analyzer"
Prompt: "Analyze how [RELATED FUNCTIONALITY] is implemented in this codebase.
Explain: architecture patterns, data flow, key abstractions.
Focus on: [how similar features work]"
```

### Agent 3: Pattern Finder

```
Task: subagent_type="codebase-pattern-finder"
Prompt: "Find examples of [PATTERN TYPE] in this codebase.
Show: similar implementations we should model after.
Include: file paths, code snippets, conventions used."
```

**Run all three agents in parallel** for maximum efficiency.

---

## Step 3: Technology Research

While waiting for agents, research any technology questions:

1. **Identify unknowns** from the feature description:
   - New libraries or frameworks needed?
   - Integration patterns to research?
   - Best practices to follow?

2. **Research each unknown** (use WebSearch if needed):
   - Decision: [what to use]
   - Rationale: [why chosen]
   - Alternatives: [what else considered]

---

## Step 4: Synthesize Findings

Once all agents complete:

1. **Compile findings** from all sources
2. **Identify key integration points** in the codebase
3. **Document patterns to follow** from existing code
4. **Note constraints and considerations**

---

## Step 5: Generate Research Document

Write to `{FEATURE_DIR}/research.md`:

````markdown
---
date: [ISO timestamp]
researcher: Claude
feature: '[Feature Name]'
status: complete
---

# Research: [Feature Name]

## Feature Summary

[Brief description of what we're building]

## Codebase Analysis

### Where to Implement

| Component     | Location          | Purpose        |
| ------------- | ----------------- | -------------- |
| [Component 1] | `path/to/file.ts` | [What it does] |
| [Component 2] | `path/to/dir/`    | [What it does] |

### Existing Patterns to Follow

#### Pattern 1: [Name]

Found in: `path/to/example.ts:45-67`

```typescript
// Example code showing the pattern
```
````

Why relevant: [Explanation]

#### Pattern 2: [Name]

...

### Integration Points

1. **[Integration 1]**: How to connect with existing code
2. **[Integration 2]**: ...

### Related Code

- `path/file.ts:123` - [Description]
- `path/other.ts:45` - [Description]

## Technology Decisions

### Decision 1: [Topic]

- **Choice**: [What we'll use]
- **Rationale**: [Why]
- **Alternatives considered**: [What else]

### Decision 2: [Topic]

...

## Constraints & Considerations

- [Constraint 1]: [Impact on implementation]
- [Constraint 2]: ...

## Open Questions

- [ ] [Question needing user input]
- [ ] [Another question]

## Recommendations

1. [Key recommendation for implementation]
2. [Another recommendation]

```

---

## Step 6: Report and Continue

After saving research.md:

1. **Present summary** to user:
   - Key findings
   - Integration points identified
   - Any open questions needing input

2. **Signal completion**:
```

✓ Research complete: {FEATURE_DIR}/research.md

Key findings:

- [Finding 1]
- [Finding 2]

Ready for next stage: /2_gofer_specify

````

3. **If orchestrated by /0_business_scenario**: The orchestrator will
automatically invoke `/2_gofer_specify` next.

---

## LLM Council Integration (Optional)

When council mode is enabled in `.specify/memory/council-config.yaml` for
`research_codebase` stage:

1. Each parallel agent queries ALL configured LLM providers
2. Different LLMs may find different patterns and connections
3. Chairman synthesizes diverse findings for comprehensive research
4. Usage logged to `.specify/logs/council-usage.jsonl`

---

## Step 6.5: Brownfield/Legacy Analysis (For Existing Codebases)

When working in an existing codebase, add this section to research.md:

```markdown
## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact on Implementation |
|-----------------|-------------|--------------------------|
| Framework | [e.g., React 17 - no concurrent features] | [How this limits our approach] |
| Database | [e.g., PostgreSQL 12, existing schema] | [Schema constraints] |
| API Compatibility | [e.g., Must maintain v1 endpoints] | [Backward compatibility needs] |
| Performance | [e.g., Response time < 200ms] | [Optimization requirements] |

### Technical Debt to Avoid

The following patterns are deprecated or problematic - do NOT use:

| Pattern | Found In | Why Avoid | Use Instead |
|---------|----------|-----------|-------------|
| [Old pattern] | `path/to/file.ts` | [Reason] | [Preferred approach] |

### Areas Requiring Extra Caution

- **[Area 1]**: [Why it's fragile and what to watch for]
- **[Area 2]**: [Known issues or gotchas]

### Integration Requirements

| Existing Service | Integration Method | Notes |
|------------------|-------------------|-------|
| [Service 1] | [API/Import/Event] | [Authentication, format, etc.] |

### Downstream Dependencies

Code that depends on areas we're modifying:

- `path/to/dependent.ts:45` - [What it depends on]
- `path/to/consumer.ts:123` - [What it expects]
````

### Brownfield Checklist

Before modifying existing code:

- [ ] Understand current behavior (read and trace code flow)
- [ ] Document what must NOT change (protected boundaries)
- [ ] Identify downstream dependencies
- [ ] Add characterization tests if modifying complex logic
- [ ] Plan rollback strategy for risky changes

---

## Step 7: Observability Logging

At stage completion, log metrics:

```bash
.specify/scripts/bash/log-stage.sh 1_research --complete --tokens [N] --compactions [N]
```

This tracks:

- Stage duration
- Token usage
- Compaction events
- Quality metrics snapshot

Logs to: `.specify/logs/pipeline.jsonl`

---

## Important Notes

- **All output goes to `.specify/specs/{feature}/`** - not thoughts/shared/
- **Run agents in parallel** for efficiency
- **Include specific file paths and line numbers** for all references
- **Research should inform the specification** - focus on what helps write a
  good spec
- **Maximum 5 open questions** - make informed decisions for the rest
- **Log stage completion** for observability tracking
