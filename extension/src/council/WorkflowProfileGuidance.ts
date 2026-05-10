import { type WorkflowProfile } from '../config/workflowProfile';

function readWorkflowProfile(value: unknown): WorkflowProfile | null {
  if (value === 'standard' || value === 'enterpriseai') {
    return value;
  }
  return null;
}

function readWorkflowProfileArray(value: unknown): WorkflowProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry: unknown): WorkflowProfile | null => readWorkflowProfile(entry))
    .filter((entry: WorkflowProfile | null): entry is WorkflowProfile => entry !== null);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function extractDeclaredWorkflowProfiles(
  frontmatter: Record<string, unknown>
): WorkflowProfile[] {
  const profiles = new Set<WorkflowProfile>();
  const frontmatterRecord = asRecord(frontmatter);
  const goferMetadata = asRecord(frontmatterRecord.gofer);

  const directProfile = readWorkflowProfile(frontmatterRecord.workflowProfile);
  if (directProfile) {
    profiles.add(directProfile);
  }

  const goferProfile = readWorkflowProfile(goferMetadata.workflowProfile);
  if (goferProfile) {
    profiles.add(goferProfile);
  }

  for (const profile of readWorkflowProfileArray(frontmatterRecord.workflowProfiles)) {
    profiles.add(profile);
  }

  for (const profile of readWorkflowProfileArray(goferMetadata.workflowProfiles)) {
    profiles.add(profile);
  }

  return Array.from(profiles);
}

export function isWorkflowProfileCompatible(
  frontmatter: Record<string, unknown>,
  workflowProfile: WorkflowProfile
): boolean {
  const declaredProfiles = extractDeclaredWorkflowProfiles(frontmatter);
  if (declaredProfiles.length < 1) {
    return true;
  }

  return declaredProfiles.includes(workflowProfile);
}

export function selectGuidanceForWorkflowProfile(
  content: string,
  workflowProfile: WorkflowProfile
): string {
  const profileBlockPattern =
    /<!--\s*gofer:profile=(standard|enterpriseai):start\s*-->([\s\S]*?)<!--\s*gofer:profile:end\s*-->/g;
  if (!profileBlockPattern.test(content)) {
    return content;
  }

  profileBlockPattern.lastIndex = 0;
  return content.replace(
    profileBlockPattern,
    (_match: string, blockProfile: WorkflowProfile, blockContent: string): string => {
      return blockProfile === workflowProfile ? blockContent : '';
    }
  );
}
