# Research Codebase

You are tasked with conducting comprehensive research across the codebase to
answer user questions by spawning parallel sub-agents and synthesizing their
findings.

## Initial Setup:

When this command is invoked, respond with:

```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Then wait for the user's research query.

## Steps to follow after receiving the research query:

1. **Read any directly mentioned files first:**
   - If the user mentions specific files, read them FULLY first
   - Use the Read tool WITHOUT limit/offset parameters to read entire files
   - Read these files yourself in the main context before spawning any sub-tasks

2. **Analyze and decompose the research question:**
   - Break down the user's query into composable research areas
   - Identify specific components, patterns, or concepts to investigate
   - Create a research plan using TodoWrite to track all subtasks
   - Consider which directories, files, or architectural patterns are relevant

3. **Spawn parallel sub-agent tasks for comprehensive research:**
   - Create multiple Task agents to research different aspects concurrently
   - Use specialized agents like codebase-locator, codebase-analyzer,
     pattern-finder
   - Run multiple agents in parallel when searching for different things

4. **Wait for all sub-agents to complete and synthesize findings:**
   - Wait for ALL sub-agent tasks to complete before proceeding
   - Compile all sub-agent results
   - Connect findings across different components
   - Include specific file paths and line numbers for reference
   - Highlight patterns, connections, and architectural decisions

5. **Generate research document:** Structure the document with YAML frontmatter
   followed by content:

   ```markdown
   ---
   date: [Current date and time in ISO format]
   researcher: Claude
   topic: "[User's Question/Topic]"
   tags: [research, codebase, relevant-component-names]
   status: complete
   ---

   # Research: [User's Question/Topic]

   ## Research Question

   [Original user query]

   ## Summary

   [High-level findings answering the user's question]

   ## Detailed Findings

   ### [Component/Area 1]

   - Finding with reference (file.ext:line)
   - Connection to other components
   - Implementation details

   ### [Component/Area 2]

   ...

   ## Code References

   - `path/to/file.py:123` - Description of what's there
   - `another/file.ts:45-67` - Description of the code block

   ## Architecture Insights

   [Patterns, conventions, and design decisions discovered]

   ## Open Questions

   [Any areas that need further investigation]
   ```

6. **Save and present findings:**
   - Check existing research files to determine next sequence number
   - Save to `thoughts/shared/research/NNN_topic.md` where NNN is a 3-digit
     sequential number (001, 002, etc.)
   - Present a concise summary of findings to the user
   - Include key file references for easy navigation

## LLM Council Integration (Optional)

When council mode is enabled in `.specify/memory/council-config.yaml` for stage
`research_codebase`, each parallel sub-agent task can execute across ALL
configured LLM providers simultaneously for more comprehensive research.

**Council Workflow for Research**:

1. Check `.specify/memory/council-config.yaml` for council enablement on
   `research_codebase` stage
2. If enabled, each sub-agent (codebase-locator, codebase-analyzer,
   pattern-finder) queries all configured providers in parallel
3. Collect and anonymize responses as Member A, B, C, D
4. Chairman LLM synthesizes findings from all providers, noting areas of
   consensus and divergent findings
5. If peer review is enabled, providers evaluate each other's research quality
6. Log usage metrics to `.specify/logs/council-usage.jsonl`

**Benefits**: Different LLMs may find different patterns, connections, or
interpret code differently, leading to more comprehensive research.

**Note**: Council mode significantly increases token usage. Consider enabling
only for complex research questions.

## Important notes:

- Always use parallel Task agents to maximize efficiency
- Focus on finding concrete file paths and line numbers
- Research documents should be self-contained with all necessary context
- Each sub-agent prompt should be specific and focused
- Consider cross-component connections and architectural patterns
