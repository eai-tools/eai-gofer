import 'reflect-metadata';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { VersionDetector } = require('./dist-repro/extension/src/services/migration/VersionDetector.cjs');
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock Logger
const logger = {
  debug: (...args) => console.log('DEBUG:', ...args),
  info: (...args) => console.log('INFO:', ...args),
  warn: (...args) => console.log('WARN:', ...args),
  error: (...args) => console.log('ERROR:', ...args),
};

async function run() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'version-detector-repro-'));
  console.log(`Created temp dir: ${tempDir}`);
  
  try {
    const detector = new VersionDetector(logger);

    // 1. Test None
    console.log('\n--- Testing None ---');
    let format = await detector.detectFormat(tempDir);
    console.log(`Format (expected none): ${format}`);

    // 2. Test Gofer
    console.log('\n--- Testing Gofer ---');
    const specifyDir = path.join(tempDir, '.specify');
    await fs.mkdir(path.join(specifyDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(specifyDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(specifyDir, 'templates'), { recursive: true });
    
    format = await detector.detectFormat(tempDir);
    console.log(`Format (expected gofer): ${format}`);

    // 3. Test Legacy JSON
    console.log('\n--- Testing Legacy JSON ---');
    await fs.rm(specifyDir, { recursive: true, force: true });
    await fs.mkdir(specifyDir, { recursive: true });
    await fs.writeFile(path.join(specifyDir, 'test.json'), '{}');
    
    format = await detector.detectFormat(tempDir);
    console.log(`Format (expected legacy-json): ${format}`);

    // 4. Test Mixed
    console.log('\n--- Testing Mixed ---');
    await fs.mkdir(path.join(specifyDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(specifyDir, 'memory'), { recursive: true });
    await fs.mkdir(path.join(specifyDir, 'templates'), { recursive: true });
    // test.json still exists
    
    format = await detector.detectFormat(tempDir);
    console.log(`Format (expected mixed): ${format}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

run();
