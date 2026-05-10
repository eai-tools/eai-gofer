import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type DeploymentReadinessValidatedEventPayload } from '../internalApi/ValidateDeploymentReadiness';

export type DeploymentReadinessValidatedConsumer = (
  payload: DeploymentReadinessValidatedEventPayload
) => void;

export interface DeploymentReadinessEventHandlers {
  publish: (payload: DeploymentReadinessValidatedEventPayload) => void;
  consume: (consumer: DeploymentReadinessValidatedConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidDeploymentReadinessPayload(
  payload: DeploymentReadinessValidatedEventPayload
): void {
  const validation = validateEventPayload('EVT-012', payload);
  if (!validation.valid) {
    throw new Error(`EVT-012 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

export function publishDeploymentReadinessValidatedEvent(
  payload: DeploymentReadinessValidatedEventPayload,
  consumers: ReadonlySet<DeploymentReadinessValidatedConsumer>
): void {
  assertValidDeploymentReadinessPayload(payload);

  for (const consumer of consumers) {
    consumer(payload);
  }
}

export function consumeDeploymentReadinessValidatedEvent(
  consumer: DeploymentReadinessValidatedConsumer,
  consumers: Set<DeploymentReadinessValidatedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createDeploymentReadinessEventHandlers(): DeploymentReadinessEventHandlers {
  const consumers = new Set<DeploymentReadinessValidatedConsumer>();

  return {
    publish: (payload: DeploymentReadinessValidatedEventPayload): void => {
      publishDeploymentReadinessValidatedEvent(payload, consumers);
    },
    consume: (consumer: DeploymentReadinessValidatedConsumer): (() => void) =>
      consumeDeploymentReadinessValidatedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
