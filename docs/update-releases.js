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

const releasesPath = path.join(__dirname, 'releases.json');
const releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));

// Determine download URL - use custom URL if provided, otherwise default to GitHub Releases
const downloadUrl = customDownloadUrl || `https://github.com/eai-tools/specgofer/releases/download/v${version}/specgofer-${version}.vsix`;

// Create new release entry
const newRelease = {
  version: version,
  tag_name: `v${version}`,
  published_at: new Date().toISOString(),
  download_url: downloadUrl,
  notes: releaseNotes,
  prerelease: false,
  size_mb: 8.5 // Approximate size
};

// Add to beginning of releases array
releases.releases.unshift(newRelease);

// Update latest version
releases.latest_version = version;
releases.last_updated = new Date().toISOString();

// Keep only last 10 releases
releases.releases = releases.releases.slice(0, 10);

// Write back to file
fs.writeFileSync(releasesPath, JSON.stringify(releases, null, 2));

console.log(`✅ Updated releases.json with version ${version}`);
console.log(`📦 Release URL: ${newRelease.download_url}`);
console.log(`📄 Site URL: https://eai-tools.github.io/specgofer`);