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
const UMBRELLA_SKILLS_DIR = 'plugin-skills';
const PLUGIN_ICON_SOURCE = 'extension/icon.png';
const PLUGIN_ICON_TARGET = 'assets/eai-gofer-icon.png';
const REPOSITORY_URL = 'https://github.com/eai-tools/eai-gofer';
const PUBLIC_SITE_URL = 'https://eai-tools.github.io/eai-gofer';
const PUBLIC_RELEASES_URL = `${PUBLIC_SITE_URL}/releases`;
const PUBLIC_PLUGIN_URL = `${PUBLIC_RELEASES_URL}/plugins/${PLUGIN_NAME}`;
const CLAUDE_MARKETPLACE_URL = `${PUBLIC_PLUGIN_URL}/claude-marketplace.json`;
const CODEX_PLUGIN_MANIFEST_URL = `${PUBLIC_PLUGIN_URL}/codex-plugin.json`;
const CODEX_MARKETPLACE_URL = `${PUBLIC_PLUGIN_URL}/codex-marketplace.json`;
const COPILOT_MARKETPLACE_URL = `${PUBLIC_PLUGIN_URL}/copilot-marketplace.json`;
const GEMINI_EXTENSION_URL = `${PUBLIC_PLUGIN_URL}/gemini-extension.json`;
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

function buildLatestPublicVsixUrl() {
  return `${PUBLIC_RELEASES_URL}/eai-gofer-latest.vsix`;
}

function buildLatestPublicAgentPluginZipUrl() {
  return `${PUBLIC_RELEASES_URL}/eai-gofer-agent-plugin-latest.zip`;
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
    keywords: [
      'eai-gofer',
      'gofer',
      'codex',
      'claude',
      'copilot',
      'gemini',
      'spec-driven-development',
    ],
    skills: paths.skills ?? `./${UMBRELLA_SKILLS_DIR}/`,
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

function buildGeminiManifest(version, paths = {}) {
  return {
    name: PLUGIN_NAME,
    version,
    description: 'Gofer pipeline as Gemini CLI extension',
    commands: paths.commands ?? '.gemini/commands/gofer/',
    gofer: {
      bundle_url: PUBLIC_PLUGIN_URL,
      manifest_url: `${PUBLIC_PLUGIN_URL}/gemini-extension.json`,
      commands_manifest_url: `${PUBLIC_PLUGIN_URL}/gemini-commands-manifest.json`,
      download_url: buildPublicAgentPluginZipUrl(version),
      latest_download_url: buildLatestPublicAgentPluginZipUrl(),
      vsix_url: buildPublicVsixUrl(version),
      latest_vsix_url: buildLatestPublicVsixUrl(),
    },
  };
}

function buildPluginManifest(version, paths = {}) {
  return {
    name: PLUGIN_NAME,
    version,
    description:
      'Public Gofer spec-driven delivery workflow for Claude, Gemini, Codex, Copilot, and VS Code.',
    author: {
      name: 'Enterprise AI Pty Ltd',
      url: REPOSITORY_URL,
    },
    homepage: REPOSITORY_URL,
    repository: REPOSITORY_URL,
    license: 'SEE LICENSE IN LICENSE',
    keywords: [
      'eai-gofer',
      'gofer',
      'claude-code',
      'codex',
      'copilot',
      'gemini',
      'spec-driven-development',
    ],
    category: 'Coding',
    tags: ['eai-gofer', 'gofer', 'agentic-coding', 'gemini'],
    skills: paths.skills ?? `./${UMBRELLA_SKILLS_DIR}/`,
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
    description:
      'Public EAI Gofer bundle for Claude Code, Gemini CLI, Codex, and Copilot workflows.',
    owner: {
      name: 'EnterpriseAI',
      url: REPOSITORY_URL,
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: './plugins/eai-gofer',
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
        tags: [
          'eai-gofer',
          'gofer',
          'claude',
          'codex',
          'copilot',
          'gemini',
          'spec-driven-development',
        ],
      },
    ],
  };
}

function buildRepoMarketplace(version) {
  return {
    name: 'eai-gofer',
    description:
      'Public EAI Gofer bundle for Claude Code, Gemini CLI, Codex, and Copilot workflows.',
    owner: {
      name: 'EnterpriseAI',
      url: REPOSITORY_URL,
    },
    metadata: {
      description:
        'Install the EAI Gofer repo marketplace for Claude Code, Gemini CLI, Codex, or Copilot CLI from the public GitHub repository.',
      version,
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: './plugins/eai-gofer',
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
        tags: [
          'eai-gofer',
          'gofer',
          'claude',
          'codex',
          'copilot',
          'gemini',
          'spec-driven-development',
        ],
      },
    ],
  };
}

function buildRepoCodexMarketplace(version) {
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
          path: './plugins/eai-gofer',
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
          path: './plugins/eai-gofer',
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

  return `---\nname: eai-gofer\ndescription: "Run the public Gofer spec-driven delivery workflow in Claude, Gemini, Codex, or Copilot."\n---\n\n# EAI Gofer\n\nVersion: ${version}\n\nUse this skill when the user asks to run, install, update, or understand Gofer without the VS Code extension UI.\n\n## Pipeline Skills\n\n${stageList}\n\n## Stable Local Install Path\n\nInstall or update this plugin by replacing the stable local folder:\n\n\`\`\`text\n~/plugins/eai-gofer\n\`\`\`\n\nThe public hosted plugin bundle is available at:\n\n\`\`\`text\n${PUBLIC_PLUGIN_URL}\n\`\`\`\n\nGemini CLI users can also copy the bundled \`.gemini/\` directory into a repository root to activate the same command set there.\n`;
}

function buildStageSkill(stage) {
  return `---\nname: ${stage.frontmatter.name}\ndescription: ${yamlString(stage.frontmatter.description)}\n---\n\n${stage.body.trim()}\n`;
}

function buildPluginReadme(version) {
  return `# EAI Gofer Agent Plugin\n\nVersion: ${version}\n\nThis package is the portable Claude, Gemini, Codex, and Copilot workflow layer for public Gofer. It is released beside the VS Code extension, but it does not replace the VSIX UI, status views, updater, or language-server features.\n\n## Public Sources\n\nUse the public GitHub repository as the install source for Claude Code, Codex, Copilot CLI, and Gemini CLI:\n\n\`\`\`text\n${REPOSITORY_URL}\n\`\`\`\n\nUse the public release host for downloadable artifacts:\n\n\`\`\`text\n${PUBLIC_RELEASES_URL}\n\`\`\`\n\nThat host publishes:\n\n- Latest VS Code extension: \`${buildLatestPublicVsixUrl()}\`\n- Latest agent bundle zip: \`${buildLatestPublicAgentPluginZipUrl()}\`\n- This release VS Code extension: \`${buildPublicVsixUrl(version)}\`\n- This release agent bundle zip: \`${buildPublicAgentPluginZipUrl(version)}\`\n- Shared public bundle directory: \`${PUBLIC_PLUGIN_URL}\`\n- Gemini extension manifest alias: \`${GEMINI_EXTENSION_URL}\`\n\n## Distribution Modes\n\n| Surface | Public install / update path | Stable local path |\n| ------- | ---------------------------- | ----------------- |\n| Claude Code | \`claude plugin marketplace add ${REPOSITORY_URL} --scope user --sparse .claude-plugin --sparse plugins/eai-gofer\` then \`claude plugin install eai-gofer@eai-gofer --scope user\` | Unzip to \`~/plugins/eai-gofer\`, then \`claude plugin marketplace add ~/plugins/eai-gofer --scope user\` |\n| Codex | \`codex plugin marketplace add ${REPOSITORY_URL} --sparse .agents/plugins --sparse plugins/eai-gofer\` then \`codex plugin add eai-gofer@eai-gofer\` | Unzip to \`~/plugins/eai-gofer\`, then \`codex plugin marketplace add ~/plugins/eai-gofer\` |\n| GitHub Copilot CLI | \`copilot plugin marketplace add ${REPOSITORY_URL}\` then \`copilot plugin install eai-gofer@eai-gofer\` | Unzip to \`~/plugins/eai-gofer\`, then \`copilot plugin marketplace add ~/plugins/eai-gofer\` |\n| Gemini CLI | \`gemini extensions install ${REPOSITORY_URL}\` | Unzip to \`~/plugins/eai-gofer\`, then \`gemini extensions install ~/plugins/eai-gofer\` |\n\n## Download And Replace The Local Bundle Folder\n\nKeep the downloaded bundle path stable:\n\n\`\`\`text\n~/plugins/eai-gofer\n\`\`\`\n\nDownload the public release asset, remove the old folder, unzip the package into \`~/plugins\`.\n\n\`\`\`bash\ncurl -fsSL ${buildLatestPublicAgentPluginZipUrl()} -o /tmp/eai-gofer-agent-plugin-latest.zip\n\nrm -rf ~/plugins/eai-gofer\nunzip /tmp/eai-gofer-agent-plugin-latest.zip -d ~/plugins\n\`\`\`\n\n## Claude Code\n\nRecommended public install:\n\n\`\`\`bash\nclaude plugin marketplace add ${REPOSITORY_URL} --scope user --sparse .claude-plugin --sparse plugins/eai-gofer\nclaude plugin install eai-gofer@eai-gofer --scope user\n\`\`\`\n\nDownloaded bundle install:\n\n\`\`\`bash\nclaude plugin marketplace add ~/plugins/eai-gofer --scope user\nclaude plugin install eai-gofer@eai-gofer --scope user\n\`\`\`\n\n## Codex\n\nRecommended public install:\n\n\`\`\`bash\ncodex plugin marketplace add ${REPOSITORY_URL} --sparse .agents/plugins --sparse plugins/eai-gofer\ncodex plugin add eai-gofer@eai-gofer\n\`\`\`\n\nDownloaded bundle install:\n\n\`\`\`bash\ncodex plugin marketplace add ~/plugins/eai-gofer\ncodex plugin add eai-gofer@eai-gofer\n\`\`\`\n\nThe Codex plugin keeps the slash-command stage entrypoints as the primary user surface. The plugin skill registry only exposes the umbrella \`eai-gofer\` skill so Codex does not show both \`/0_business_scenario\` and \`eai-gofer:0_business_scenario\` for every stage.\n\n## Copilot CLI\n\nRecommended public install:\n\n\`\`\`bash\ncopilot plugin marketplace add ${REPOSITORY_URL}\ncopilot plugin install eai-gofer@eai-gofer\n\`\`\`\n\nDownloaded bundle install:\n\n\`\`\`bash\ncopilot plugin marketplace add ~/plugins/eai-gofer\ncopilot plugin install eai-gofer@eai-gofer\n\`\`\`\n\n## Gemini CLI\n\nRecommended public install:\n\n\`\`\`bash\ngemini extensions install ${REPOSITORY_URL}\n\`\`\`\n\nDownloaded bundle install:\n\n\`\`\`bash\ngemini extensions install ~/plugins/eai-gofer\n\`\`\`\n`;
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
  const geminiManifest = buildGeminiManifest(version);
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
  await writeJson(path.join(pluginRoot, '.gemini', 'extension.json'), geminiManifest);
  await writeJson(path.join(pluginRoot, 'gemini-extension.json'), geminiManifest);
  await writeJson(
    path.join(pluginRoot, '.agents', 'plugins', 'marketplace.json'),
    buildBundleCodexMarketplace(version)
  );

  await writeText(path.join(pluginRoot, 'skills', 'eai-gofer', 'SKILL.md'), buildUmbrellaSkill(version, stages));
  await writeText(
    path.join(pluginRoot, UMBRELLA_SKILLS_DIR, 'eai-gofer', 'SKILL.md'),
    buildUmbrellaSkill(version, stages)
  );
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
    '.specify/scripts/hooks',
    '.specify/scripts/powershell',
    '.github/prompts',
    '.gemini',
    'AGENTS.md',
    'codex-config.toml',
  ];
  for (const relativePath of copiedResources) {
    await copyIfExists(root, relativePath, pluginRoot);
  }
  await writeJson(path.join(pluginRoot, '.gemini', 'extension.json'), geminiManifest);
  await copyIfExistsAs(root, '.claude/commands', 'commands', pluginRoot);
  await copyIfExistsAs(root, '.claude/agents', 'agents', pluginRoot);
  await copyPluginAssets(root, pluginRoot);

  const nestedPluginRoot = path.join(pluginRoot, 'plugins', PLUGIN_NAME);
  await fs.rm(nestedPluginRoot, { recursive: true, force: true });
  await fs.mkdir(nestedPluginRoot, { recursive: true });
  for (const entry of await fs.readdir(pluginRoot)) {
    if (entry === 'plugins') {
      continue;
    }

    const source = path.join(pluginRoot, entry);
    const target = path.join(nestedPluginRoot, entry);
    await fs.cp(source, target, { recursive: true, force: true, dereference: false });
  }
}

async function syncRepoManifests(root, version, stages, stagedPluginRoot) {
  await writeJson(
    path.join(root, '.codex-plugin', 'plugin.json'),
    buildCodexManifest(version, stages, {
      skills: `./${UMBRELLA_SKILLS_DIR}/`,
      icon: './assets/eai-gofer-icon.png',
    })
  );
  await writeJson(
    path.join(root, 'plugin.json'),
    buildPluginManifest(version, {
      skills: `./${UMBRELLA_SKILLS_DIR}/`,
      agents: './.claude/agents/',
      commands: './.claude/commands/',
    })
  );
  await writeJson(
    path.join(root, '.github', 'plugin', 'plugin.json'),
    buildPluginManifest(version, {
      skills: `./${UMBRELLA_SKILLS_DIR}/`,
      agents: './.claude/agents/',
      commands: './.claude/commands/',
    })
  );
  await writeJson(path.join(root, '.github', 'plugin', 'marketplace.json'), buildRepoMarketplace(version));
  await writeJson(
    path.join(root, '.agents', 'plugins', 'marketplace.json'),
    buildRepoCodexMarketplace(version)
  );
  await writeJson(
    path.join(root, '.claude-plugin', 'plugin.json'),
    buildClaudeManifest(version, {
      skills: './.agents/skills/',
    })
  );
  await writeJson(path.join(root, '.claude-plugin', 'marketplace.json'), buildRepoMarketplace(version));
  await writeJson(path.join(root, '.gemini', 'extension.json'), buildGeminiManifest(version));
  await writeJson(path.join(root, 'gemini-extension.json'), buildGeminiManifest(version));
  await writeText(
    path.join(root, UMBRELLA_SKILLS_DIR, 'eai-gofer', 'SKILL.md'),
    buildUmbrellaSkill(version, stages)
  );

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
