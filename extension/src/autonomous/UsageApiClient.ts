/**
 * Usage API Client
 *
 * Calls Anthropic and OpenAI billing APIs to retrieve real token usage
 * and cost data. Implements UsageDataSource so it can replace UsageLogger
 * as AIUsageMonitor's data source.
 *
 * @see .specify/specs/026-provider-api-usage/research.md
 */

import * as https from 'https';
import type { UsageDataSource } from '../types/aiUsage';
import type { UsageSummary } from '../council/UsageLogger';

// ── Anthropic API response types ────────────────────────────────

interface AnthropicUsageBucket {
  bucket: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cached_input_tokens?: number;
  model?: string;
}

interface AnthropicUsageResponse {
  data: AnthropicUsageBucket[];
}

interface AnthropicCostBucket {
  bucket: string;
  token_cost_usd_cents: number;
  model?: string;
}

interface AnthropicCostResponse {
  data: AnthropicCostBucket[];
}

// ── OpenAI API response types ───────────────────────────────────

interface OpenAIUsageResult {
  object: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
}

interface OpenAIUsageBucket {
  start_time: number;
  end_time: number;
  results: OpenAIUsageResult[];
}

interface OpenAIUsageResponse {
  data: OpenAIUsageBucket[];
}

interface OpenAICostAmount {
  value: number;
  currency: string;
}

interface OpenAICostResult {
  object: string;
  model: string;
  amount: OpenAICostAmount;
}

interface OpenAICostBucket {
  start_time: number;
  end_time: number;
  results: OpenAICostResult[];
}

interface OpenAICostResponse {
  data: OpenAICostBucket[];
}

// ── Error types ─────────────────────────────────────────────────

interface ProviderApiError {
  provider: 'anthropic' | 'openai';
  statusCode?: number;
  message: string;
  isRetryable: boolean;
}

// ── Cache types ─────────────────────────────────────────────────

interface CacheEntry {
  summary: Partial<UsageSummary>;
  timestamp: number;
}

// ── Public types ────────────────────────────────────────────────

export type AdminKeyGetter = (providerId: 'anthropic' | 'openai') => string | undefined;

// ── Date/time helpers ───────────────────────────────────────────

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function getBucketWidth(fromDate: Date, toDate: Date): '1h' | '1d' {
  const diffMs = toDate.getTime() - fromDate.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return diffMs <= oneDayMs ? '1h' : '1d';
}

// ── HTTP helper ─────────────────────────────────────────────────

function httpsGet(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const provider: 'anthropic' | 'openai' = parsedUrl.hostname.includes('openai')
      ? 'openai'
      : 'anthropic';
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            const err: ProviderApiError = {
              provider,
              statusCode: res.statusCode,
              message: `HTTP ${res.statusCode}: ${body.slice(0, 200)}`,
              isRetryable: res.statusCode ? [429, 500, 502, 503].includes(res.statusCode) : false,
            };
            reject(err);
          }
        });
      }
    );
    req.on('error', (e) => {
      reject({
        provider,
        message: `Network error: ${e.message}`,
        isRetryable: true,
      } as ProviderApiError);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject({
        provider,
        message: 'Request timeout',
        isRetryable: true,
      } as ProviderApiError);
    });
    req.end();
  });
}

/**
 * API client that fetches real billing data from provider APIs.
 * Implements UsageDataSource for transparent swap with UsageLogger.
 */
export class UsageApiClient implements UsageDataSource {
  private readonly cache = new Map<string, CacheEntry>();
  private disposed = false;
  private static readonly REQUEST_TIMEOUT_MS = 10000;
  private static readonly MAX_CACHE_AGE_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(private readonly adminKeyGetter: AdminKeyGetter) {}

  dispose(): void {
    this.disposed = true;
    this.cache.clear();
  }

  /**
   * Fetch usage summary from provider billing APIs.
   * Aggregates data from all providers that have admin keys configured.
   */
  async getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary> {
    if (this.disposed) {
      return this.mergeSummaries([], fromDate ?? new Date(), toDate ?? new Date());
    }
    const now = new Date();
    const from = fromDate ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = toDate ?? now;

    const anthropicKey = this.adminKeyGetter('anthropic');
    const openaiKey = this.adminKeyGetter('openai');

    const results: Partial<UsageSummary>[] = [];

    // Fetch from each configured provider in parallel
    const fetches: Promise<void>[] = [];

    if (anthropicKey) {
      fetches.push(
        this.fetchAnthropicData(anthropicKey, from, to)
          .then((data) => {
            results.push(data);
          })
          .catch((err) => {
            const cached = this.getCachedData('anthropic');
            if (cached) {
              results.push(cached);
            }
            this.logError('anthropic', err);
          })
      );
    }

    if (openaiKey) {
      fetches.push(
        this.fetchOpenAIData(openaiKey, from, to)
          .then((data) => {
            results.push(data);
          })
          .catch((err) => {
            const cached = this.getCachedData('openai');
            if (cached) {
              results.push(cached);
            }
            this.logError('openai', err);
          })
      );
    }

    await Promise.all(fetches);

    return this.mergeSummaries(results, from, to);
  }

  // ── Anthropic API methods ───────────────────────────────────

  private async fetchAnthropicData(
    adminKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<Partial<UsageSummary>> {
    const start = Date.now();
    const [usageResp, costResp] = await Promise.all([
      this.retryWithBackoff(() => this.fetchAnthropicUsage(adminKey, fromDate, toDate)),
      this.retryWithBackoff(() => this.fetchAnthropicCost(adminKey, fromDate, toDate)),
    ]);

    const result = this.transformAnthropicData(usageResp, costResp);
    this.cache.set('anthropic', { summary: result, timestamp: Date.now() });
    this.logSuccess('anthropic', Date.now() - start, usageResp.data?.length ?? 0);
    return result;
  }

  private async fetchAnthropicUsage(
    adminKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<AnthropicUsageResponse> {
    const bucket = getBucketWidth(fromDate, toDate);
    const params = new URLSearchParams({
      starting_at: fromDate.toISOString(),
      ending_at: toDate.toISOString(),
      bucket_width: bucket,
    });
    params.append('group_by[]', 'model');

    const url = `https://api.anthropic.com/v1/organizations/usage_report/messages?${params}`;
    const headers = {
      'x-api-key': adminKey,
      'anthropic-version': '2023-06-01',
    };

    const body = await httpsGet(url, headers, UsageApiClient.REQUEST_TIMEOUT_MS);
    return JSON.parse(body) as AnthropicUsageResponse;
  }

  private async fetchAnthropicCost(
    adminKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<AnthropicCostResponse> {
    const params = new URLSearchParams({
      starting_at: fromDate.toISOString(),
      ending_at: toDate.toISOString(),
      bucket_width: '1d',
    });
    params.append('group_by[]', 'model');

    const url = `https://api.anthropic.com/v1/organizations/cost_report?${params}`;
    const headers = {
      'x-api-key': adminKey,
      'anthropic-version': '2023-06-01',
    };

    const body = await httpsGet(url, headers, UsageApiClient.REQUEST_TIMEOUT_MS);
    return JSON.parse(body) as AnthropicCostResponse;
  }

  private transformAnthropicData(
    usageResp: AnthropicUsageResponse,
    costResp: AnthropicCostResponse
  ): Partial<UsageSummary> {
    let totalInput = 0;
    let totalOutput = 0;

    for (const bucket of usageResp.data ?? []) {
      totalInput += Math.max(0, bucket.input_tokens ?? 0);
      totalOutput += Math.max(0, bucket.output_tokens ?? 0);
    }

    let totalCostUsd = 0;
    for (const bucket of costResp.data ?? []) {
      totalCostUsd += Math.max(0, bucket.token_cost_usd_cents ?? 0) / 100;
    }

    return {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCostUsd,
      byProvider: {
        anthropic: {
          tokens: totalInput + totalOutput,
          costUsd: totalCostUsd,
          sessions: 1,
        },
      },
    };
  }

  // ── OpenAI API methods ──────────────────────────────────────

  private async fetchOpenAIData(
    adminKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<Partial<UsageSummary>> {
    const start = Date.now();
    const [usageResp, costResp] = await Promise.all([
      this.retryWithBackoff(() => this.fetchOpenAIUsage(adminKey, fromDate, toDate)),
      this.retryWithBackoff(() => this.fetchOpenAICost(adminKey, fromDate, toDate)),
    ]);

    const result = this.transformOpenAIData(usageResp, costResp);
    this.cache.set('openai', { summary: result, timestamp: Date.now() });
    this.logSuccess('openai', Date.now() - start, usageResp.data?.length ?? 0);
    return result;
  }

  private async fetchOpenAIUsage(
    adminKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<OpenAIUsageResponse> {
    const bucket = getBucketWidth(fromDate, toDate);
    const params = new URLSearchParams({
      start_time: String(toUnixSeconds(fromDate)),
      end_time: String(toUnixSeconds(toDate)),
      bucket_width: bucket,
    });
    // OpenAI uses repeated params for group_by
    params.append('group_by[]', 'model');

    const url = `https://api.openai.com/v1/organization/usage/completions?${params}`;
    const headers = {
      Authorization: `Bearer ${adminKey}`,
    };

    const body = await httpsGet(url, headers, UsageApiClient.REQUEST_TIMEOUT_MS);
    return JSON.parse(body) as OpenAIUsageResponse;
  }

  private async fetchOpenAICost(
    adminKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<OpenAICostResponse> {
    const bucket = getBucketWidth(fromDate, toDate);
    const params = new URLSearchParams({
      start_time: String(toUnixSeconds(fromDate)),
      end_time: String(toUnixSeconds(toDate)),
      bucket_width: bucket,
    });
    params.append('group_by[]', 'model');

    const url = `https://api.openai.com/v1/organization/costs?${params}`;
    const headers = {
      Authorization: `Bearer ${adminKey}`,
    };

    const body = await httpsGet(url, headers, UsageApiClient.REQUEST_TIMEOUT_MS);
    return JSON.parse(body) as OpenAICostResponse;
  }

  private transformOpenAIData(
    usageResp: OpenAIUsageResponse,
    costResp: OpenAICostResponse
  ): Partial<UsageSummary> {
    let totalInput = 0;
    let totalOutput = 0;

    for (const bucket of usageResp.data ?? []) {
      for (const result of bucket.results ?? []) {
        totalInput += Math.max(0, result.input_tokens ?? 0);
        totalOutput += Math.max(0, result.output_tokens ?? 0);
      }
    }

    let totalCostUsd = 0;
    for (const bucket of costResp.data ?? []) {
      for (const result of bucket.results ?? []) {
        totalCostUsd += Math.max(0, result.amount?.value ?? 0);
        if (result.amount?.currency && result.amount.currency !== 'usd') {
          console.warn(`[gofer] OpenAI cost currency is ${result.amount.currency}, expected usd`);
        }
      }
    }

    return {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCostUsd,
      byProvider: {
        openai: {
          tokens: totalInput + totalOutput,
          costUsd: totalCostUsd,
          sessions: 1,
        },
      },
    };
  }

  // ── Retry logic ─────────────────────────────────────────────

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < UsageApiClient.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const apiErr = err as ProviderApiError;
        if (!apiErr.isRetryable) {
          throw err;
        }
        if (attempt < UsageApiClient.MAX_RETRY_ATTEMPTS - 1) {
          const baseDelay = 2000;
          const delay = baseDelay * Math.pow(2, attempt);
          const jitter = delay * 0.1 * (Math.random() * 2 - 1); // ±10%
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        }
      }
    }
    throw lastError;
  }

  // ── Cache ───────────────────────────────────────────────────

  private getCachedData(provider: string): Partial<UsageSummary> | undefined {
    const entry = this.cache.get(provider);
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.timestamp > UsageApiClient.MAX_CACHE_AGE_MS) {
      this.cache.delete(provider);
      return undefined;
    }
    return entry.summary;
  }

  // ── Aggregation ─────────────────────────────────────────────

  private mergeSummaries(
    partials: Partial<UsageSummary>[],
    fromDate: Date,
    toDate: Date
  ): UsageSummary {
    const merged: UsageSummary = {
      totalSessions: 0,
      councilSessions: 0,
      singleSessions: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      avgDurationMs: 0,
      byProvider: {},
      byStage: {},
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    };

    for (const partial of partials) {
      merged.totalInputTokens += partial.totalInputTokens ?? 0;
      merged.totalOutputTokens += partial.totalOutputTokens ?? 0;
      merged.totalCostUsd += partial.totalCostUsd ?? 0;

      if (partial.byProvider) {
        for (const [key, value] of Object.entries(partial.byProvider)) {
          merged.byProvider[key] = value;
        }
      }
    }

    return merged;
  }

  // ── Logging ─────────────────────────────────────────────────

  private logSuccess(provider: string, durationMs: number, bucketCount: number): void {}

  private logError(provider: string, err: unknown): void {
    const apiErr = err as ProviderApiError;
    const statusInfo = apiErr.statusCode ? ` (HTTP ${apiErr.statusCode})` : '';
    console.error(`[gofer] ${provider} billing API error${statusInfo}: ${apiErr.message ?? err}`);
  }
}
