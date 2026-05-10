import {
  type EventContractId,
  validateEventPayload,
  type PayloadValidationResult,
} from './EventPayloadSchemas';

export interface ProducerConsumerEventPayload {
  contractId: EventContractId;
  producerPayload: unknown;
  consumerPayload: unknown;
}

export interface ProducerConsumerEventPayloadValidationResult {
  contractId: EventContractId;
  producerValid: boolean;
  consumerValid: boolean;
  compatible: boolean;
  errors: string[];
}

const IDENTITY_FIELDS = ['eventId', 'runId', 'changeSetId', 'releaseId', 'decisionId'] as const;

type IdentityField = (typeof IDENTITY_FIELDS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function compareIdentityFields(producerPayload: unknown, consumerPayload: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(producerPayload) || !isRecord(consumerPayload)) {
    return errors;
  }

  for (const field of IDENTITY_FIELDS) {
    if (!(field in producerPayload) || !(field in consumerPayload)) {
      continue;
    }

    const producerValue = producerPayload[field as IdentityField];
    const consumerValue = consumerPayload[field as IdentityField];

    if (producerValue !== consumerValue) {
      errors.push(
        `Identity mismatch for ${field}: producer=${String(producerValue)} consumer=${String(
          consumerValue
        )}.`
      );
    }
  }

  return errors;
}

function prefixErrors(prefix: string, result: PayloadValidationResult): string[] {
  return result.errors.map((error) => `${prefix}: ${error}`);
}

export function validateProducerConsumerEventPayloads(
  contractId: EventContractId,
  producerPayload: unknown,
  consumerPayload: unknown
): ProducerConsumerEventPayloadValidationResult {
  const producerValidation = validateEventPayload(contractId, producerPayload);
  const consumerValidation = validateEventPayload(contractId, consumerPayload);

  const errors: string[] = [
    ...prefixErrors('producer', producerValidation),
    ...prefixErrors('consumer', consumerValidation),
  ];

  errors.push(...compareIdentityFields(producerPayload, consumerPayload));

  return {
    contractId,
    producerValid: producerValidation.valid,
    consumerValid: consumerValidation.valid,
    compatible: errors.length === 0,
    errors,
  };
}

export function validateProducerConsumerEventPayloadBatch(
  payloads: readonly ProducerConsumerEventPayload[]
): ProducerConsumerEventPayloadValidationResult[] {
  return payloads.map((payload) =>
    validateProducerConsumerEventPayloads(
      payload.contractId,
      payload.producerPayload,
      payload.consumerPayload
    )
  );
}
