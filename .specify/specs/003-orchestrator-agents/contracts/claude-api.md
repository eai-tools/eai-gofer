# Claude API Integration Contract

**Purpose**: Define interactions with Anthropic Claude API for Engineer Agent (code validation) and Q&A Engine (spec-based question answering)

**API Version**: Messages API v2023-06-01
**Model**: `claude-sonnet-4-5-20250929`
**SDK**: `@anthropic-ai/sdk` v0.67.0+

---

## Engineer Agent: Code Validation

### Request Format

**Endpoint**: `POST https://api.anthropic.com/v1/messages`

**Headers**:
```http
Content-Type: application/json
x-api-key: {ANTHROPIC_API_KEY}
anthropic-version: 2023-06-01
```

**Request Body**:
```typescript
{
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  messages: [
    {
      role: 'user',
      content: `You are a code review agent. Validate this implementation against requirements and constitution.

**Task**: ${task.description}

**Implementation**:
\`\`\`typescript
${implementationCode}
\`\`\`

**Constitution Principles**:
${constitutionText}

**Requirements**:
${taskRequirements}

Return JSON only:
{
  "isValid": boolean,
  "issues": [
    {
      "category": "functional" | "security" | "performance" | "quality" | "constitution",
      "severity": "blocker" | "critical" | "major" | "minor",
      "description": "string",
      "location": "file.ts:42" (optional)
    }
  ],
  "suggestions": ["actionable fix 1", "actionable fix 2"],
  "constitutionChecks": {
    "test-driven": boolean,
    "mcp-first": boolean,
    "spec-kit": boolean,
    "strict-typescript": boolean,
    "security": boolean,
    "performance": boolean,
    "test-coverage": boolean
  }
}`
    }
  ]
}
```

### Response Format

**Success (200 OK)**:
```json
{
  "id": "msg_01abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "{\"isValid\":true,\"issues\":[],\"suggestions\":[],\"constitutionChecks\":{...}}"
    }
  ],
  "model": "claude-sonnet-4-5-20250929",
  "usage": {
    "input_tokens": 2543,
    "output_tokens": 187
  }
}
```

**Error (429 Too Many Requests)**:
```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded"
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "max_tokens: Field required"
  }
}
```

### Response Parsing

```typescript
async function validateCode(task: Task, code: string): Promise<ValidationResult> {
  const response = await anthropic.messages.create({...});

  const responseText = response.content[0].text;
  const parsed = JSON.parse(responseText);

  return {
    id: generateId(),
    taskId: task.id,
    timestamp: new Date().toISOString(),
    isValid: parsed.isValid,
    issues: parsed.issues,
    suggestions: parsed.suggestions,
    constitutionChecks: parsed.constitutionChecks
  };
}
```

### Error Handling

| Status Code | Error Type | Action |
|-------------|------------|--------|
| 200 | Success | Parse and return result |
| 400 | Invalid request | Log ERROR, fail task, escalate to human |
| 401 | Invalid API key | Log ERROR, halt orchestrator, alert operator |
| 429 | Rate limit | Wait `retry-after` header seconds, retry same request |
| 500 | Server error | Log WARN, wait 10s, retry up to 3 times |
| Timeout (>30s) | Network | Log WARN, retry up to 3 times |

### Rate Limiting

- **Limit**: 60 requests/minute (per research R8)
- **Implementation**: `p-limit` library with concurrency=60
- **Backoff**: Exponential for 500 errors, respect `retry-after` header for 429
- **Cost Tracking**: Log `input_tokens + output_tokens` and estimated cost

---

## Q&A Engine: Spec-Based Question Answering

### Request Format

**Endpoint**: Same as above (`POST https://api.anthropic.com/v1/messages`)

**Request Body**:
```typescript
{
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: `You are a Q&A assistant. Answer this question using ONLY information from the provided specifications.

**Question**: ${question}

**Context**: ${taskContext}

**Available Specifications**:
${specs.map(s => `### ${s.title}\n${s.content}`).join('\n\n')}

Return JSON only:
{
  "answer": "your answer text",
  "confidence": 0-100,
  "sources": ["spec-id-1", "spec-id-2"]
}

If you cannot answer with >60% confidence, return:
{
  "answer": "Cannot answer confidently",
  "confidence": 0,
  "sources": []
}`
    }
  ]
}
```

### Response Format

Same structure as Engineer Agent, with parsed JSON:
```json
{
  "answer": "The authentication method is JWT with <1 hour expiry per constitution principle V",
  "confidence": 95,
  "sources": ["001-auth-system", "constitution"]
}
```

### Confidence Scoring

| Confidence | Action |
|------------|--------|
| ≥80% | Auto-respond to Claude Code (FR-012) |
| 60-79% | Log WARN, escalate to human with suggested answer |
| <60% | Log INFO, escalate to human without suggested answer |
| 0% | No answer found, escalate immediately |

### Error Handling

Same as Engineer Agent, with additional handling:
- **Empty specs**: Return confidence=0, escalate
- **Malformed question**: Return confidence=0, escalate with "Question unclear"

---

## Common Specifications

### Request Constraints

- **Timeout**: 30 seconds per request
- **Max Tokens**:
  - Engineer Agent: 2048 (validation can be verbose)
  - Q&A Engine: 1024 (answers should be concise)
- **Temperature**: 0 (deterministic output)
- **System Prompt**: None (use user message with instructions)

### SDK Configuration

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 seconds
  maxRetries: 0   // Handle retries manually
});
```

### Authentication

- **Method**: API key in `x-api-key` header
- **Storage**: `ANTHROPIC_API_KEY` environment variable
- **Validation**: Test key on orchestrator startup, fail fast if invalid
- **Security**: Never log API key, rotate periodically

### Logging

**Request Logging** (INFO):
```json
{
  "event": "claude_api_request",
  "agent": "engineer" | "qa",
  "taskId": "T001",
  "prompt_length": 2543,
  "max_tokens": 2048
}
```

**Response Logging** (INFO):
```json
{
  "event": "claude_api_response",
  "agent": "engineer" | "qa",
  "taskId": "T001",
  "input_tokens": 2543,
  "output_tokens": 187,
  "duration_ms": 1450,
  "cost_usd": "0.0375"
}
```

**Error Logging** (WARN/ERROR):
```json
{
  "event": "claude_api_error",
  "agent": "engineer" | "qa",
  "status": 429,
  "error_type": "rate_limit_error",
  "retry_after": 60
}
```

---

## Cost Estimation

**Per Request** (Claude Sonnet 4.5):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

**Typical Engineer Agent Validation**:
- Input: 2000 tokens (task + code + constitution)
- Output: 500 tokens (validation result)
- Cost: $0.0375 per validation

**Typical Q&A Request**:
- Input: 1500 tokens (question + specs)
- Output: 300 tokens (answer)
- Cost: $0.027 per question

**Daily Estimate** (10 tasks, 3 retries avg, 5 questions):
- Validations: 30 × $0.0375 = $1.13
- Q&A: 5 × $0.027 = $0.14
- **Total**: ~$1.30/day = ~$40/month

---

## Test Strategy

### Unit Tests (Mock API)

```typescript
import { vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              isValid: true,
              issues: [],
              suggestions: [],
              constitutionChecks: {...}
            })
          }
        ],
        usage: { input_tokens: 2000, output_tokens: 500 }
      })
    }
  }))
}));
```

### Integration Tests (Sandbox API Key)

Use Anthropic's test API key for non-production testing:
- Validate request format matches API spec
- Verify response parsing handles all edge cases
- Test rate limiting and retry logic

### E2E Tests (Production API, Limited)

- Run 1-2 validation requests per test suite
- Verify end-to-end flow with real Claude responses
- Monitor cost (should be <$0.10 per test run)

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-10-27
**Owner**: Engineer Agent + Q&A Engine
