import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type StakeholderCommsGeneratedEventPayload } from '../internalApi/GenerateStakeholderArtifacts';

export type StakeholderCommsGeneratedConsumer = (
  payload: StakeholderCommsGeneratedEventPayload
) => void;

export interface StakeholderCommsEventHandlers {
  publish: (payload: StakeholderCommsGeneratedEventPayload) => void;
  consume: (consumer: StakeholderCommsGeneratedConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidStakeholderCommsEventPayload(
  payload: StakeholderCommsGeneratedEventPayload
): void {
  const validation = validateEventPayload('EVT-007', payload);
  if (!validation.valid) {
    const hasArtifactPathError = validation.errors.some((error: string): boolean =>
      /(releaseNotesPath|demoScriptPath|marpDeckPath)/.test(error)
    );
    if (hasArtifactPathError) {
      throw new Error(`EVT_COMMS_ARTIFACT_MISSING: ${validation.errors.join(' ')}`);
    }
    throw new Error(`EVT_MARP_VALIDATION_FAILED: ${validation.errors.join(' ')}`);
  }
}

export function publishStakeholderCommsGeneratedEvent(
  payload: StakeholderCommsGeneratedEventPayload,
  consumers: ReadonlySet<StakeholderCommsGeneratedConsumer>
): void {
  assertValidStakeholderCommsEventPayload(payload);

  const consumerErrors: string[] = [];
  for (const consumer of consumers) {
    try {
      consumer(payload);
    } catch (error) {
      consumerErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (consumerErrors.length > 0) {
    throw new Error(
      `EVT_COMMS_CONSUMER_FAILED: stakeholder comms event consumers failed - ${consumerErrors.join('; ')}`
    );
  }
}

export function consumeStakeholderCommsGeneratedEvent(
  consumer: StakeholderCommsGeneratedConsumer,
  consumers: Set<StakeholderCommsGeneratedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createStakeholderCommsEventHandlers(): StakeholderCommsEventHandlers {
  const consumers = new Set<StakeholderCommsGeneratedConsumer>();

  return {
    publish: (payload: StakeholderCommsGeneratedEventPayload): void => {
      publishStakeholderCommsGeneratedEvent(payload, consumers);
    },
    consume: (consumer: StakeholderCommsGeneratedConsumer): (() => void) =>
      consumeStakeholderCommsGeneratedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
