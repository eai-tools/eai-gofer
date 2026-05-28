import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRepositoryAtlas } from '../../../src/services/RepositoryAtlas.js';

describe('RepositoryAtlas', () => {
  it('discovers generic public repository metadata without internal dependencies', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-atlas-'));
    try {
      fs.mkdirSync(path.join(root, '.specify'), { recursive: true });
      fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
      fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({
          scripts: {
            build: 'tsc',
            test: 'vitest run',
            lint: 'eslint src',
          },
          dependencies: {
            next: '15.0.0',
            react: '19.0.0',
          },
        })
      );
      fs.writeFileSync(path.join(root, 'tsconfig.json'), '{}');

      const atlas = buildRepositoryAtlas(root);

      expect(atlas.repositoryName).toBe(path.basename(root));
      expect(atlas.languages).toContain('typescript');
      expect(atlas.frameworks).toEqual(expect.arrayContaining(['nextjs', 'react']));
      expect(atlas.packageManagers).toContain('npm');
      expect(atlas.testCommands).toEqual(
        expect.arrayContaining(['npm run build', 'npm run test', 'npm run lint'])
      );
      expect(atlas.hasSpecWorkspace).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
