#!/usr/bin/env node
/**
 * Builds the installable EAI Gofer Claude + Codex + Copilot plugin bundle.
 *
 * Canonical command sources live in `.specify/commands/`. This script stages a
 * portable plugin under `dist/` and, when requested, refreshes the repo-local
 * marketplace plugin under `plugins/eai-gofer/`.
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { parseStageCommand } from './parse-stage-command.mjs';

const execFileAsync = promisify(execFile);

const GENERATED_MARKER = 'generated-by-eai-gofer';
const PLUGIN_NAME = 'eai-gofer';
const PLUGIN_DISPLAY_NAME = 'EAI Gofer';
const PLUGIN_ICON_SOURCE = 'extension/icon.png';
const PLUGIN_ICON_TARGET = 'assets/eai-gofer-icon.png';
const REPOSITORY_URL = 'https://github.com/eai-tools/eai-gofer';
const PUBLIC_SITE_URL = 'https://eai-tools.github.io/eai-gofer';
const PUBLIC_RELEASES_URL = `${PUBLIC_SITE_URL}/releases`;
const PUBLIC_PLUGIN_URL = `${PUBLIC_RELEASES_URL}/plugins/${PLUGIN_NAME}`;
const PERSONAL_PATH_PATTERN =
  /(^|[\s"'])(\/Users\/[^/\s"']+|\/home\/[^/\s"']+|[A-Za-z]:\\Users\\[^\\\s"']+)/;

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    outDir: 'dist',
    version: null,
    syncRepo: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      args.root = argv[++i];
    } else if (arg === '--out-dir' && argv[i + 1]) {
      args.outDir = argv[++i];
    } else if (arg === '--version' && argv[i + 1]) {
      args.version = argv[++i].replace(/^v/, '');
    } else if (arg === '--sync-repo') {
      args.syncRepo = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage: node .specify/scripts/node/package-agent-plugin.mjs --version <x.y.z>',
    '',
    'Options:',
    '  --version <x.y.z>   Release/package version to stamp into plugin manifests.',
    '  --out-dir <dir>     Output directory for the staged folder and zip. Default: dist',
    '  --root <dir>        Gofer repository root. Default: current working directory',
    '  --sync-repo         Refresh root manifests and plugins/eai-gofer marketplace bundle.',
  ].join('\n');
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
    throw new Error(`Plugin version must look like 3.4.0; got '${version ?? ''}'.`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadStages(root) {
  const commandsDir = path.join(root, '.specify', 'commands');
  const entries = (await fs.readdir(commandsDir))
    .filter((entry) => entry.endsWith('.md') && entry !== '.gitkeep')
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const stages = [];
  for (const entry of entries) {
    const filePath = path.join(commandsDir, entry);
    const parsed = await parseStageCommand(filePath);
    stages.push({
      stem: path.basename(entry, '.md'),
      sourceFile: entry,
      filePath,
      ...parsed,
    });
  }

  return stages;
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function stageNames(stages) {
  return stages.map((stage) => String(stage.frontmatter.name));
}

function buildPublicVsixUrl(version) {
  return `${PUBLIC_RELEASES_URL}/eai-gofer-${version}.vsix`;
}

function buildPublicAgentPluginZipUrl(version) {
  return `${PUBLIC_RELEASES_URL}/eai-gofer-agent-plugin-${version}.zip`;
}

function buildCodexManifest(version, stages, paths = {}) {
  return {
    name: PLUGIN_NAME,
    version,
    description:
      'Public Gofer spec-driven delivery workflow for Claude, Codex, Copilot, Gemini, and VS Code.',
    author: {
      name: 'Enterprise AI Pty Ltd',
      url: REPOSITORY_URL,
    },
    homepage: REPOSITORY_URL,
    repository: REPOSITORY_URL,
    license: 'SEE LICENSE IN LICENSE',
    keywords: ['eai-gofer', 'gofer', 'codex', 'claude', 'copilot', 'spec-driven-development'],
    skills: paths.skills ?? './skills/',
    interface: {
      displayName: PLUGIN_DISPLAY_NAME,
      shortDescription: 'Spec-driven delivery workflow for agentic coding',
      longDescription:
        'Run the public Gofer workflow from business scenario through research, specification, planning, tasks, implementation, validation, and stakeholder communications.',
      developerName: 'EnterpriseAI',
      category: 'Coding',
      capabilities: ['Interactive', 'Write'],
      websiteURL: REPOSITORY_URL,
      defaultPrompt: [
        'Run Gofer research for this feature',
        'Create a Gofer implementation plan',
        'Validate this branch with Gofer',
      ],
      brandColor: '#145DA0',
      composerIcon: paths.icon ?? `./${PLUGIN_ICON_TARGET}`,
      logo: paths.icon ?? `./${PLUGIN_ICON_TARGET}`,
    },
    gofer: {
      stages: stageNames(stages),
      marketplacePath: PUBLIC_PLUGIN_URL,
      releaseAsset: buildPublicAgentPluginZipUrl(version),
      vsixAsset: buildPublicVsixUrl(version),
    },
  };
}

function buildPluginManifest(version, paths = {}) {
  return {
    name: PLUGIN_NAME,
    version,
    description:
      'Public Gofer spec-driven delivery workflow: business scenario, research, specify, plan, tasks, implement, validate, and communicate.',
    author: {
      name: 'Enterprise AI Pty Ltd',
      url: REPOSITORY_URL,
    },
    homepage: REPOSITORY_URL,
    repository: REPOSITORY_URL,
    license: 'SEE LICENSE IN LICENSE',
    keywords: ['eai-gofer', 'gofer', 'claude-code', 'codex', 'copilot', 'spec-driven-development'],
    category: 'Coding',
    tags: ['eai-gofer', 'gofer', 'agentic-coding'],
    skills: paths.skills ?? './skills/',
    agents: paths.agents ?? './agents/',
    commands: paths.commands ?? './commands/',
  };
}

function buildClaudeManifest(version, paths = {}) {
  return {
    name: PLUGIN_NAME,
    version,
    description:
      'Public Gofer spec-driven delivery workflow: business scenario, research, specify, plan, tasks, implement, validate, and communicate.',
    author: {
      name: 'Enterprise AI Pty Ltd',
      url: REPOSITORY_URL,
    },
    homepage: REPOSITORY_URL,
    repository: REPOSITORY_URL,
    license: 'SEE LICENSE IN LICENSE',
    keywords: ['eai-gofer', 'gofer', 'claude-code', 'spec-driven-development'],
    category: 'Coding',
    tags: ['eai-gofer', 'gofer', 'agentic-coding'],
    skills: paths.skills ?? './skills/',
  };
}

function buildBundleMarketplace(version) {
  return {
    name: 'eai-gofer',
    description: 'Public EAI Gofer plugin marketplace for agentic spec-driven delivery workflows.',
    owner: {
      name: 'EnterpriseAI',
      url: REPOSITORY_URL,
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: './',
        description:
          'Public Gofer workflow for business scenario, research, specification, planning, implementation, validation, and stakeholder communications.',
        version,
        author: {
          name: 'Enterprise AI Pty Ltd',
          url: REPOSITORY_URL,
        },
        homepage: REPOSITORY_URL,
        repository: REPOSITORY_URL,
        category: 'Coding',
        tags: ['eai-gofer', 'gofer', 'claude', 'codex', 'copilot', 'spec-driven-development'],
      },
    ],
  };
}

function buildRepoMarketplace(version) {
  return {
    name: 'eai-gofer',
    description: 'Public EAI Gofer plugin marketplace for agentic spec-driven delivery workflows.',
    owner: {
      name: 'EnterpriseAI',
      url: REPOSITORY_URL,
    },
    metadata: {
      description:
        'Install the EAI Gofer agent plugin for Claude Code, Codex, or Copilot CLI from the public release host.',
      version,
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: PUBLIC_PLUGIN_URL,
        description:
          'Public Gofer workflow for business scenario, research, specification, planning, implementation, validation, and stakeholder communications.',
        version,
        author: {
          name: 'Enterprise AI Pty Ltd',
          url: REPOSITORY_URL,
        },
        homepage: REPOSITORY_URL,
        repository: REPOSITORY_URL,
        license: 'SEE LICENSE IN LICENSE',
        category: 'Coding',
        tags: ['eai-gofer', 'gofer', 'claude', 'codex', 'copilot', 'spec-driven-development'],
      },
    ],
  };
}

function buildBundleCodexMarketplace(version) {
  return {
    name: 'eai-gofer',
    interface: {
      displayName: 'EAI Gofer',
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: {
          source: 'local',
          path: './',
        },
        policy: {
          installation: 'AVAILABLE',
          authentication: 'ON_INSTALL',
        },
        category: 'Coding',
        version,
      },
    ],
  };
}

function buildUmbrellaSkill(version, stages) {
  const stageList = stages
    .map((stage) => `- \`${stage.frontmatter.name}\` - ${stage.frontmatter.description}`)
    .join('\n');

  return `---\nname: eai-gofer\ndescription: "Run the public Gofer spec-driven delivery workflow in Claude, Codex, or Copilot."\n---\n\n# EAI Gofer\n\nVersion: ${version}\n\nUse this skill when the user asks to run, install, update, or understand Gofer without the VS Code extension UI.\n\n## Pipeline Skills\n\n${stageList}\n\n## Stable Local Install Path\n\nInstall or update this plugin by replacing the stable local folder:\n\n\`\`\`text\n~/plugins/eai-gofer\n\`\`\`\n\nThe public hosted plugin bundle is available at:\n\n\`\`\`text\n${PUBLIC_PLUGIN_URL}\n\`\`\`\n`;
}

function buildStageSkill(stage) {
  return `---\nname: ${stage.frontmatter.name}\ndescription: ${yamlString(stage.frontmatter.description)}\n---\n\n${stage.body.trim()}\n`;
}

function buildPluginReadme(version) {
  return `# EAI Gofer Agent Plugin\n\nVersion: ${version}\n\nThis package is the portable Claude, Codex, and Copilot workflow layer for public Gofer. It is released beside the VS Code extension, but it does not replace the VSIX UI, status views, updater, or language-server features.\n\n## Public Release Host\n\nAll public release artifacts ship under:\n\n\`\`\`text\n${PUBLIC_RELEASES_URL}\n\`\`\`\n\nThat host publishes:\n\n- VS Code extension: \`${buildPublicVsixUrl(version)}\`\n- Agent plugin zip: \`${buildPublicAgentPluginZipUrl(version)}\`\n- Stable public plugin bundle: \`${PUBLIC_PLUGIN_URL}\`\n\n## Distribution Modes\n\n| Surface | Public install / update path | Stable local folder path |\n| ------- | ---------------------------- | ------------------------ |\n| Claude Code | \`claude plugin marketplace add ${PUBLIC_PLUGIN_URL} --scope user\` then \`claude plugin install eai-gofer@eai-gofer --scope user\` | \`~/plugins/eai-gofer\` |\n| Codex | Import the public plugin bundle URL \`${PUBLIC_PLUGIN_URL}\` in the Codex plugin UI, or download the zip below and keep the installed folder path stable | \`~/plugins/eai-gofer\` |\n| GitHub Copilot CLI | \`copilot plugin marketplace add ${PUBLIC_PLUGIN_URL}\` then \`copilot plugin install eai-gofer@eai-gofer\` | \`~/plugins/eai-gofer\` |\n\n## Download And Replace The Local Folder\n\nKeep the local install path stable:\n\n\`\`\`text\n~/plugins/eai-gofer\n\`\`\`\n\nDownload the public release asset, remove the old folder, unzip the package into \`~/plugins\`, then reload Codex, Claude Code, or Copilot CLI.\n\n\`\`\`bash\ncurl -fsSL ${buildPublicAgentPluginZipUrl(version)} -o /tmp/eai-gofer-agent-plugin-${version}.zip\n\nrm -rf ~/plugins/eai-gofer\nunzip /tmp/eai-gofer-agent-plugin-${version}.zip -d ~/plugins\n\`\`\`\n\n## Claude Code\n\n\`\`\`bash\nclaude plugin marketplace add ${PUBLIC_PLUGIN_URL} --scope user\nclaude plugin install eai-gofer@eai-gofer --scope user\n\`\`\`\n\n## Codex\n\nUse the public plugin bundle URL in the Codex plugin import / marketplace UI:\n\n\`\`\`text\n${PUBLIC_PLUGIN_URL}\n\`\`\`\n\nIf you prefer a downloaded folder install, replace \`~/plugins/eai-gofer\` from the zip above and keep the Codex plugin entry pointed at that stable folder.\n\n## Copilot CLI\n\nRegister the public bundle as a marketplace or use the same downloaded local folder:\n\n\`\`\`bash\ncopilot plugin marketplace add ${PUBLIC_PLUGIN_URL}\ncopilot plugin install eai-gofer@eai-gofer\n\`\`\`\n`;
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function copyIfExists(root, relativePath, pluginRoot) {
  const source = path.join(root, relativePath);
  const target = path.join(pluginRoot, relativePath);
  try {
    await fs.cp(source, target, { recursive: true, force: true, dereference: false });
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function copyIfExistsAs(root, sourceRelativePath, targetRelativePath, pluginRoot) {
  const source = path.join(root, sourceRelativePath);
  const target = path.join(pluginRoot, targetRelativePath);
  try {
    await fs.cp(source, target, { recursive: true, force: true, dereference: false });
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function copyPluginAssets(root, pluginRoot) {
  const source = path.join(root, PLUGIN_ICON_SOURCE);
  const target = path.join(pluginRoot, PLUGIN_ICON_TARGET);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function walkFiles(root) {
  const files = [];

  async function visit(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await visit(root);
  return files;
}

async function assertNoPersonalPaths(pluginRoot) {
  const files = await walkFiles(pluginRoot);
  const offenders = [];
  for (const file of files) {
    let content;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }

    if (PERSONAL_PATH_PATTERN.test(content)) {
      offenders.push(path.relative(pluginRoot, file));
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Plugin package contains personal absolute paths: ${offenders.join(', ')}`);
  }
}

async function writePluginFolder(pluginRoot, root, version, stages) {
  await fs.rm(pluginRoot, { recursive: true, force: true });
  await fs.mkdir(pluginRoot, { recursive: true });

  const pluginManifest = buildPluginManifest(version);
  const claudeManifest = buildClaudeManifest(version);
  const codexManifest = buildCodexManifest(version, stages);
  const bundleMarketplace = buildBundleMarketplace(version);

  await writeJson(path.join(pluginRoot, 'plugin.json'), pluginManifest);
  await writeJson(path.join(pluginRoot, '.github', 'plugin', 'plugin.json'), pluginManifest);
  await writeJson(
    path.join(pluginRoot, '.github', 'plugin', 'marketplace.json'),
    bundleMarketplace
  );
  await writeJson(path.join(pluginRoot, '.codex-plugin', 'plugin.json'), codexManifest);
  await writeJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), claudeManifest);
  await writeJson(path.join(pluginRoot, '.claude-plugin', 'marketplace.json'), bundleMarketplace);
  await writeJson(
    path.join(pluginRoot, '.agents', 'plugins', 'marketplace.json'),
    buildBundleCodexMarketplace(version)
  );

  await writeText(path.join(pluginRoot, 'skills', 'eai-gofer', 'SKILL.md'), buildUmbrellaSkill(version, stages));
  for (const stage of stages) {
    await writeText(path.join(pluginRoot, 'skills', stage.stem, 'SKILL.md'), buildStageSkill(stage));
  }

  await writeText(path.join(pluginRoot, 'README.md'), buildPluginReadme(version));
  await writeText(path.join(pluginRoot, '.eai-gofer-plugin-version'), `${version}\n${GENERATED_MARKER}\n`);

  const copiedResources = [
    '.specify/commands',
    '.specify/templates',
    '.specify/scripts/bash',
    '.specify/scripts/node',
    '.github/prompts',
    '.gemini',
    'AGENTS.md',
    'codex-config.toml',
  ];
  for (const relativePath of copiedResources) {
    await copyIfExists(root, relativePath, pluginRoot);
  }
  await copyIfExistsAs(root, '.claude/commands', 'commands', pluginRoot);
  await copyIfExistsAs(root, '.claude/agents', 'agents', pluginRoot);
  await copyPluginAssets(root, pluginRoot);
}

async function syncRepoManifests(root, version, stages, stagedPluginRoot) {
  await writeJson(
    path.join(root, '.codex-plugin', 'plugin.json'),
    buildCodexManifest(version, stages, {
      skills: './.agents/skills/',
      icon: './assets/eai-gofer-icon.png',
    })
  );
  await writeJson(
    path.join(root, 'plugin.json'),
    buildPluginManifest(version, {
      skills: './.agents/skills/',
      agents: './.claude/agents/',
      commands: './.claude/commands/',
    })
  );
  await writeJson(
    path.join(root, '.github', 'plugin', 'plugin.json'),
    buildPluginManifest(version, {
      skills: './.agents/skills/',
      agents: './.claude/agents/',
      commands: './.claude/commands/',
    })
  );
  await writeJson(path.join(root, '.github', 'plugin', 'marketplace.json'), buildRepoMarketplace(version));
  await writeJson(
    path.join(root, '.claude-plugin', 'plugin.json'),
    buildClaudeManifest(version, {
      skills: './.agents/skills/',
    })
  );
  await writeJson(path.join(root, '.claude-plugin', 'marketplace.json'), buildRepoMarketplace(version));

  const iconSource = path.join(root, PLUGIN_ICON_SOURCE);
  const iconTarget = path.join(root, PLUGIN_ICON_TARGET);
  await fs.mkdir(path.dirname(iconTarget), { recursive: true });
  await fs.copyFile(iconSource, iconTarget);

  const repoPluginDir = path.join(root, 'plugins', PLUGIN_NAME);
  await fs.rm(repoPluginDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(repoPluginDir), { recursive: true });
  await fs.cp(stagedPluginRoot, repoPluginDir, { recursive: true, force: true, dereference: false });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const root = path.resolve(args.root);
  const extensionPackage = await readJson(path.join(root, 'extension', 'package.json'));
  const version = args.version ?? extensionPackage.version;
  assertSemver(version);

  const stages = await loadStages(root);
  const outDir = path.resolve(root, args.outDir);
  const packageName = `eai-gofer-agent-plugin-${version}`;
  const stageParent = path.join(outDir, packageName);
  const pluginRoot = path.join(stageParent, PLUGIN_NAME);
  const zipPath = path.join(outDir, `${packageName}.zip`);

  await fs.rm(stageParent, { recursive: true, force: true });
  await fs.rm(zipPath, { force: true });
  await writePluginFolder(pluginRoot, root, version, stages);
  await assertNoPersonalPaths(pluginRoot);
  await execFileAsync('zip', ['-qr', zipPath, PLUGIN_NAME], { cwd: stageParent });

  if (args.syncRepo) {
    await syncRepoManifests(root, version, stages, pluginRoot);
  }

  console.log(`plugin: staged ${pluginRoot}`);
  console.log(`plugin: wrote ${zipPath}`);
  if (args.syncRepo) {
    console.log(`plugin: synced ${path.join(root, 'plugins', PLUGIN_NAME)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
