import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

/**
 * Tests for release verification logic used by release-auto.sh.
 *
 * These tests validate the same parsing logic the release script uses
 * (via `node -e`) to verify that releases.json is correct after deployment.
 */

interface ReleaseEntry {
  version: string;
  tag_name: string;
  download_url: string;
  notes: string;
  prerelease: boolean;
  size_mb: number;
}

interface ReleasesJson {
  latest_version: string;
  repository: string;
  releases: ReleaseEntry[];
}

/** Extracts latest_version from releases.json (mirrors release-auto.sh logic) */
function extractLatestVersion(json: ReleasesJson): string {
  return json.latest_version || 'MISSING';
}

/** Extracts download_url for a specific version (mirrors release-auto.sh logic) */
function extractDownloadUrl(json: ReleasesJson, version: string): string {
  const release = json.releases?.find((r) => r.version === version);
  return release?.download_url || 'MISSING';
}

/** Builds expected VSIX URL from version (mirrors release-auto.sh logic) */
function buildExpectedVsixUrl(version: string): string {
  return `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-${version}.vsix`;
}

const VALID_RELEASES_JSON: ReleasesJson = {
  latest_version: '1.16.1',
  repository: 'eai-tools/eai-gofer',
  releases: [
    {
      version: '1.16.1',
      tag_name: 'v1.16.1',
      download_url: 'https://eai-tools.github.io/eai-gofer/releases/eai-gofer-1.16.1.vsix',
      notes: 'Fix validation findings',
      prerelease: false,
      size_mb: 30.3,
    },
    {
      version: '1.16.0',
      tag_name: 'v1.16.0',
      download_url: 'https://eai-tools.github.io/eai-gofer/releases/eai-gofer-1.16.0.vsix',
      notes: 'Auto-generate AI instruction files',
      prerelease: false,
      size_mb: 30.3,
    },
  ],
};

const RELEASE_AUTO_SCRIPT = readFileSync(
  path.resolve(__dirname, '../../../release-auto.sh'),
  'utf-8'
);

describe('Release Verification', () => {
  describe('extractLatestVersion', () => {
    it('should extract latest_version from valid releases.json', () => {
      expect(extractLatestVersion(VALID_RELEASES_JSON)).toBe('1.16.1');
    });

    it('should return MISSING when latest_version is empty', () => {
      const json = { ...VALID_RELEASES_JSON, latest_version: '' };
      expect(extractLatestVersion(json)).toBe('MISSING');
    });

    it('should return MISSING when latest_version is undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = { ...VALID_RELEASES_JSON, latest_version: undefined as any };
      expect(extractLatestVersion(json)).toBe('MISSING');
    });

    it('should return MISSING when latest_version is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = { ...VALID_RELEASES_JSON, latest_version: null as any };
      expect(extractLatestVersion(json)).toBe('MISSING');
    });
  });

  describe('extractDownloadUrl', () => {
    it('should extract download_url for an existing version', () => {
      const url = extractDownloadUrl(VALID_RELEASES_JSON, '1.16.1');
      expect(url).toBe('https://eai-tools.github.io/eai-gofer/releases/eai-gofer-1.16.1.vsix');
    });

    it('should extract download_url for an older version', () => {
      const url = extractDownloadUrl(VALID_RELEASES_JSON, '1.16.0');
      expect(url).toBe('https://eai-tools.github.io/eai-gofer/releases/eai-gofer-1.16.0.vsix');
    });

    it('should return MISSING for a version not in releases', () => {
      const url = extractDownloadUrl(VALID_RELEASES_JSON, '99.99.99');
      expect(url).toBe('MISSING');
    });

    it('should return MISSING when releases array is empty', () => {
      const json = { ...VALID_RELEASES_JSON, releases: [] };
      expect(extractDownloadUrl(json, '1.16.1')).toBe('MISSING');
    });

    it('should return MISSING when releases is undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = { ...VALID_RELEASES_JSON, releases: undefined as any };
      expect(extractDownloadUrl(json, '1.16.1')).toBe('MISSING');
    });

    it('should return MISSING when releases is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = { ...VALID_RELEASES_JSON, releases: null as any };
      expect(extractDownloadUrl(json, '1.16.1')).toBe('MISSING');
    });
  });

  describe('buildExpectedVsixUrl', () => {
    it('should build correct GitHub Pages URL from version', () => {
      expect(buildExpectedVsixUrl('1.16.1')).toBe(
        'https://eai-tools.github.io/eai-gofer/releases/eai-gofer-1.16.1.vsix'
      );
    });

    it('should handle major version bumps', () => {
      expect(buildExpectedVsixUrl('2.0.0')).toBe(
        'https://eai-tools.github.io/eai-gofer/releases/eai-gofer-2.0.0.vsix'
      );
    });
  });

  describe('version mismatch detection', () => {
    it('should detect when latest_version matches expected', () => {
      const expected = '1.16.1';
      const actual = extractLatestVersion(VALID_RELEASES_JSON);
      expect(actual).toBe(expected);
    });

    it('should detect version mismatch', () => {
      const expected = '2.0.0';
      const actual = extractLatestVersion(VALID_RELEASES_JSON);
      expect(actual).not.toBe(expected);
    });
  });

  describe('download URL validation', () => {
    it('should match expected URL when releases.json is correct', () => {
      const version = '1.16.1';
      const expectedUrl = buildExpectedVsixUrl(version);
      const actualUrl = extractDownloadUrl(VALID_RELEASES_JSON, version);
      expect(actualUrl).toBe(expectedUrl);
    });

    it('should detect URL mismatch when download_url points elsewhere', () => {
      const json: ReleasesJson = {
        ...VALID_RELEASES_JSON,
        releases: [
          {
            ...VALID_RELEASES_JSON.releases[0],
            download_url:
              'https://github.com/eai-tools/eai-gofer/releases/download/v1.16.1/gofer-1.16.1.vsix',
          },
        ],
      };
      const expectedUrl = buildExpectedVsixUrl('1.16.1');
      const actualUrl = extractDownloadUrl(json, '1.16.1');
      expect(actualUrl).not.toBe(expectedUrl);
    });
  });

  describe('release orchestration order', () => {
    it('should regenerate canonical and downstream mirrors before syncing packaged resources', () => {
      const goferGenerateIndex = RELEASE_AUTO_SCRIPT.indexOf('npm run gofer:generate 2>&1');
      const generateCommandsIndex = RELEASE_AUTO_SCRIPT.indexOf(
        'npm run generate-commands -- --verbose 2>&1'
      );
      const syncResourcesIndex = RELEASE_AUTO_SCRIPT.indexOf(
        'node .specify/scripts/node/sync-extension-resources.mjs 2>&1'
      );
      const compileIndex = RELEASE_AUTO_SCRIPT.indexOf('if npm run compile 2>&1; then');
      const packageIndex = RELEASE_AUTO_SCRIPT.indexOf('npx @vscode/vsce package');

      expect(goferGenerateIndex).toBeGreaterThan(-1);
      expect(generateCommandsIndex).toBeGreaterThan(goferGenerateIndex);
      expect(syncResourcesIndex).toBeGreaterThan(generateCommandsIndex);
      expect(compileIndex).toBeGreaterThan(syncResourcesIndex);
      expect(packageIndex).toBeGreaterThan(compileIndex);
      expect(RELEASE_AUTO_SCRIPT).not.toContain('./scripts/sync-extension-resources.sh');
    });

    it('should load .env entries without command-substitution parsing', () => {
      expect(RELEASE_AUTO_SCRIPT).toContain('load_env_file()');
      expect(RELEASE_AUTO_SCRIPT).toContain('printf -v "$env_key" \'%s\' "$env_value"');
      expect(RELEASE_AUTO_SCRIPT).not.toContain('export $(cat .env');
    });

    it('should preserve release notes when rebuilding extension changelog entries', () => {
      const preserveNotesIndex = RELEASE_AUTO_SCRIPT.indexOf('RELEASE_NOTES="$COMMIT_MSG"');
      const changelogInsertIndex = RELEASE_AUTO_SCRIPT.indexOf('$RELEASE_NOTES');
      const changelogAppendIndex = RELEASE_AUTO_SCRIPT.indexOf(
        'awk \'/^## \\[/{f=1} f\' extension/CHANGELOG.md >> "$TEMP_FILE"'
      );

      expect(preserveNotesIndex).toBeGreaterThan(-1);
      expect(changelogInsertIndex).toBeGreaterThan(preserveNotesIndex);
      expect(changelogAppendIndex).toBeGreaterThan(changelogInsertIndex);
    });

    it('should update and commit the .gofer-version marker during release bumps', () => {
      const goferVersionWriteIndex = RELEASE_AUTO_SCRIPT.indexOf(
        "fs.writeFileSync('./.specify/.gofer-version', '$NEW_VERSION\\n');"
      );
      const gitAddIndex = RELEASE_AUTO_SCRIPT.indexOf('.specify/.gofer-version');

      expect(goferVersionWriteIndex).toBeGreaterThan(-1);
      expect(gitAddIndex).toBeGreaterThan(goferVersionWriteIndex);
    });

    it('should capture failing test output before aborting the release', () => {
      expect(RELEASE_AUTO_SCRIPT).toContain(`print_info "Running tests..."
set +e
npm test > /tmp/test-output.log 2>&1
TEST_EXIT=$?
set -e`);
    });

    it('should not push to origin/main before validation and release commit succeed', () => {
      const testsPassedIndex = RELEASE_AUTO_SCRIPT.indexOf('print_success "Tests passed"');
      const releaseCommitIndex = RELEASE_AUTO_SCRIPT.indexOf(
        'git commit --no-verify -m "release: v$NEW_VERSION'
      );
      const pushMainIndex = RELEASE_AUTO_SCRIPT.indexOf('git push --no-verify origin HEAD:main');

      expect(testsPassedIndex).toBeGreaterThan(-1);
      expect(releaseCommitIndex).toBeGreaterThan(testsPassedIndex);
      expect(pushMainIndex).toBeGreaterThan(releaseCommitIndex);
      expect(RELEASE_AUTO_SCRIPT).not.toContain('--force-with-lease');
    });

    it('should gate releases on origin/main ancestry and fast-forward local main safely', () => {
      expect(RELEASE_AUTO_SCRIPT).toContain('git merge-base --is-ancestor origin/main HEAD');
      expect(RELEASE_AUTO_SCRIPT).toContain('git pull --ff-only origin main');
    });

    it('should detect dirty worktrees using git status porcelain output', () => {
      expect(RELEASE_AUTO_SCRIPT).toContain('git status --porcelain');
      expect(RELEASE_AUTO_SCRIPT).not.toContain('git diff-index --quiet HEAD --');
    });

    it('should update release feed assets only after repo validation passes', () => {
      const testsPassedIndex = RELEASE_AUTO_SCRIPT.indexOf('print_success "Tests passed"');
      const updateReleasesIndex = RELEASE_AUTO_SCRIPT.indexOf(
        'node scripts/update-releases.js "$NEW_VERSION" "$RELEASE_NOTES" "$GITHUB_PAGES_URL"'
      );

      expect(updateReleasesIndex).toBeGreaterThan(testsPassedIndex);
    });

    it('should stage the full release diff before creating the release commit', () => {
      const gitAddIndex = RELEASE_AUTO_SCRIPT.indexOf('git add -A');
      const releaseCommitIndex = RELEASE_AUTO_SCRIPT.indexOf(
        'git commit --no-verify -m "release: v$NEW_VERSION'
      );

      expect(gitAddIndex).toBeGreaterThan(-1);
      expect(releaseCommitIndex).toBeGreaterThan(gitAddIndex);
      expect(RELEASE_AUTO_SCRIPT).not.toContain(
        'git add package.json package-lock.json extension/package.json extension/package-lock.json'
      );
    });
  });
});
