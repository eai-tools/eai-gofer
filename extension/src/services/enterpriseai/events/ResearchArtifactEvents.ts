import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type ResearchArtifactsGeneratedEventPayload } from '../internalApi/GenerateBusinessAndMarketArtifacts';

export type ResearchArtifactsGeneratedConsumer = (
  payload: ResearchArtifactsGeneratedEventPayload
) => void;

export interface ResearchArtifactEventHandlers {
  publish: (payload: ResearchArtifactsGeneratedEventPayload) => void;
  consume: (consumer: ResearchArtifactsGeneratedConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidResearchArtifactPayload(payload: ResearchArtifactsGeneratedEventPayload): void {
  const validation = validateEventPayload('EVT-005', payload);
  if (!validation.valid) {
    throw new Error(`EVT-005 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

export function publishResearchArtifactsGeneratedEvent(
  payload: ResearchArtifactsGeneratedEventPayload,
  consumers: ReadonlySet<ResearchArtifactsGeneratedConsumer>
): void {
  assertValidResearchArtifactPayload(payload);

  for (const consumer of consumers) {
    consumer(payload);
  }
}

export function consumeResearchArtifactsGeneratedEvent(
  consumer: ResearchArtifactsGeneratedConsumer,
  consumers: Set<ResearchArtifactsGeneratedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createResearchArtifactEventHandlers(): ResearchArtifactEventHandlers {
  const consumers = new Set<ResearchArtifactsGeneratedConsumer>();

  return {
    publish: (payload: ResearchArtifactsGeneratedEventPayload): void => {
      publishResearchArtifactsGeneratedEvent(payload, consumers);
    },
    consume: (consumer: ResearchArtifactsGeneratedConsumer): (() => void) =>
      consumeResearchArtifactsGeneratedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
