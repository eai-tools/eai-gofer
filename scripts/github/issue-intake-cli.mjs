#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeIssue, renderPrepBrief, renderTriageComment } from './issue-intake-lib.mjs';

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[key] = rest[index + 1];
      index += 1;
    }
  }

  return args;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeGithubOutput(filePath, outputs) {
  if (!filePath) {
    return;
  }

  const lines = [];
  for (const [key, value] of Object.entries(outputs)) {
    if (value === undefined || value === null) {
      continue;
    }

    const stringValue = String(value);
    if (stringValue.includes('\n')) {
      lines.push(`${key}<<EOF`);
      lines.push(stringValue);
      lines.push('EOF');
    } else {
      lines.push(`${key}=${stringValue}`);
    }
  }

  await fs.appendFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || !['analyze', 'render-comment', 'render-brief'].includes(args.command)) {
    throw new Error(
      'Usage: node scripts/github/issue-intake-cli.mjs <analyze|render-comment|render-brief> --issue <issue.json> --policy <policy.json> [options]'
    );
  }

  const issue = await readJson(args.issue);
  const policy = await readJson(args.policy);
  const analysis = analyzeIssue(issue, policy);

  if (args.command === 'analyze') {
    if (args.out) {
      await ensureParent(args.out);
      await fs.writeFile(args.out, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
    }

    await writeGithubOutput(args.githubOutput, {
      status: analysis.status,
      summary: analysis.summary,
      reason: analysis.reason,
      surface: analysis.surface,
      area_id: analysis.areaId,
      area_title: analysis.areaTitle,
      should_prepare_pr: analysis.shouldPreparePr,
      branch_name: analysis.branchName,
      prep_file_path: analysis.prepFilePath,
      pr_title: analysis.prTitle,
      labels_to_add: analysis.labelsToAdd.join(','),
      labels_to_remove: analysis.labelsToRemove.join(','),
    });

    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
    return;
  }

  if (args.command === 'render-comment') {
    const comment = renderTriageComment(analysis, args.prepPrUrl ?? '');
    if (args.out) {
      await ensureParent(args.out);
      await fs.writeFile(args.out, comment, 'utf8');
    }
    process.stdout.write(comment);
    return;
  }

  const brief = renderPrepBrief(issue, analysis);
  if (args.out) {
    await ensureParent(args.out);
    await fs.writeFile(args.out, brief, 'utf8');
  }
  process.stdout.write(brief);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
