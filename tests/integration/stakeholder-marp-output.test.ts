import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateStakeholderArtifacts } from '../../extension/src/services/enterpriseai/internalApi/GenerateStakeholderArtifacts';

const FEATURE_DIR = '.specify/specs/029-enterpriseai-student-vertical-builder';
const FEATURE_SPEC_PATH = `${FEATURE_DIR}/spec.md`;
const EXPECTED_MARP_PATH = `${FEATURE_DIR}/presentation.marp.md`;

function createFixtureDir(prefix: string): string {
  return path.join(process.cwd(), 'tests', 'integration', `${prefix}-${process.pid}-${Date.now()}`);
}

function seedStakeholderInputs(workspaceRoot: string): void {
  const featureDirPath = path.join(workspaceRoot, FEATURE_DIR);
  fs.mkdirSync(featureDirPath, { recursive: true });
  fs.writeFileSync(
    path.join(featureDirPath, 'discovery.md'),
    '# Discovery\nProblem statement for EnterpriseAI student delivery.\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(featureDirPath, 'spec.md'),
    '# Spec\nEnterpriseAI solution overview with integration boundaries.\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(featureDirPath, 'plan.md'),
    '# Plan\nArchitecture diagram reference and deployment sequencing.\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(featureDirPath, 'implementation-summary.md'),
    '# Implementation\nDemo-ready implementation summary with measurable outcomes.\n',
    'utf8'
  );
}

describe('stakeholder marp output location (root integration)', () => {
  it('emits presentation.marp.md in the feature spec directory for IAP-007/EVT-007', async () => {
    const fixturesDir = createFixtureDir('fixtures-stakeholder-marp-output');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedStakeholderInputs(fixturesDir);

    try {
      const result = await generateStakeholderArtifacts(
        {
          runId: 'run_029_0001',
          workflowProfile: 'enterpriseai',
          enableMarpDeck: true,
          inputArtifacts: {
            discovery: `${FEATURE_DIR}/discovery.md`,
            spec: FEATURE_SPEC_PATH,
            plan: `${FEATURE_DIR}/plan.md`,
            implementationSummary: `${FEATURE_DIR}/implementation-summary.md`,
          },
        },
        {
          workspaceRoot: fixturesDir,
        }
      );

      expect(result.contractId).toBe('IAP-007');
      expect(result.operationName).toBe('comms.generateStakeholderArtifacts');
      expect(result.response.marpEnabled).toBe(true);
      expect(result.response.marpDeckGenerated).toBe(true);
      expect(result.response.marpDeckPath).toBe(EXPECTED_MARP_PATH);
      expect(result.emittedEvent.contractId).toBe('EVT-007');
      expect(result.emittedEvent.payload.marpDeckPath).toBe(EXPECTED_MARP_PATH);

      const marpDeckContent = fs.readFileSync(path.join(fixturesDir, EXPECTED_MARP_PATH), 'utf8');
      expect(marpDeckContent).toContain('marp: true');
      expect(marpDeckContent).toContain('Problem Statement');
      expect(marpDeckContent).toContain('Problem statement for EnterpriseAI student delivery.');
      expect(marpDeckContent).toContain(
        'EnterpriseAI solution overview with integration boundaries.'
      );
      expect(marpDeckContent).toContain(
        'Architecture diagram reference and deployment sequencing.'
      );
      expect(marpDeckContent).toContain(
        'Demo-ready implementation summary with measurable outcomes.'
      );
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });
});
