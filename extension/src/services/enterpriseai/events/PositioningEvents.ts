import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type PositioningUpdatedEventPayload } from '../internalApi/UpdateExtensionMessaging';

export type PositioningUpdatedConsumer = (payload: PositioningUpdatedEventPayload) => void;

export type PositioningChecksQueue = (payload: PositioningUpdatedEventPayload) => boolean;

export interface PositioningEventDispatchResult {
  positioningChecksQueued: boolean;
  consumersNotified: number;
}

export interface PositioningEventHandlers {
  publish: (
    payload: PositioningUpdatedEventPayload,
    checksQueue?: PositioningChecksQueue
  ) => PositioningEventDispatchResult;
  consume: (consumer: PositioningUpdatedConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidPositioningPayload(payload: PositioningUpdatedEventPayload): void {
  const validation = validateEventPayload('EVT-009', payload);
  if (!validation.valid) {
    throw new Error(`EVT-009 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

export function publishPositioningUpdatedEvent(
  payload: PositioningUpdatedEventPayload,
  consumers: ReadonlySet<PositioningUpdatedConsumer>,
  checksQueue?: PositioningChecksQueue
): PositioningEventDispatchResult {
  assertValidPositioningPayload(payload);

  const positioningChecksQueued = checksQueue ? checksQueue(payload) : true;
  if (!positioningChecksQueued) {
    throw new Error(
      'EVT_POSITIONING_VALIDATION_FAILED: release positioning checks were not queued.'
    );
  }

  for (const consumer of consumers) {
    consumer(payload);
  }

  return {
    positioningChecksQueued,
    consumersNotified: consumers.size,
  };
}

export function consumePositioningUpdatedEvent(
  consumer: PositioningUpdatedConsumer,
  consumers: Set<PositioningUpdatedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createPositioningEventHandlers(): PositioningEventHandlers {
  const consumers = new Set<PositioningUpdatedConsumer>();

  return {
    publish: (
      payload: PositioningUpdatedEventPayload,
      checksQueue?: PositioningChecksQueue
    ): PositioningEventDispatchResult =>
      publishPositioningUpdatedEvent(payload, consumers, checksQueue),
    consume: (consumer: PositioningUpdatedConsumer): (() => void) =>
      consumePositioningUpdatedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
