import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GOFER_MODEL_POLICY,
  GOFER_MODEL_POLICY_PATH,
  getDefaultModelRoute,
} from '../../../extension/src/config/modelPolicy';

describe('Gofer model policy defaults', () => {
  it('uses a repo-owned memory file as the editable policy path', () => {
    expect(GOFER_MODEL_POLICY_PATH).toBe('.specify/memory/gofer-model-policy.yaml');
  });

  it('routes Copilot simple and medium work to Auto', () => {
    expect(getDefaultModelRoute('copilot', 'simple').model).toBe('Auto');
    expect(getDefaultModelRoute('copilot', 'medium').model).toBe('Auto');
  });

  it('keeps nano for mechanical Codex work rather than normal simple coding', () => {
    expect(getDefaultModelRoute('codex', 'mechanical').model).toBe('gpt-5.4-nano');
    expect(getDefaultModelRoute('codex', 'simple').model).toBe('gpt-5.4-mini');
  });

  it('uses best-available hard routes for high-risk work', () => {
    expect(getDefaultModelRoute('claude', 'hard').model).toBe('claude-opus-4-8');
    expect(getDefaultModelRoute('codex', 'hard').model).toBe('gpt-5.3-codex');
    expect(getDefaultModelRoute('gemini', 'hard').model).toBe('gemini-3.1-pro-preview');
  });

  it('records 1M context where current hard/default routes support it', () => {
    expect(DEFAULT_GOFER_MODEL_POLICY.surfaces.claude.medium.contextWindowTokens).toBe(1_000_000);
    expect(DEFAULT_GOFER_MODEL_POLICY.surfaces.claude.hard.contextWindowTokens).toBe(1_000_000);
    expect(DEFAULT_GOFER_MODEL_POLICY.surfaces.gemini.simple.contextWindowTokens).toBe(1_000_000);
    expect(DEFAULT_GOFER_MODEL_POLICY.surfaces.codex.arbiter?.contextWindowTokens).toBe(1_050_000);
  });
});
