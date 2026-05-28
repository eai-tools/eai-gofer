import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const TRACEABILITY_FIXTURE_DIR = path.join(
  TESTS_ROOT,
  'fixtures',
  'traceability',
  'public-pipeline'
);

export const TRACEABILITY_SPEC_PATH = path.join(TRACEABILITY_FIXTURE_DIR, 'spec.md');
export const TRACEABILITY_TASKS_PATH = path.join(TRACEABILITY_FIXTURE_DIR, 'tasks.md');
export const TRACEABILITY_QUICKSTART_PATH = path.join(TRACEABILITY_FIXTURE_DIR, 'quickstart.md');
