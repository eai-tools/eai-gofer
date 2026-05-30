export type GoferTaskTier = 'simple' | 'mechanical' | 'medium' | 'hard' | 'arbiter';

export interface ModelRoute {
  model: string;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';
  contextWindowTokens?: number;
  claudeCodeAlias?: 'haiku' | 'sonnet' | 'opus';
  useFor: string;
}

export interface HostModelPolicy {
  simple: ModelRoute;
  medium: ModelRoute;
  hard: ModelRoute;
  mechanical?: ModelRoute;
  arbiter?: ModelRoute;
  highThroughputCoding?: ModelRoute;
  note?: string;
}

export interface GoferModelPolicy {
  version: number;
  lastVerified: string;
  profile: 'balanced';
  surfaces: {
    claude: HostModelPolicy;
    codex: HostModelPolicy;
    gemini: HostModelPolicy;
    copilot: HostModelPolicy;
  };
}

export const GOFER_MODEL_POLICY_PATH = '.specify/memory/gofer-model-policy.yaml';

export const DEFAULT_GOFER_MODEL_POLICY: GoferModelPolicy = {
  version: 1,
  lastVerified: '2026-05-30',
  profile: 'balanced',
  surfaces: {
    claude: {
      simple: {
        model: 'claude-haiku-4-5',
        claudeCodeAlias: 'haiku',
        contextWindowTokens: 200_000,
        useFor: 'scouting, extraction, summarization, low-risk helpers',
      },
      medium: {
        model: 'claude-sonnet-4-6',
        claudeCodeAlias: 'sonnet',
        contextWindowTokens: 1_000_000,
        useFor: 'default implementation, synthesis, validation, everyday coding',
      },
      hard: {
        model: 'claude-opus-4-8',
        claudeCodeAlias: 'opus',
        contextWindowTokens: 1_000_000,
        useFor: 'hardest bugs, security review, architecture arbitration, release-critical validation',
      },
    },
    codex: {
      simple: {
        model: 'gpt-5.4-mini',
        reasoningEffort: 'low',
        contextWindowTokens: 400_000,
        useFor: 'simple coding, focused edits, routine test fixes',
      },
      mechanical: {
        model: 'gpt-5.4-nano',
        reasoningEffort: 'low',
        contextWindowTokens: 400_000,
        useFor: 'locate, classify, summarize, transform text',
      },
      medium: {
        model: 'gpt-5.4',
        reasoningEffort: 'medium',
        contextWindowTokens: 1_000_000,
        useFor: 'default planning, implementation, research synthesis',
      },
      hard: {
        model: 'gpt-5.3-codex',
        reasoningEffort: 'high',
        contextWindowTokens: 400_000,
        useFor: 'agentic terminal coding, tool-heavy debugging, code review',
      },
      arbiter: {
        model: 'gpt-5.5',
        reasoningEffort: 'high',
        contextWindowTokens: 1_050_000,
        useFor: 'broad frontier reasoning, complex architecture, final arbitration',
      },
    },
    gemini: {
      simple: {
        model: 'gemini-3.1-flash-lite',
        contextWindowTokens: 1_000_000,
        useFor: 'cheap large-context scans, summarization, extraction',
      },
      medium: {
        model: 'gemini-3-flash-preview',
        contextWindowTokens: 1_000_000,
        useFor: 'default research and broad synthesis when cost matters',
      },
      hard: {
        model: 'gemini-3.1-pro-preview',
        contextWindowTokens: 1_000_000,
        useFor: 'large-context architecture, cross-repo reasoning, high-risk research',
      },
      highThroughputCoding: {
        model: 'gemini-3.5-flash',
        contextWindowTokens: 1_000_000,
        useFor: 'fast tool/coding workflows when account pricing makes it worthwhile',
      },
    },
    copilot: {
      simple: {
        model: 'Auto',
        useFor: 'default Copilot Chat, routine coding, completion, and quick fixes',
      },
      medium: {
        model: 'Auto',
        useFor: 'normal Gofer stage prompts and workspace questions',
      },
      hard: {
        model: 'Best available in picker: GPT-5.3-Codex, GPT-5.5, Claude Opus, or Gemini Pro',
        useFor: 'explicit hard review, security, architecture, or release gates',
      },
      note: 'Copilot model availability depends on plan, organization policy, client, and feature surface.',
    },
  },
};

export function getDefaultModelRoute(
  surface: keyof GoferModelPolicy['surfaces'],
  tier: GoferTaskTier
): ModelRoute {
  const hostPolicy = DEFAULT_GOFER_MODEL_POLICY.surfaces[surface];
  const route = hostPolicy[tier] ?? hostPolicy.medium;
  return route;
}
