# LLM Provider API Contract

**Purpose**: Define the common interface for all LLM providers (Anthropic,
Google, xAI, OpenAI) and their integration patterns.

**Contract Version**: 1.0.0 **Last Updated**: 2025-12-30

---

## Provider Interface

### Common Interface

All providers must implement this interface:

```typescript
interface LLMProvider {
  readonly id: string; // Provider identifier
  readonly name: string; // Human-readable name

  /**
   * Check if provider is available and configured
   */
  isAvailable(): boolean;

  /**
   * Validate credentials and connectivity
   * @returns true if provider is ready, false with error message otherwise
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;

  /**
   * Send a prompt and receive a response
   * @param request - The query request
   * @returns Provider response with content and usage metrics
   */
  query(request: QueryRequest): Promise<QueryResponse>;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus;
}

interface QueryRequest {
  prompt: string; // The user/system prompt to send
  systemPrompt?: string; // Optional system-level instructions
  maxTokens: number; // Maximum output tokens
  temperature?: number; // Sampling temperature (default: 0)
  timeout?: number; // Request timeout in ms (default: 30000)
}

interface QueryResponse {
  content: string; // The response text
  providerId: string; // Which provider responded
  model: string; // Exact model used
  usage: UsageMetrics; // Token and cost metrics
  latencyMs: number; // Request duration
  metadata?: Record<string, unknown>; // Provider-specific metadata
}

interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

interface RateLimitStatus {
  isLimited: boolean; // Currently rate limited?
  remainingRequests?: number; // Requests remaining in window
  resetAt?: string; // ISO-8601 timestamp when limit resets
}
```

---

## Provider Implementations

### 1. Anthropic Provider

**SDK**: `@anthropic-ai/sdk` (existing in project) **API Version**: Messages API
v2023-06-01 **Model**: `claude-sonnet-4-20250514`

**Implementation**:

```typescript
import Anthropic from '@anthropic-ai/sdk';

class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';
  private client: Anthropic | null = null;

  constructor(
    private apiKey: string,
    private model: string
  ) {
    if (apiKey) {
      this.client = new Anthropic({ apiKey, timeout: 30000 });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.client) {
      return { healthy: false, error: 'API key not configured' };
    }
    try {
      // Minimal request to validate credentials
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const start = Date.now();
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      providerId: this.id,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        estimatedCostUsd: this.calculateCost(response.usage),
      },
      latencyMs: Date.now() - start,
    };
  }

  private calculateCost(usage: {
    input_tokens: number;
    output_tokens: number;
  }): number {
    // Claude Sonnet 4: $3/M input, $15/M output
    return (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000;
  }
}
```

**Error Codes**: | Status | Error Type | Handling |
|--------|------------|----------| | 200 | Success | Parse and return | | 400 |
Invalid request | Log ERROR, return error response | | 401 | Auth failed | Mark
provider unavailable | | 429 | Rate limited | Update rate limit status, return
timeout | | 500+ | Server error | Retry with backoff (max 3) |

---

### 2. Google Provider

**SDK**: `@google/generative-ai` **Model**: `gemini-2.0-flash`

**Implementation**:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class GoogleProvider implements LLMProvider {
  readonly id = 'google';
  readonly name = 'Google Gemini';
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(
    private apiKey: string,
    private modelName: string
  ) {
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({ model: modelName });
    }
  }

  isAvailable(): boolean {
    return this.model !== null;
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.model) {
      return { healthy: false, error: 'API key not configured' };
    }
    try {
      await this.model.generateContent('test');
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const start = Date.now();

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      systemInstruction: request.systemPrompt
        ? { parts: [{ text: request.systemPrompt }] }
        : undefined,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature ?? 0,
      },
    });

    const response = result.response;
    const usage = response.usageMetadata;

    return {
      content: response.text(),
      providerId: this.id,
      model: this.modelName,
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
        estimatedCostUsd: this.calculateCost(usage),
      },
      latencyMs: Date.now() - start,
    };
  }

  private calculateCost(usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  }): number {
    if (!usage) return 0;
    // Gemini 2.0 Flash: ~$0.075/M input, ~$0.30/M output
    return (
      (usage.promptTokenCount * 0.075 + usage.candidatesTokenCount * 0.3) /
      1_000_000
    );
  }
}
```

---

### 3. xAI Provider

**SDK**: `openai` (OpenAI-compatible API) **Base URL**: `https://api.x.ai/v1`
**Model**: `grok-3`

**Implementation**:

```typescript
import OpenAI from 'openai';

class XAIProvider implements LLMProvider {
  readonly id = 'xai';
  readonly name = 'xAI Grok';
  private client: OpenAI | null = null;

  constructor(
    private apiKey: string,
    private modelName: string
  ) {
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.client) {
      return { healthy: false, error: 'API key not configured' };
    }
    try {
      await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0,
      messages,
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice.message.content ?? '',
      providerId: this.id,
      model: response.model,
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        estimatedCostUsd: this.calculateCost(usage),
      },
      latencyMs: Date.now() - start,
    };
  }

  private calculateCost(usage?: OpenAI.CompletionUsage): number {
    if (!usage) return 0;
    // Grok-3 pricing (estimated): ~$2/M input, ~$10/M output
    return (usage.prompt_tokens * 2 + usage.completion_tokens * 10) / 1_000_000;
  }
}
```

---

### 4. OpenAI Provider

**SDK**: `openai` **Model**: `gpt-4o`

**Implementation**:

```typescript
import OpenAI from 'openai';

class OpenAIProvider implements LLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI GPT';
  private client: OpenAI | null = null;

  constructor(
    private apiKey: string,
    private modelName: string
  ) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.client) {
      return { healthy: false, error: 'API key not configured' };
    }
    try {
      await this.client.chat.completions.create({
        model: this.modelName,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    const start = Date.now();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0,
      messages,
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice.message.content ?? '',
      providerId: this.id,
      model: response.model,
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        estimatedCostUsd: this.calculateCost(usage),
      },
      latencyMs: Date.now() - start,
    };
  }

  private calculateCost(usage?: OpenAI.CompletionUsage): number {
    if (!usage) return 0;
    // GPT-4o: $2.50/M input, $10/M output
    return (
      (usage.prompt_tokens * 2.5 + usage.completion_tokens * 10) / 1_000_000
    );
  }
}
```

---

## Provider Factory

```typescript
class ProviderFactory {
  static create(
    providerId: string,
    apiKey: string,
    model: string
  ): LLMProvider | null {
    switch (providerId) {
      case 'anthropic':
        return new AnthropicProvider(apiKey, model);
      case 'google':
        return new GoogleProvider(apiKey, model);
      case 'xai':
        return new XAIProvider(apiKey, model);
      case 'openai':
        return new OpenAIProvider(apiKey, model);
      default:
        return null;
    }
  }

  static getDefaultModel(providerId: string): string {
    switch (providerId) {
      case 'anthropic':
        return 'claude-sonnet-4-20250514';
      case 'google':
        return 'gemini-2.0-flash';
      case 'xai':
        return 'grok-3';
      case 'openai':
        return 'gpt-4o';
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }
}
```

---

## VSCode Settings Schema

New settings to add in `extension/package.json`:

```json
{
  "specGofer.googleApiKey": {
    "type": "string",
    "default": "",
    "description": "Google AI API Key for Gemini models",
    "markdownDescription": "Your Google AI API Key. Get one at [Google AI Studio](https://aistudio.google.com/apikey)",
    "order": 1
  },
  "specGofer.xaiApiKey": {
    "type": "string",
    "default": "",
    "description": "xAI API Key for Grok models",
    "markdownDescription": "Your xAI API Key. Get one at [xAI Console](https://console.x.ai)",
    "order": 2
  },
  "specGofer.openaiApiKey": {
    "type": "string",
    "default": "",
    "description": "OpenAI API Key for GPT models",
    "markdownDescription": "Your OpenAI API Key. Get one at [OpenAI Platform](https://platform.openai.com/api-keys)",
    "order": 3
  }
}
```

---

## Rate Limiting

All providers share a common rate limiting approach using `p-limit`:

```typescript
import pLimit from 'p-limit';

class RateLimitedProvider implements LLMProvider {
  private limiter: ReturnType<typeof pLimit>;
  private wrapped: LLMProvider;

  constructor(provider: LLMProvider, requestsPerMinute: number = 60) {
    this.wrapped = provider;
    this.limiter = pLimit(requestsPerMinute);
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    return this.limiter(() => this.wrapped.query(request));
  }

  // Delegate other methods...
}
```

---

## Error Handling

```typescript
class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// Usage in providers:
if (error.status === 429) {
  const retryAfter = parseInt(error.headers?.['retry-after'] ?? '60') * 1000;
  throw new ProviderError(
    'Rate limit exceeded',
    this.id,
    429,
    true,
    retryAfter
  );
}
```

---

## Logging

All provider interactions are logged:

```typescript
// Request logging (INFO)
{
  "event": "provider_request",
  "providerId": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "promptLength": 2543,
  "maxTokens": 2048,
  "timestamp": "2025-12-30T10:15:30.000Z"
}

// Response logging (INFO)
{
  "event": "provider_response",
  "providerId": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "inputTokens": 2543,
  "outputTokens": 512,
  "latencyMs": 1450,
  "costUsd": 0.0124,
  "timestamp": "2025-12-30T10:15:31.450Z"
}

// Error logging (WARN/ERROR)
{
  "event": "provider_error",
  "providerId": "anthropic",
  "statusCode": 429,
  "errorType": "rate_limit",
  "retryable": true,
  "retryAfterMs": 60000,
  "timestamp": "2025-12-30T10:15:30.000Z"
}
```

---

## Test Strategy

### Unit Tests (Mock SDKs)

```typescript
import { vi, describe, it, expect } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        model: 'claude-sonnet-4-20250514',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

describe('AnthropicProvider', () => {
  it('returns formatted response', async () => {
    const provider = new AnthropicProvider(
      'test-key',
      'claude-sonnet-4-20250514'
    );
    const response = await provider.query({
      prompt: 'Test prompt',
      maxTokens: 1024,
    });

    expect(response.content).toBe('Test response');
    expect(response.providerId).toBe('anthropic');
    expect(response.usage.totalTokens).toBe(150);
  });
});
```

### Integration Tests (Real API)

```typescript
describe('Provider Integration', () => {
  it.skipIf(!process.env.ANTHROPIC_API_KEY)(
    'Anthropic health check',
    async () => {
      const provider = new AnthropicProvider(
        process.env.ANTHROPIC_API_KEY!,
        'claude-sonnet-4-20250514'
      );
      const result = await provider.healthCheck();
      expect(result.healthy).toBe(true);
    }
  );
});
```

---

**Contract Status**: ✅ COMPLETE **Owner**: CouncilOrchestrator
