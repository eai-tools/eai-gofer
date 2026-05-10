#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(EXTENSION_ROOT, '..');
const LANGUAGE_SERVER_ROOT = path.join(REPO_ROOT, 'language-server');
const TARGET_ROOT = path.join(EXTENSION_ROOT, 'language-server');

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await runCommand(npmCommand, ['run', 'build'], LANGUAGE_SERVER_ROOT);

  await fs.rm(TARGET_ROOT, { recursive: true, force: true });
  await fs.cp(LANGUAGE_SERVER_ROOT, TARGET_ROOT, { recursive: true });
  await fs.rm(path.join(TARGET_ROOT, 'src'), { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
