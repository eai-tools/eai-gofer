import { validateEventPayload } from '../contracts/EventPayloadSchemas';

export interface CapabilityRemovalApprovalRequiredEventPayload {
  eventId: string;
  changeSetId: string;
  affectedCapability: string;
  requiresExplicitApproval: boolean;
  blocking: boolean;
}

export type CapabilityRemovalApprovalRequiredConsumer = (
  payload: CapabilityRemovalApprovalRequiredEventPayload
) => boolean | void;

export type CapabilityRemovalApprovalResolver = (
  payload: CapabilityRemovalApprovalRequiredEventPayload
) => boolean;

export interface CapabilityRemovalBlockingResult {
  blocked: boolean;
  acknowledged: boolean;
  approvalPresent: boolean;
}

export interface CapabilityRemovalEventHandlers {
  publish: (
    payload: CapabilityRemovalApprovalRequiredEventPayload,
    approvalResolver?: CapabilityRemovalApprovalResolver
  ) => CapabilityRemovalBlockingResult;
  consume: (consumer: CapabilityRemovalApprovalRequiredConsumer) => () => void;
  consumerCount: () => number;
}

function assertValidCapabilityRemovalPayload(
  payload: CapabilityRemovalApprovalRequiredEventPayload
): void {
  const validation = validateEventPayload('EVT-011', payload);
  if (!validation.valid) {
    throw new Error(`EVT-011 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

export function publishCapabilityRemovalApprovalRequiredEvent(
  payload: CapabilityRemovalApprovalRequiredEventPayload,
  consumers: ReadonlySet<CapabilityRemovalApprovalRequiredConsumer>,
  approvalResolver?: CapabilityRemovalApprovalResolver
): CapabilityRemovalBlockingResult {
  assertValidCapabilityRemovalPayload(payload);

  let acknowledged = false;
  for (const consumer of consumers) {
    const consumerResult = consumer(payload);
    if (consumerResult !== false) {
      acknowledged = true;
    }
  }

  const requiresBlocking = payload.requiresExplicitApproval && payload.blocking;
  const approvalPresent = requiresBlocking
    ? approvalResolver
      ? approvalResolver(payload)
      : false
    : true;

  if (requiresBlocking && !acknowledged) {
    throw new Error(
      `EVT_APPROVAL_EVENT_NOT_ACKED: ${payload.affectedCapability} did not receive an approval consumer acknowledgment.`
    );
  }

  if (requiresBlocking && !approvalPresent) {
    throw new Error(
      `VAL_REMOVAL_APPROVAL_MISSING: ${payload.affectedCapability} is blocked until explicit approval is recorded.`
    );
  }

  return {
    blocked: false,
    acknowledged,
    approvalPresent,
  };
}

export function consumeCapabilityRemovalApprovalRequiredEvent(
  consumer: CapabilityRemovalApprovalRequiredConsumer,
  consumers: Set<CapabilityRemovalApprovalRequiredConsumer>
): () => void {
  consumers.add(consumer);

  return (): void => {
    consumers.delete(consumer);
  };
}

export function createCapabilityRemovalEventHandlers(): CapabilityRemovalEventHandlers {
  const consumers = new Set<CapabilityRemovalApprovalRequiredConsumer>();

  return {
    publish: (
      payload: CapabilityRemovalApprovalRequiredEventPayload,
      approvalResolver?: CapabilityRemovalApprovalResolver
    ): CapabilityRemovalBlockingResult =>
      publishCapabilityRemovalApprovalRequiredEvent(payload, consumers, approvalResolver),
    consume: (consumer: CapabilityRemovalApprovalRequiredConsumer): (() => void) =>
      consumeCapabilityRemovalApprovalRequiredEvent(consumer, consumers),
    consumerCount: (): number => consumers.size,
  };
}
