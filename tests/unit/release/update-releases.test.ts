import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SOURCE_SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/update-releases.js');

interface ReleaseEntry {
  version: string;
  tag_name: string;
  published_at: string;
  download_url: string;
  notes: string;
  prerelease: boolean;
  size_mb: number;
}

interface ReleasesJson {
  latest_version: string;
  repository: string;
  last_updated: string;
  releases: ReleaseEntry[];
}

function readReleasesJson(releasesPath: string): ReleasesJson {
  return JSON.parse(fs.readFileSync(releasesPath, 'utf8')) as ReleasesJson;
}

describe('update-releases.js', () => {
  let tmpRoot: string;
  let docsSiteStaticDir: string;
  let releasesPath: string;
  let scriptPath: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'update-releases-test-'));
    docsSiteStaticDir = path.join(tmpRoot, 'docs-site', 'static');
    releasesPath = path.join(docsSiteStaticDir, 'releases.json');
    scriptPath = path.join(tmpRoot, 'scripts', 'update-releases.js');

    fs.mkdirSync(path.join(docsSiteStaticDir, 'releases'), { recursive: true });
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
    fs.copyFileSync(SOURCE_SCRIPT_PATH, scriptPath);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('dedupes an existing version before prepending the new release entry', async () => {
    const duplicateVersion = '3.2.0';
    const duplicateVsixPath = path.join(
      docsSiteStaticDir,
      'releases',
      `eai-gofer-${duplicateVersion}.vsix`
    );

    fs.writeFileSync(
      releasesPath,
      JSON.stringify(
        {
          latest_version: '3.1.9',
          repository: 'eai-tools/eai-gofer',
          last_updated: '2026-05-01T00:00:00.000Z',
          releases: [
            {
              version: duplicateVersion,
              tag_name: `v${duplicateVersion}`,
              published_at: '2026-05-01T00:00:00.000Z',
              download_url: 'https://example.invalid/old.vsix',
              notes: 'Old notes',
              prerelease: false,
              size_mb: 8.5,
            },
            {
              version: '3.1.9',
              tag_name: 'v3.1.9',
              published_at: '2026-04-30T00:00:00.000Z',
              download_url:
                'https://github.com/eai-tools/eai-gofer/releases/download/v3.1.9/eai-gofer-3.1.9.vsix',
              notes: 'Previous release',
              prerelease: false,
              size_mb: 8.5,
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(duplicateVsixPath, Buffer.alloc(1024 * 1024));

    await execFileAsync('node', [scriptPath, duplicateVersion, 'Fresh release notes']);

    const updated = readReleasesJson(releasesPath);
    const matchingEntries = updated.releases.filter(
      (release) => release.version === duplicateVersion
    );

    expect(updated.latest_version).toBe(duplicateVersion);
    expect(matchingEntries).toHaveLength(1);
    expect(updated.releases[0].tag_name).toBe(`v${duplicateVersion}`);
    expect(updated.releases[0].notes).toBe('Fresh release notes');
    expect(updated.releases[0].download_url).toBe(
      `https://github.com/eai-tools/eai-gofer/releases/download/v${duplicateVersion}/eai-gofer-${duplicateVersion}.vsix`
    );
    expect(updated.releases[0].size_mb).toBe(1);
    expect(updated.releases[1].version).toBe('3.1.9');
  });

  it('honors a custom download URL when one is provided', async () => {
    const version = '3.2.1';
    const customUrl =
      'https://github.com/eai-tools/eai-gofer/releases/download/v3.2.1/eai-gofer-3.2.1.vsix';

    fs.writeFileSync(
      releasesPath,
      JSON.stringify(
        {
          latest_version: '3.2.0',
          repository: 'eai-tools/eai-gofer',
          last_updated: '2026-05-01T00:00:00.000Z',
          releases: [],
        },
        null,
        2
      )
    );

    await execFileAsync('node', [scriptPath, version, 'Release notes', customUrl]);

    const updated = readReleasesJson(releasesPath);

    expect(updated.latest_version).toBe(version);
    expect(updated.releases[0].download_url).toBe(customUrl);
    expect(updated.releases[0].tag_name).toBe(`v${version}`);
  });
});
