import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type ReferenceFallbackUsedEventPayload } from '../internalApi/ResolveEnterpriseAiReferences';

export type ReferenceFallbackUsedConsumer = (payload: ReferenceFallbackUsedEventPayload) => void;

export interface ReferenceFallbackNotice {
  runId: string;
  fallbackPath: string;
  unavailableExternalReferences: readonly string[];
  message: string;
}

export type ReferenceFallbackNoticeDispatcher = (notice: ReferenceFallbackNotice) => void;

export interface ReferenceFallbackEventHandlers {
  publish: (payload: ReferenceFallbackUsedEventPayload) => void;
  consume: (consumer: ReferenceFallbackUsedConsumer) => () => void;
  consumerCount: () => number;
}

const REFERENCE_LABELS: Readonly<Record<string, string>> = {
  'eai-cli': 'EAI CLI reference',
  eai_cli_docs: 'EAI CLI reference',
  'vertical-template': 'Vertical Template reference',
  vertical_template_docs: 'Vertical Template reference',
  'deployment-repo': 'Deployment repository reference',
  deployment_repo_docs: 'Deployment repository reference',
};

function assertValidReferenceFallbackPayload(payload: ReferenceFallbackUsedEventPayload): void {
  const validation = validateEventPayload('EVT-004', payload);
  if (!validation.valid) {
    throw new Error(`EVT-004 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function toReferenceLabel(referenceType: string): string {
  return REFERENCE_LABELS[referenceType] ?? `${referenceType} reference`;
}

function formatReferenceList(referenceTypes: readonly string[]): string {
  const labels = referenceTypes.map((referenceType: string): string =>
    toReferenceLabel(referenceType)
  );

  if (labels.length < 1) {
    return 'EnterpriseAI references';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export function createReferenceFallbackNotice(
  payload: ReferenceFallbackUsedEventPayload
): ReferenceFallbackNotice {
  const referenceSummary = formatReferenceList(payload.unavailableExternalReferences);

  return {
    runId: payload.runId,
    fallbackPath: payload.fallbackPath,
    unavailableExternalReferences: payload.unavailableExternalReferences,
    message: `${referenceSummary} unavailable; using local docs. For updates, see ${payload.fallbackPath}`,
  };
}

export function publishReferenceFallbackUsedEvent(
  payload: ReferenceFallbackUsedEventPayload,
  consumers: ReadonlySet<ReferenceFallbackUsedConsumer>,
  noticeDispatcher?: ReferenceFallbackNoticeDispatcher
): void {
  assertValidReferenceFallbackPayload(payload);

  if (payload.userNoticeRequired && noticeDispatcher) {
    noticeDispatcher(createReferenceFallbackNotice(payload));
  }

  for (const consumer of consumers) {
    consumer(payload);
  }
}

export function consumeReferenceFallbackUsedEvent(
  consumer: ReferenceFallbackUsedConsumer,
  consumers: Set<ReferenceFallbackUsedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createReferenceFallbackEventHandlers(
  noticeDispatcher?: ReferenceFallbackNoticeDispatcher
): ReferenceFallbackEventHandlers {
  const consumers = new Set<ReferenceFallbackUsedConsumer>();

  return {
    publish: (payload: ReferenceFallbackUsedEventPayload): void => {
      publishReferenceFallbackUsedEvent(payload, consumers, noticeDispatcher);
    },
    consume: (consumer: ReferenceFallbackUsedConsumer): (() => void) =>
      consumeReferenceFallbackUsedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
