import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { type CompatibilityParityCompletedEventPayload } from '../internalApi/RunCompatibilityAndParityGate';

export type CompatibilityParityCompletedConsumer = (
  payload: CompatibilityParityCompletedEventPayload
) => void;

export interface CompatibilityParityGateOutcome {
  releaseAllowed: boolean;
  reasons: readonly string[];
}

export type CompatibilityParityGateEvaluator = (
  payload: CompatibilityParityCompletedEventPayload
) => CompatibilityParityGateOutcome;

export interface CompatibilityParityEventHandlers {
  publish: (
    payload: CompatibilityParityCompletedEventPayload,
    gateEvaluator?: CompatibilityParityGateEvaluator
  ) => CompatibilityParityGateOutcome;
  consume: (consumer: CompatibilityParityCompletedConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidCompatibilityParityPayload(
  payload: CompatibilityParityCompletedEventPayload
): void {
  const validation = validateEventPayload('EVT-010', payload);
  if (!validation.valid) {
    throw new Error(`EVT-010 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function buildDefaultOutcome(
  payload: CompatibilityParityCompletedEventPayload
): CompatibilityParityGateOutcome {
  const reasons: string[] = [];

  if (payload.parityResult === 'failed') {
    reasons.push('EVT_PARITY_FAILED: parity result failed.');
  }

  if (payload.regressionResult === 'failed') {
    reasons.push('EVT_REGRESSION_FAILED: regression result failed.');
  }

  return {
    releaseAllowed: reasons.length === 0,
    reasons,
  };
}

export function publishCompatibilityParityCompletedEvent(
  payload: CompatibilityParityCompletedEventPayload,
  consumers: ReadonlySet<CompatibilityParityCompletedConsumer>,
  gateEvaluator?: CompatibilityParityGateEvaluator
): CompatibilityParityGateOutcome {
  assertValidCompatibilityParityPayload(payload);

  for (const consumer of consumers) {
    consumer(payload);
  }

  const outcome = gateEvaluator ? gateEvaluator(payload) : buildDefaultOutcome(payload);
  if (!outcome.releaseAllowed) {
    throw new Error(outcome.reasons.join(' '));
  }

  return outcome;
}

export function consumeCompatibilityParityCompletedEvent(
  consumer: CompatibilityParityCompletedConsumer,
  consumers: Set<CompatibilityParityCompletedConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createCompatibilityParityEventHandlers(): CompatibilityParityEventHandlers {
  const consumers = new Set<CompatibilityParityCompletedConsumer>();

  return {
    publish: (
      payload: CompatibilityParityCompletedEventPayload,
      gateEvaluator?: CompatibilityParityGateEvaluator
    ): CompatibilityParityGateOutcome =>
      publishCompatibilityParityCompletedEvent(payload, consumers, gateEvaluator),
    consume: (consumer: CompatibilityParityCompletedConsumer): (() => void) =>
      consumeCompatibilityParityCompletedEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
