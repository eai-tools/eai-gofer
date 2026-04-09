import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type MirrorPropagationCompletedEventPayload } from '../internalApi/PropagateCanonicalMirrors';

export type MirrorPropagationCompletedConsumer = (
  payload: MirrorPropagationCompletedEventPayload
) => void;

export type MirrorParityValidationTrigger = (
  payload: MirrorPropagationCompletedEventPayload
) => void;

export interface MirrorPropagationEventHandlers {
  publish: (payload: MirrorPropagationCompletedEventPayload) => void;
  consume: (consumer: MirrorPropagationCompletedConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidMirrorPropagationPayload(
  payload: MirrorPropagationCompletedEventPayload
): void {
  const validation = validateEventPayload('EVT-008', payload);
  if (!validation.valid) {
    throw new Error(`EVT-008 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

export function publishMirrorPropagationCompletedEvent(
  payload: MirrorPropagationCompletedEventPayload,
  consumers: ReadonlySet<MirrorPropagationCompletedConsumer>,
  parityValidationTrigger?: MirrorParityValidationTrigger
): void {
  assertValidMirrorPropagationPayload(payload);

  if (payload.runtimeSyncCompleted && parityValidationTrigger) {
    parityValidationTrigger(payload);
  }

  for (const consumer of consumers) {
    consumer(payload);
  }
}

export function consumeMirrorPropagationCompletedEvent(
  consumer: MirrorPropagationCompletedConsumer,
  consumers: Set<MirrorPropagationCompletedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createMirrorPropagationEventHandlers(
  parityValidationTrigger?: MirrorParityValidationTrigger
): MirrorPropagationEventHandlers {
  const consumers = new Set<MirrorPropagationCompletedConsumer>();

  return {
    publish: (payload: MirrorPropagationCompletedEventPayload): void => {
      publishMirrorPropagationCompletedEvent(payload, consumers, parityValidationTrigger);
    },
    consume: (consumer: MirrorPropagationCompletedConsumer): (() => void) =>
      consumeMirrorPropagationCompletedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
