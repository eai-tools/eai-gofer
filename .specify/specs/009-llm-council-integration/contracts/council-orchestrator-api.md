# Council Orchestrator API Contract

**Purpose**: Define the interface for coordinating multi-provider council
sessions, including response aggregation, anonymization, and chairman synthesis.

**Contract Version**: 1.0.0 **Last Updated**: 2025-12-30

---

## CouncilOrchestrator Interface

```typescript
interface CouncilOrchestrator {
  /**
   * Load council configuration from YAML file
   */
  loadConfig(): Promise<CouncilConfig>;

  /**
   * Get all enabled and available providers
   */
  getEnabledProviders(): Promise<LLMProvider[]>;

  /**
   * Check if council mode should be used for a given stage
   */
  shouldUseCouncil(stage: string): boolean;

  /**
   * Execute a council session for an agent prompt
   * @param prompt - The agent prompt to send to all providers
   * @param agentType - Which agent triggered this (for logging)
   * @param stage - Workflow stage (for config lookup)
   * @returns Council session with synthesis, or single-provider response
   */
  dispatch(
    prompt: string,
    agentType: AgentType,
    stage: string
  ): Promise<CouncilResult>;

  /**
   * Get usage summary for cost tracking
   */
  getUsageSummary(): UsageSummary;
}

type AgentType =
  | 'codebase-locator'
  | 'codebase-analyzer'
  | 'codebase-pattern-finder';

interface CouncilResult {
  mode: 'council' | 'single';
  synthesis: string; // Final output (synthesized or single response)
  session?: CouncilSession; // Full session details (council mode only)
  singleResponse?: QueryResponse; // Provider response (single mode only)
  usage: UsageMetrics;
}

interface UsageSummary {
  totalSessions: number;
  councilSessions: number;
  singleSessions: number;
  totalCostUsd: number;
  byProvider: Record<string, { requests: number; costUsd: number }>;
}
```

---

## Configuration Loading

### Config File Location

`.specify/memory/council-config.yaml`

### Config Schema

```yaml
council:
  enabled: true # Global enable/disable
  peer_review: false # Optional peer review stage
  min_quorum: 2 # Minimum providers for valid council
  timeout: 30000 # Per-provider timeout in ms

  providers:
    anthropic:
      enabled: true
      model: claude-sonnet-4-20250514
    google:
      enabled: true
      model: gemini-2.0-flash
    xai:
      enabled: false # Disabled by default
      model: grok-3
    openai:
      enabled: false # Disabled by default
      model: gpt-4o

  stages:
    speckit_plan: council # Use council for planning
    speckit_analyze: council # Use council for analysis
    research_codebase: council # Use council for research
    validate_plan: council # Use council for validation
    implement: single # Single LLM for execution
```

### Default Config (when file not present)

```typescript
const DEFAULT_CONFIG: CouncilConfig = {
  enabled: false,
  peerReview: false,
  minQuorum: 2,
  timeout: 30000,
  providers: [
    {
      providerId: 'anthropic',
      enabled: true,
      model: 'claude-sonnet-4-20250514',
    },
  ],
  stages: {
    speckit_plan: 'single',
    speckit_analyze: 'single',
    research_codebase: 'single',
    validate_plan: 'single',
    implement: 'single',
  },
};
```

---

## Response Aggregation

### ResponseAggregator Interface

```typescript
interface ResponseAggregator {
  /**
   * Collect responses from all providers in parallel
   * @param providers - Enabled providers to query
   * @param prompt - The prompt to send
   * @param timeout - Per-provider timeout in ms
   * @returns Array of member responses (successful and failed)
   */
  collectResponses(
    providers: LLMProvider[],
    prompt: string,
    timeout: number
  ): Promise<CouncilMember[]>;

  /**
   * Anonymize responses for peer review and synthesis
   * @param members - Council members with responses
   * @returns Anonymized opinions (Member A, B, C...)
   */
  anonymize(members: CouncilMember[]): AnonymizedOpinion[];

  /**
   * Validate that minimum quorum is met
   * @param members - Council members
   * @param minQuorum - Required successful responses
   * @returns true if quorum met
   */
  validateQuorum(members: CouncilMember[], minQuorum: number): boolean;
}

interface AnonymizedOpinion {
  anonymousId: string; // "Member A", "Member B", etc.
  content: string; // Response content
  tokenCount: number; // For weighting purposes
}
```

### Parallel Collection Implementation

```typescript
async function collectResponses(
  providers: LLMProvider[],
  prompt: string,
  timeout: number
): Promise<CouncilMember[]> {
  const startTime = Date.now();

  const results = await Promise.allSettled(
    providers.map(async (provider, index) => {
      const member: CouncilMember = {
        sessionId: '', // Set by caller
        providerId: provider.id,
        anonymousId: String.fromCharCode(65 + index), // A, B, C, D
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      try {
        const response = await Promise.race([
          provider.query({
            prompt,
            maxTokens: 4096,
            temperature: 0,
          }),
          timeout(timeout),
        ]);

        member.status = 'responded';
        member.respondedAt = new Date().toISOString();
        member.firstOpinion = {
          memberId: `${member.sessionId}:${member.providerId}`,
          content: response.content,
          tokenCount: response.usage.outputTokens,
          timestamp: member.respondedAt,
        };
      } catch (error) {
        if (error.name === 'TimeoutError') {
          member.status = 'timeout';
        } else {
          member.status = 'error';
          member.errorMessage = error.message;
        }
      }

      return member;
    })
  );

  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);
}
```

---

## Peer Review Stage

### Peer Review Request Format

When peer review is enabled, each provider receives anonymized responses from
other providers:

```typescript
interface PeerReviewRequest {
  prompt: string; // Original prompt for context
  opinions: AnonymizedOpinion[]; // Other members' responses
  reviewerExcluded: string; // Reviewer's own anonymousId (excluded)
}

function buildPeerReviewPrompt(request: PeerReviewRequest): string {
  return `You are reviewing other AI assistants' responses to this prompt:

**Original Prompt:**
${request.prompt}

**Responses to Review:**
${request.opinions
  .filter((o) => o.anonymousId !== request.reviewerExcluded)
  .map((o) => `### ${o.anonymousId}:\n${o.content}`)
  .join('\n\n---\n\n')}

**Your Task:**
Rank these responses from best to worst. For each, provide:
1. A rank number (1 = best)
2. Key strengths
3. Key weaknesses
4. Brief justification for ranking

Return JSON only:
{
  "rankings": [
    {
      "memberId": "Member X",
      "rank": 1,
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1"],
      "justification": "Why this is ranked #1"
    }
  ]
}`;
}
```

### Peer Review Response Parsing

```typescript
interface PeerReviewResponse {
  rankings: {
    memberId: string;
    rank: number;
    strengths: string[];
    weaknesses: string[];
    justification: string;
  }[];
}

function parsePeerReview(
  response: QueryResponse,
  reviewerId: string,
  sessionId: string
): PeerReview[] {
  const parsed: PeerReviewResponse = JSON.parse(response.content);

  return parsed.rankings.map((r) => ({
    sessionId,
    reviewerId,
    revieweeId: r.memberId,
    rank: r.rank,
    justification: r.justification,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    timestamp: new Date().toISOString(),
  }));
}
```

---

## Chairman Synthesis

### Synthesis Request Format

The Chairman (requesting LLM, e.g., Claude Code) receives all council data:

```typescript
function buildSynthesisPrompt(
  originalPrompt: string,
  opinions: AnonymizedOpinion[],
  peerReviews?: PeerReview[]
): string {
  let prompt = `You are the Chairman of an AI Council. Multiple AI assistants have responded to this prompt:

**Original Prompt:**
${originalPrompt}

**Council Member Responses:**
${opinions.map((o) => `### ${o.anonymousId}:\n${o.content}`).join('\n\n---\n\n')}
`;

  if (peerReviews && peerReviews.length > 0) {
    prompt += `
**Peer Review Rankings:**
${formatPeerReviews(peerReviews)}
`;
  }

  prompt += `
**Your Task as Chairman:**
1. Synthesize the best insights from all council members
2. Note any conflicts between members and your resolution
3. Identify areas of consensus
4. Produce a single, unified response in the same format as the original request

**Important:**
- Do NOT reveal which member said what in your final output
- Your output should look like a normal response, not a summary of council opinions
- Use peer review rankings (if available) to weight the quality of insights`;

  return prompt;
}
```

### Synthesis Output

The Chairman's synthesis is returned directly to the workflow, appearing
identical to a single-provider response:

```typescript
interface SynthesisResult {
  content: string; // Final synthesized response
  conflictsResolved: ConflictResolution[];
  consensusPoints: string[];
  qualitySignals: QualitySignals;
}
```

---

## Dispatch Flow

### Full Council Flow

```typescript
async function dispatch(
  prompt: string,
  agentType: AgentType,
  stage: string
): Promise<CouncilResult> {
  const config = await this.loadConfig();

  // Check if council mode for this stage
  if (!config.enabled || config.stages[stage] === 'single') {
    return this.dispatchSingle(prompt);
  }

  const providers = await this.getEnabledProviders();

  // Fall back to single if not enough providers
  if (providers.length < config.minQuorum) {
    return this.dispatchSingle(prompt);
  }

  // Create session
  const session: CouncilSession = {
    id: generateUUID(),
    agentType,
    stage,
    status: 'collecting',
    prompt,
    startedAt: new Date().toISOString(),
    members: [],
    usageMetrics: {
      totalTokensInput: 0,
      totalTokensOutput: 0,
      estimatedCostUsd: 0,
      durationMs: 0,
      providerBreakdown: {},
    },
  };

  // Stage 1: Collect first opinions
  session.members = await this.aggregator.collectResponses(
    providers,
    prompt,
    config.timeout
  );

  // Validate quorum
  const successfulMembers = session.members.filter(
    (m) => m.status === 'responded'
  );
  if (successfulMembers.length < config.minQuorum) {
    session.status = 'failed';
    return this.dispatchSingle(prompt); // Fallback
  }

  // Stage 2: Optional peer review
  if (config.peerReview && successfulMembers.length >= 3) {
    session.status = 'reviewing';
    session.peerReviews = await this.collectPeerReviews(session);
  }

  // Stage 3: Chairman synthesis
  session.status = 'synthesizing';
  const opinions = this.aggregator.anonymize(successfulMembers);
  const synthesisPrompt = buildSynthesisPrompt(
    prompt,
    opinions,
    session.peerReviews
  );

  // NOTE: Chairman synthesis happens in the requesting LLM's context
  // We return the data for the Chairman (Claude Code) to synthesize
  session.synthesis = {
    sessionId: session.id,
    chairmanId: 'requesting-llm',
    content: '', // Filled by Claude Code
    conflictsResolved: [],
    consensusPoints: [],
    qualitySignals: this.calculateQualitySignals(session.peerReviews),
    timestamp: new Date().toISOString(),
  };

  session.status = 'completed';
  session.completedAt = new Date().toISOString();

  // Log usage
  await this.logUsage(session);

  return {
    mode: 'council',
    synthesis: synthesisPrompt, // Chairman will process this
    session,
    usage: session.usageMetrics,
  };
}
```

---

## Error Handling

### Graceful Degradation

```typescript
const MIN_QUORUM = 2;

async function handleProviderFailures(
  members: CouncilMember[],
  config: CouncilConfig
): Promise<'continue' | 'fallback'> {
  const successful = members.filter((m) => m.status === 'responded');

  if (successful.length >= config.minQuorum) {
    // Log warnings for failed providers
    members
      .filter((m) => m.status !== 'responded')
      .forEach((m) => {
        log.warn({
          event: 'council_member_failed',
          providerId: m.providerId,
          status: m.status,
          error: m.errorMessage,
        });
      });
    return 'continue';
  }

  log.warn({
    event: 'council_quorum_not_met',
    successful: successful.length,
    required: config.minQuorum,
    falling_back: 'single_provider',
  });

  return 'fallback';
}
```

### Timeout Handling

```typescript
function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(`Timeout after ${ms}ms`);
      error.name = 'TimeoutError';
      reject(error);
    }, ms);
  });
}
```

---

## Progress Reporting

### VSCode Progress Integration

```typescript
async function dispatchWithProgress(
  prompt: string,
  agentType: AgentType,
  stage: string
): Promise<CouncilResult> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'LLM Council',
      cancellable: false,
    },
    async (progress) => {
      const config = await this.loadConfig();
      const providers = await this.getEnabledProviders();

      progress.report({
        message: `Querying ${providers.length} providers...`,
        increment: 0,
      });

      // Collect responses
      const members = await this.collectWithProgress(
        providers,
        prompt,
        progress
      );

      if (config.peerReview) {
        progress.report({
          message: 'Peer review in progress...',
          increment: 50,
        });
        // ... peer review
      }

      progress.report({
        message: 'Synthesizing results...',
        increment: 80,
      });

      // Return for chairman synthesis
      return result;
    }
  );
}
```

---

## Usage Logging

### Log Format

```typescript
// Session start (INFO)
{
  "event": "council_session_start",
  "sessionId": "uuid-here",
  "agentType": "codebase-analyzer",
  "stage": "speckit_plan",
  "providers": ["anthropic", "google", "xai"],
  "timestamp": "2025-12-30T10:15:30.000Z"
}

// Session complete (INFO)
{
  "event": "council_session_complete",
  "sessionId": "uuid-here",
  "status": "completed",
  "durationMs": 4520,
  "membersResponded": 3,
  "membersFailed": 0,
  "peerReviewEnabled": false,
  "totalCostUsd": 0.0456,
  "timestamp": "2025-12-30T10:15:34.520Z"
}

// Usage log entry (appended to .specify/logs/council-usage.jsonl)
{
  "id": "usage-uuid",
  "sessionId": "uuid-here",
  "timestamp": "2025-12-30T10:15:34.520Z",
  "stage": "speckit_plan",
  "providersUsed": ["anthropic", "google", "xai"],
  "totalCostUsd": 0.0456,
  "tokenBreakdown": {
    "anthropic": { "input": 2500, "output": 1200 },
    "google": { "input": 2500, "output": 1100 },
    "xai": { "input": 2500, "output": 1150 }
  },
  "councilMode": true,
  "success": true
}
```

---

## Test Strategy

### Unit Tests

```typescript
describe('CouncilOrchestrator', () => {
  it('falls back to single mode when quorum not met', async () => {
    const orchestrator = new CouncilOrchestrator(mockConfig);
    mockProviders([
      { id: 'anthropic', fails: false },
      { id: 'google', fails: true },
      { id: 'xai', fails: true },
    ]);

    const result = await orchestrator.dispatch(
      'test prompt',
      'codebase-analyzer',
      'speckit_plan'
    );

    expect(result.mode).toBe('single');
  });

  it('anonymizes member identities correctly', () => {
    const members = createMockMembers(['anthropic', 'google', 'xai']);
    const anonymized = orchestrator.aggregator.anonymize(members);

    expect(anonymized[0].anonymousId).toBe('Member A');
    expect(anonymized[1].anonymousId).toBe('Member B');
    expect(anonymized[2].anonymousId).toBe('Member C');
  });
});
```

### Integration Tests

```typescript
describe('Council Integration', () => {
  it.skipIf(!hasMultipleProviders())('runs full council session', async () => {
    const result = await orchestrator.dispatch(
      'Analyze this code structure',
      'codebase-analyzer',
      'research_codebase'
    );

    expect(result.mode).toBe('council');
    expect(result.session?.members.length).toBeGreaterThanOrEqual(2);
    expect(result.synthesis).toBeDefined();
  });
});
```

---

**Contract Status**: ✅ COMPLETE **Owner**: CouncilOrchestrator
