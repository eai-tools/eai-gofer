import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  generateBusinessAndMarketArtifacts,
  type ResearchArtifactsGeneratedEventPayload,
} from '../../../services/enterpriseai/internalApi/GenerateBusinessAndMarketArtifacts';
import { createResearchArtifactEventHandlers } from '../../../services/enterpriseai/events/ResearchArtifactEvents';

const FEATURE_DIR = '.specify/specs/029-enterpriseai-student-vertical-builder';

async function seedDiscoveryArtifact(workspaceRoot: string): Promise<void> {
  const featureDirPath = path.join(workspaceRoot, FEATURE_DIR);
  await fs.mkdir(featureDirPath, { recursive: true });
  await fs.writeFile(
    path.join(featureDirPath, 'discovery.md'),
    '# Discovery\nStudents need a guided EnterpriseAI deployment workflow.\n',
    'utf8'
  );
}

suite('enterpriseai market-analysis stage flag continuity (extension integration)', () => {
  const fixturesDir = path.join(__dirname, 'fixtures-market-analysis-flag');

  setup(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
    await seedDiscoveryArtifact(fixturesDir);
  });

  teardown(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  test('continues pipeline behavior when competitive analysis is disabled', async () => {
    const eventHandlers = createResearchArtifactEventHandlers();
    const consumedPayloads: ResearchArtifactsGeneratedEventPayload[] = [];
    const unsubscribe = eventHandlers.consume(
      (payload: ResearchArtifactsGeneratedEventPayload): void => {
        consumedPayloads.push(payload);
      }
    );

    const result = await generateBusinessAndMarketArtifacts(
      {
        runId: 'run_029_0003',
        workflowProfile: 'enterpriseai',
        includeCompetitiveAnalysis: false,
        minimumAlternativeCount: 3,
        requireSpecAndPlanReferences: true,
        discoveryArtifactPath: `${FEATURE_DIR}/discovery.md`,
      },
      {
        workspaceRoot: fixturesDir,
        eventPublisher: (payload: ResearchArtifactsGeneratedEventPayload): void => {
          eventHandlers.publish(payload);
        },
      }
    );

    unsubscribe();

    assert.strictEqual(result.contractId, 'IAP-005');
    assert.strictEqual(result.operationName, 'research.generateBusinessAndMarketArtifacts');
    assert.strictEqual(result.response.status, 'completed');
    assert.strictEqual(result.response.competitiveAnalysisEnabled, false);
    assert.strictEqual(result.response.marketAnalysisSummary, undefined);
    assert.strictEqual(result.response.businessAnalysisPath, `${FEATURE_DIR}/business-analysis.md`);
    assert.strictEqual(result.response.marketAnalysisPath, `${FEATURE_DIR}/market-analysis.md`);

    const businessContent = await fs.readFile(
      path.join(fixturesDir, result.response.businessAnalysisPath),
      'utf8'
    );
    const marketContent = await fs.readFile(
      path.join(fixturesDir, result.response.marketAnalysisPath),
      'utf8'
    );
    assert.ok(businessContent.includes('EnterpriseAI-selected direction rationale'));
    assert.ok(marketContent.includes('EnterpriseAI-selected direction rationale'));

    assert.strictEqual(result.emittedEvent.contractId, 'EVT-005');
    assert.strictEqual(result.emittedEvent.payload.competitiveAnalysisEnabled, false);
    assert.strictEqual(consumedPayloads.length, 1);
    assert.strictEqual(consumedPayloads[0].competitiveAnalysisEnabled, false);
    assert.strictEqual(eventHandlers.consumerCount(), 0);
  });
});
