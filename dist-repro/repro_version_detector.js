import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { VersionDetector } from './extension/src/services/migration/VersionDetector.js';
// Mock Logger
const logger = {
    debug: (...args) => console.log('DEBUG:', ...args),
    info: (...args) => console.log('INFO:', ...args),
    warn: (...args) => console.log('WARN:', ...args),
    error: (...args) => console.log('ERROR:', ...args),
};
async function run() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'version-detector-repro-'));
    try {
        const detector = new VersionDetector(logger);
        // 1. Test None
        let format = await detector.detectFormat(tempDir);
        // 2. Test Gofer
        const specifyDir = path.join(tempDir, '.specify');
        await fs.mkdir(path.join(specifyDir, 'specs'), { recursive: true });
        await fs.mkdir(path.join(specifyDir, 'memory'), { recursive: true });
        await fs.mkdir(path.join(specifyDir, 'templates'), { recursive: true });
        format = await detector.detectFormat(tempDir);
        // 3. Test Legacy JSON
        await fs.rm(specifyDir, { recursive: true, force: true });
        await fs.mkdir(specifyDir, { recursive: true });
        await fs.writeFile(path.join(specifyDir, 'test.json'), '{}');
        format = await detector.detectFormat(tempDir);
        // 4. Test Mixed
        await fs.mkdir(path.join(specifyDir, 'specs'), { recursive: true });
        await fs.mkdir(path.join(specifyDir, 'memory'), { recursive: true });
        await fs.mkdir(path.join(specifyDir, 'templates'), { recursive: true });
        // test.json still exists
        format = await detector.detectFormat(tempDir);
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}
run();
