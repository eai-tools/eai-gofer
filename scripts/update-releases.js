#!/usr/bin/env node

/**
 * Script to update releases.json when a new version is released
 * This should be run after creating a new VSIX file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from command line or package.json
const version = process.argv[2] || JSON.parse(fs.readFileSync(path.join(__dirname, '../extension/package.json'), 'utf8')).version;
const releaseNotes = process.argv[3] || 'New release';
const customDownloadUrl = process.argv[4]; // Optional custom download URL

const releasesPath = path.join(__dirname, '../docs-site/static/releases.json');
const releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));

// Determine download URL - use custom URL if provided, otherwise default to GitHub Pages
const downloadUrl = customDownloadUrl || `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-${version}.vsix`;

// Calculate actual file size if the VSIX exists in docs-site/static/releases/
const vsixPath = path.join(__dirname, '../docs-site/static/releases', `eai-gofer-${version}.vsix`);
let fileSize = 8.5; // Default approximate size
if (fs.existsSync(vsixPath)) {
  const stats = fs.statSync(vsixPath);
  fileSize = (stats.size / (1024 * 1024)).toFixed(1); // Convert bytes to MB
} else {
}

// Create new release entry
const newRelease = {
  version: version,
  tag_name: `v${version}`,
  published_at: new Date().toISOString(),
  download_url: downloadUrl,
  notes: releaseNotes,
  prerelease: false,
  size_mb: parseFloat(fileSize)
};

// Replace any existing entry for the same version before prepending the latest.
releases.releases = releases.releases.filter((release) => {
  return release.version !== version && release.tag_name !== `v${version}`;
});

// Add to beginning of releases array
releases.releases.unshift(newRelease);

// Update latest version
releases.latest_version = version;
releases.last_updated = new Date().toISOString();

// Keep only last 10 releases
releases.releases = releases.releases.slice(0, 10);

// Write back to file
fs.writeFileSync(releasesPath, JSON.stringify(releases, null, 2));
