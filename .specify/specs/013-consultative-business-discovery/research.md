---
date: '2026-01-25T08:45:00Z'
researcher: Claude
feature: Consultative Business Discovery
status: complete
---

# Research: Consultative Business Discovery

## Feature Summary

Enhance `/0_business_scenario` to transform it from a simple routing command
into a consultative discovery experience. The AI agent will ask deeper questions
about customer journey, user segments, competitive landscape, value proposition,
and success metrics before routing to the Gofer pipeline. All discovery findings
will be persisted programmatically using the memory system.

### Key Requirements

1. **Target Users**: Product Managers first (non-technical), with adaptive
   suggestions for technical users
2. **Journey Stages**: Problem Discovery → User Segmentation → Competitive
   Landscape → Value Proposition
3. **Metrics**: Start with Outcome metrics, cover all categories with AI
   recommendations
4. **Depth**: Adaptive - start Balanced (3-5 questions), go deeper when
   uncertainty or large scope detected
5. **Persistence**: Store all discovery findings in memory system for use
   throughout pipeline

## Codebase Analysis

### Where to Implement

| Component          | Location                                                     | Purpose                                         |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------- |
| Main Orchestrator  | `.claude/commands/0_business_scenario.md`                    | Add consultative discovery phase before routing |
| Discovery Storage  | `.specify/specs/{feature}/discovery.md`                      | New artifact for discovery findings             |
| Memory Integration | `extension/src/autonomous/MemoryManager.ts`                  | Store discrete facts from discovery             |
| Context Builder    | `extension/src/autonomous/ContextBuilder.ts`                 | Load discovery context into prompts             |
| Bundled Copy       | `extension/resources/claude-commands/0_business_scenario.md` | Keep in sync                                    |

### Existing Patterns to Follow

#### Pattern 1: Sequential Question Flow with Recommendations

Found in: `.claude/commands/commands/0_business_scenario.md:95-129`

```markdown
4. Sequential questioning loop (interactive):
   - Present EXACTLY ONE question at a time.
   - For multiple-choice questions:
     - Analyze all options and determine the most suitable option
     - Present your **recommended option prominently** at the top
     - Format as: `**Recommended:** Option [X] - <reasoning>`
     - Then render all options as a Markdown table:

     | Option | Description            |
     | ------ | ---------------------- |
     | A      | <Option A description> |
     | B      | <Option B description> |
     - After the table, add:
       `You can reply with the option letter, accept the recommendation by saying "yes", or provide your own short answer.`
```

Why relevant: This is the established pattern for multi-question flows with AI
recommendations and acceptance shortcuts.

#### Pattern 2: Options with Implications Table

Found in: `.claude/commands/commands/2_gofer_specify.md:139-146`

```markdown
**What we need to know**: [Specific question]

**Suggested Answers**:

| Option | Answer                    | Implications                          |
| ------ | ------------------------- | ------------------------------------- |
| A      | [First suggested answer]  | [What this means for the feature]     |
| B      | [Second suggested answer] | [What this means for the feature]     |
| Custom | Provide your own answer   | [Explain how to provide custom input] |
```

Why relevant: Shows downstream implications to help PMs understand impact of
choices.

#### Pattern 3: Ambiguity Taxonomy for Coverage

Found in: `.claude/commands/commands/0_business_scenario.md:28-79`

```markdown
Perform a structured ambiguity & coverage scan using this taxonomy:

Functional Scope & Behavior:

- Core user goals & success criteria
- Explicit out-of-scope declarations
- User roles / personas differentiation

Domain & Data Model:

- Entities, attributes, relationships ...
```

Why relevant: Provides structured categories to ensure comprehensive discovery.

#### Pattern 4: Memory Storage for User Decisions

Found in: `extension/src/autonomous/MemoryManager.ts:86-138`

```typescript
async save(input: SaveMemoryInput): Promise<Memory> {
  const memory: Memory = {
    id: uuidv4(),
    category: input.category,
    tags: input.tags || [],
    scope: input.scope,
    content: input.content,
    created: Date.now(),
    lastUsed: Date.now(),
    usedCount: 0,
    learnedFrom: input.learnedFrom || 'user_interaction',
  };
  // Validation and storage...
}
```

Why relevant: Can store discrete discovery facts as memories with
`category: 'discovery'`.

### Integration Points

1. **Before Routing**: New "Step 1.5: Consultative Discovery" phase after
   context scan, before scenario determination
2. **Memory System**: Save key decisions using `MemoryManager.save()` with
   category `'discovery'`
3. **Discovery Artifact**: Create `.specify/specs/{feature}/discovery.md` with
   structured findings
4. **Research Enhancement**: Pass discovery context to `/1_gofer_research` for
   informed exploration
5. **Spec Generation**: Load discovery findings when generating `spec.md`

### Related Code

- `.claude/commands/0_business_scenario.md:52-79` - Context scan pattern
- `.claude/commands/0_business_scenario.md:83-99` - Current scenario question
- `extension/src/autonomous/MemoryManager.ts:479-550` - Priority-based memory
  loading
- `extension/src/autonomous/ContextBuilder.ts:444-544` - Context building with
  memories
- `extension/src/autonomous/memory.ts:20-47` - Memory interface definition

## Technology Decisions

### Decision 1: Discovery Artifact Format

- **Choice**: New `discovery.md` file with YAML frontmatter + structured
  markdown sections
- **Rationale**: Consistent with existing artifacts (spec.md, research.md);
  human-readable; easy to load/parse
- **Alternatives considered**:
  - JSON file (rejected: less readable for PMs)
  - Only memory entries (rejected: lacks structure for full context)

### Decision 2: Question Flow Style

- **Choice**: Adaptive AskUserQuestion with recommendations and acceptance
  shortcuts
- **Rationale**: Matches existing clarify.md pattern; reduces friction for PMs;
  allows "yes" to accept recommendations
- **Alternatives considered**:
  - Free-form text input (rejected: too unstructured)
  - Strict numbered menus (rejected: less adaptive)

### Decision 3: Memory Integration Approach

- **Choice**: Dual storage - discovery.md for full context + discrete Memory
  entries for retrieval
- **Rationale**:
  - discovery.md provides comprehensive human-readable record
  - Memory entries enable priority-based loading and relevance scoring
- **Alternatives considered**:
  - Memory only (rejected: loses structured context)
  - File only (rejected: no smart retrieval)

### Decision 4: Adaptive Depth Mechanism

- **Choice**: Start with balanced 3-5 questions; detect uncertainty/scope to
  offer deeper exploration
- **Rationale**: Respects user's time while ensuring critical discovery happens
- **Triggers for deeper questions**:
  - User says "I'm not sure" or asks for help
  - Scope involves multiple user types or complex integrations
  - Competitive landscape is unfamiliar
- **Alternatives considered**:
  - Fixed question count (rejected: not adaptive)
  - User-selected depth (rejected: users don't know what they don't know)

## Constraints & Considerations

- **Command File Limits**: Claude commands are markdown-based prompts; complex
  logic must be well-structured
- **Context Window**: Discovery questions add to context; keep questions focused
  to avoid bloat
- **Sync Requirement**: Must update both `.claude/commands/` and
  `extension/resources/claude-commands/`
- **Backward Compatibility**: Must still work if user wants to skip discovery
  and go straight to routing

## Discovery Question Categories

### Category 1: Problem Discovery (Always Asked)

**Purpose**: Understand the pain points and current state

**Question**: "What problem are you trying to solve?"

**Example Options**: | Option | Description | Implications |
|--------|-------------|--------------| | A | Users can't find what they need
quickly | Focus on search/navigation UX | | B | Manual processes taking too much
time | Focus on automation/efficiency | | C | Data is siloed across systems |
Focus on integration/consolidation | | D | Quality/reliability issues | Focus on
testing/monitoring | | Custom | Describe your specific problem | We'll tailor
the approach |

### Category 2: User Segmentation (Always Asked)

**Purpose**: Identify who benefits and their needs

**Question**: "Who are the primary users of this feature?"

**Example Options**: | Option | Description | Implications |
|--------|-------------|--------------| | A | End customers (external) | Focus
on UX, onboarding, support | | B | Internal team members | Focus on efficiency,
integrations | | C | Developers/technical users | Focus on APIs, documentation |
| D | Business stakeholders | Focus on reporting, dashboards | | Custom |
Describe your users | We'll create appropriate personas |

### Category 3: Competitive Landscape (Suggested, can skip)

**Purpose**: Learn from existing solutions

**Question**: "How do leading companies solve this problem?"

**AI Recommendation**: Based on the problem description, suggest relevant
competitors to research.

### Category 4: Value Proposition (Always Asked)

**Purpose**: Define success criteria

**Question**: "What specific value should this deliver?"

**Example Options**: | Option | Description | Implications |
|--------|-------------|--------------| | A | Time savings (reduce X by Y%) |
Need baseline metrics, time tracking | | B | Cost reduction (save $X/month) |
Need cost analysis, ROI tracking | | C | Quality improvement (reduce errors by
Y%) | Need error tracking, quality metrics | | D | User satisfaction (increase
NPS by Y) | Need feedback collection, surveys | | Custom | Define your value
metric | We'll build appropriate tracking |

### Category 5: Success Metrics (Adaptive)

**Purpose**: Define how to measure success

**Question Flow**: Start with outcome metrics, expand based on feature type

1. **Outcome Metrics** (Default): "How will users know this feature succeeded?"
2. **Engagement Metrics** (If user-facing): "How will you measure adoption?"
3. **Business Metrics** (If revenue-impacting): "What business outcomes matter?"
4. **Quality Metrics** (If reliability-critical): "What quality standards
   apply?"

## Discovery Artifact Structure

```markdown
---
feature: [Feature Name]
created: [ISO timestamp]
discoveredBy: Claude + [User]
status: complete
---

# Business Discovery: [Feature Name]

## Problem Statement

**Pain Point**: [User's description] **Current State**: [How it's solved today]
**Impact**: [Who is affected and how much]

## Target Users

### Primary Users

- **Persona**: [Name/Role]
- **Technical Level**: [Non-technical / Technical / Mixed]
- **Key Needs**: [What they need from this feature]

### Secondary Users

- [List if applicable]

## Competitive Analysis

**Researched**: [Yes/No/Skipped] **Key Insights**:

- [Company A]: [How they solve it]
- [Company B]: [How they solve it]

**Differentiation Opportunity**: [What we can do better]

## Value Proposition

**Primary Value**: [Main benefit] **Quantified Goal**: [Specific metric target]

## Success Metrics

### Outcome Metrics (Primary)

- [Metric 1]: [Target]
- [Metric 2]: [Target]

### Supporting Metrics

- [Engagement/Business/Quality metrics as applicable]

## Constraints & Requirements

- [Constraint 1]
- [Constraint 2]

## Discovery Decisions

| Decision  | Choice   | Rationale |
| --------- | -------- | --------- |
| [Topic 1] | [Choice] | [Why]     |
| [Topic 2] | [Choice] | [Why]     |
```

## Memory Entries to Create

For each discovery session, create these memory entries:

```typescript
// Problem statement
{
  category: 'discovery',
  tags: ['#problem', '#feature-{id}'],
  content: 'Problem: [pain point]. Impact: [who affected].',
  learnedFrom: 'consultative_discovery'
}

// Target users
{
  category: 'discovery',
  tags: ['#users', '#personas', '#feature-{id}'],
  content: 'Primary users: [persona]. Technical level: [level]. Key needs: [needs].',
  learnedFrom: 'consultative_discovery'
}

// Value proposition
{
  category: 'discovery',
  tags: ['#value', '#metrics', '#feature-{id}'],
  content: 'Primary value: [benefit]. Success metric: [metric] target [goal].',
  learnedFrom: 'consultative_discovery'
}
```

## Open Questions

- [ ] Should discovery findings auto-populate parts of spec.md, or remain
      separate?
- [ ] How to handle re-running discovery on an existing feature (merge vs
      replace)?
- [ ] Should competitive research trigger web search automatically or require
      confirmation?

## Recommendations

1. **Add new Step 1.5** between context scan and scenario determination for
   consultative discovery
2. **Create discovery.md template** in `.specify/templates/` for consistent
   structure
3. **Implement memory persistence** using existing MemoryManager with
   `category: 'discovery'`
4. **Pass discovery context** to `/1_gofer_research` via feature directory
   artifacts
5. **Update `/2_gofer_specify`** to load discovery.md and pre-populate spec
   sections
6. **Add "Skip Discovery" option** for users who want to go straight to routing
   (backward compatibility)
7. **Implement adaptive depth detection** based on user responses and scope
   indicators

## Research Phase Enhancement

Since discovery findings inform research, the `/1_gofer_research` command
should:

1. **Load discovery.md** at start if it exists
2. **Focus research** on areas identified in discovery:
   - If competitive analysis requested, research those competitors
   - If specific technology mentioned, research that technology
   - If user personas defined, research relevant UX patterns
3. **Validate discovery assumptions** through codebase analysis
4. **Update discovery.md** if research reveals new considerations
