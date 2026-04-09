import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateBusinessAndMarketArtifacts,
  type ResearchArtifactsGeneratedEventPayload,
} from '../../../extension/src/services/enterpriseai/internalApi/GenerateBusinessAndMarketArtifacts';
import { createResearchArtifactEventHandlers } from '../../../extension/src/services/enterpriseai/events/ResearchArtifactEvents';

const FEATURE_DIR = '.specify/specs/029-enterpriseai-student-vertical-builder';

function createFixtureDir(prefix: string): string {
  return path.join(
    process.cwd(),
    'tests',
    'integration',
    'enterpriseai',
    `${prefix}-${process.pid}-${Date.now()}`
  );
}

function seedDiscoveryArtifact(workspaceRoot: string): void {
  const featureDirPath = path.join(workspaceRoot, FEATURE_DIR);
  fs.mkdirSync(featureDirPath, { recursive: true });
  fs.writeFileSync(
    path.join(featureDirPath, 'discovery.md'),
    '# Discovery\nStudents need a guided EnterpriseAI deployment workflow.\n',
    'utf8'
  );
}

describe('enterpriseai market-analysis generation (root integration)', () => {
  it('generates IAP-005 + EVT-005 outputs with minimum alternatives and reference indicators', async () => {
    const fixturesDir = createFixtureDir('fixtures-market-analysis');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedDiscoveryArtifact(fixturesDir);

    try {
      const eventHandlers = createResearchArtifactEventHandlers();
      const consumedPayloads: ResearchArtifactsGeneratedEventPayload[] = [];
      const unsubscribe = eventHandlers.consume(
        (payload: ResearchArtifactsGeneratedEventPayload): void => {
          consumedPayloads.push(payload);
        }
      );

      const result = await generateBusinessAndMarketArtifacts(
        {
          runId: 'run_029_0001',
          workflowProfile: 'enterpriseai',
          includeCompetitiveAnalysis: true,
          minimumAlternativeCount: 3,
          requireSpecAndPlanReferences: true,
          discoveryArtifactPath: `${FEATURE_DIR}/discovery.md`,
          competitiveAlternatives: ['option-a', 'option-b', 'option-c'],
        },
        {
          workspaceRoot: fixturesDir,
          eventPublisher: (payload: ResearchArtifactsGeneratedEventPayload): void => {
            eventHandlers.publish(payload);
          },
        }
      );

      unsubscribe();

      expect(result.contractId).toBe('IAP-005');
      expect(result.operationName).toBe('research.generateBusinessAndMarketArtifacts');
      expect(result.response.status).toBe('completed');
      expect(result.response.businessAnalysisPath).toBe(`${FEATURE_DIR}/business-analysis.md`);
      expect(result.response.marketAnalysisPath).toBe(`${FEATURE_DIR}/market-analysis.md`);
      expect(result.response.competitiveAnalysisEnabled).toBe(true);
      expect(result.response.marketAnalysisSummary).toEqual({
        alternativeCount: 3,
        referencedInSpec: true,
        referencedInPlan: true,
      });

      const businessContent = fs.readFileSync(
        path.join(fixturesDir, result.response.businessAnalysisPath),
        'utf8'
      );
      const marketContent = fs.readFileSync(
        path.join(fixturesDir, result.response.marketAnalysisPath),
        'utf8'
      );
      expect(businessContent).toContain('EnterpriseAI-selected direction rationale');
      expect(marketContent).toContain('EnterpriseAI-selected direction rationale');

      expect(result.emittedEvent.contractId).toBe('EVT-005');
      expect(result.emittedEvent.payload.competitiveAnalysisEnabled).toBe(true);
      expect(consumedPayloads).toHaveLength(1);
      expect(consumedPayloads[0].marketAnalysisPath).toBe(`${FEATURE_DIR}/market-analysis.md`);
      expect(eventHandlers.consumerCount()).toBe(0);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('enforces minimum alternatives when competitive analysis is enabled', async () => {
    const fixturesDir = createFixtureDir('fixtures-market-analysis-minimum');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedDiscoveryArtifact(fixturesDir);

    try {
      await expect(
        generateBusinessAndMarketArtifacts(
          {
            runId: 'run_029_0002',
            workflowProfile: 'enterpriseai',
            includeCompetitiveAnalysis: true,
            minimumAlternativeCount: 3,
            requireSpecAndPlanReferences: true,
            discoveryArtifactPath: `${FEATURE_DIR}/discovery.md`,
            competitiveAlternatives: ['option-a', 'option-b'],
          },
          {
            workspaceRoot: fixturesDir,
          }
        )
      ).rejects.toThrow(/RESEARCH_MARKET_ANALYSIS_INSUFFICIENT_ALTERNATIVES/);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });
});
