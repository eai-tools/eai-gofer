export type EnterpriseAiEntityName =
  | 'WorkflowProfileConfig'
  | 'PipelineRun'
  | 'EaiReferenceSource'
  | 'ArchitectureDecision'
  | 'ArtifactRecord'
  | 'TaskItem'
  | 'MirrorPropagationRecord'
  | 'CapabilityRemovalApprovalRecord';

export interface EntityImplementationMapping {
  entityName: EnterpriseAiEntityName;
  modelPath: string;
  validatorFunction: string;
  persistenceComponent?: string;
}

export const ENTERPRISEAI_ENTITY_MAPPINGS: readonly EntityImplementationMapping[] = [
  {
    entityName: 'WorkflowProfileConfig',
    modelPath: 'extension/src/services/enterpriseai/models/Workflow.ts',
    validatorFunction: 'validateWorkflowProfileConfig',
  },
  {
    entityName: 'PipelineRun',
    modelPath: 'extension/src/services/enterpriseai/models/Workflow.ts',
    validatorFunction: 'validatePipelineRun',
  },
  {
    entityName: 'EaiReferenceSource',
    modelPath: 'extension/src/services/enterpriseai/models/Governance.ts',
    validatorFunction: 'validateEaiReferenceSource',
  },
  {
    entityName: 'ArchitectureDecision',
    modelPath: 'extension/src/services/enterpriseai/models/Governance.ts',
    validatorFunction: 'validateArchitectureDecision',
  },
  {
    entityName: 'ArtifactRecord',
    modelPath: 'extension/src/services/enterpriseai/models/Artifacts.ts',
    validatorFunction: 'validateArtifactRecord',
  },
  {
    entityName: 'TaskItem',
    modelPath: 'extension/src/services/enterpriseai/models/Artifacts.ts',
    validatorFunction: 'validateTaskItem',
  },
  {
    entityName: 'MirrorPropagationRecord',
    modelPath: 'extension/src/services/enterpriseai/models/Propagation.ts',
    validatorFunction: 'validateMirrorPropagationRecord',
  },
  {
    entityName: 'CapabilityRemovalApprovalRecord',
    modelPath: 'extension/src/services/enterpriseai/models/Propagation.ts',
    validatorFunction: 'validateCapabilityRemovalApprovalRecord',
    persistenceComponent:
      'extension/src/services/enterpriseai/persistence/CapabilityRemovalApprovalStore.ts',
  },
] as const;

export function listEntityMappings(): readonly EntityImplementationMapping[] {
  return ENTERPRISEAI_ENTITY_MAPPINGS;
}

export function getEntityMapping(entityName: EnterpriseAiEntityName): EntityImplementationMapping {
  const mapping = ENTERPRISEAI_ENTITY_MAPPINGS.find((item) => item.entityName === entityName);

  if (!mapping) {
    throw new Error(`No EnterpriseAI entity mapping found for ${entityName}.`);
  }

  return mapping;
}

export function validateEntityMappings(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (ENTERPRISEAI_ENTITY_MAPPINGS.length !== 8) {
    errors.push('Entity mapping list must contain exactly 8 entries.');
  }

  const requiredEntities: readonly EnterpriseAiEntityName[] = [
    'WorkflowProfileConfig',
    'PipelineRun',
    'EaiReferenceSource',
    'ArchitectureDecision',
    'ArtifactRecord',
    'TaskItem',
    'MirrorPropagationRecord',
    'CapabilityRemovalApprovalRecord',
  ];

  for (const entity of requiredEntities) {
    const exists = ENTERPRISEAI_ENTITY_MAPPINGS.some((item) => item.entityName === entity);
    if (!exists) {
      errors.push(`Missing entity mapping for ${entity}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
