---
feature: 028-cross-platform-command-parity
contract-type: internal-api
created: 2026-03-18
updated: 2026-03-18
status: draft
---

# Internal API Contracts: Cross-Platform Command Parity

This document specifies internal TypeScript API contracts for Cross-Platform
Command Parity, enabling all 18 Gofer commands to work identically across Claude
Code CLI, GitHub Copilot Chat, and Codex CLI.

## Contract Overview

| Contract                       | Type      | User Stories Served | Purpose                                                                  |
| ------------------------------ | --------- | ------------------- | ------------------------------------------------------------------------ |
| **CrossPlatformCommandRouter** | Class     | US-1, US-2, US-5    | Detect current platform and route commands to appropriate implementation |
| **PlatformDetector**           | Interface | US-1, US-2, US-5    | Platform detection via execution context analysis                        |
| **CommandGenerator**           | Class     | US-1, US-6          | Generate platform-specific command files from Claude reference           |
| **SkillDirectoryManager**      | Interface | US-1                | Manage multi-directory skill discovery                                   |
| **ConfigManager Extensions**   | Methods   | US-5                | Settings access for default platform selection                           |

---

## 1. CrossPlatformCommandRouter Class

**Description**: Central router that detects the current AI platform and
dispatches commands to the appropriate directory (`.claude/commands/`,
`.github/prompts/`, or `.system/skills/`).

**Location**: `extension/src/council/CrossPlatformCommandRouter.ts`

**Serves**:

- FR-003 (Cross-platform command router)
- FR-013 (Platform detection logic)
- US-1 (Codex CLI full command access)
- US-2 (Auto-chaining across platforms)
- US-5 (Default provider selection)

### Interface Definition

```typescript
/**
 * Router for cross-platform command execution
 * Detects current AI platform and routes to appropriate command implementation
 */
export class CrossPlatformCommandRouter {
  private readonly workspacePath: string;

  /**
   * Constructor
   * @param workspacePath - Workspace root path
   */
  constructor(workspacePath: string);

  /**
   * Detect current AI platform
   * Uses execution context, file structure, and user settings
   *
   * @returns PlatformType | 'auto' - Detected platform (synchronous)
   */
  detectPlatform(): PlatformType | 'auto';

  /**
   * Route command invocation to platform-specific implementation
   * Main entry point for command routing
   *
   * @param commandName - Command to execute (e.g., "0_business_scenario")
   * @param args - Command arguments
   * @returns CommandRoutingResult - Routing result with metadata (synchronous)
   * @throws CommandNotFoundError if command doesn't exist for platform
   */
  routeCommand(commandName: string, args?: string): CommandRoutingResult;

  /**
   * Get command file path for current platform
   * Resolves command name to absolute file path
   *
   * @param commandName - Command to locate
   * @returns Promise<string> - Absolute path to command file
   * @throws CommandNotFoundError if command doesn't exist
   */
  async getCommandPath(commandName: string): Promise<string>;

  /**
   * List all available commands for current platform
   * Used for command discovery and auto-completion
   *
   * @returns Promise<CommandMetadata[]> - Array of command metadata
   */
  async listCommands(): Promise<CommandMetadata[]>;

  /**
   * Validate command availability on current platform
   * Checks if command file exists and is readable
   *
   * @param commandName - Command to validate
   * @returns Promise<boolean> - true if command is available
   */
  async isCommandAvailable(commandName: string): Promise<boolean>;

  /**
   * Get platform-specific command syntax
   * Returns invocation syntax for current platform
   *
   * @param commandName - Command to get syntax for
   * @returns string - Platform-specific syntax (e.g., "/cmd", "$cmd", "#cmd")
   */
  getCommandSyntax(commandName: string): string;
}
```

### Types

```typescript
/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  output: string;
  metadata: {
    platform: 'claude' | 'copilot' | 'codex';
    commandPath: string;
    executionTimeMs: number;
    autoChainNext?: string; // Next command in pipeline, if applicable
  };
  error?: Error;
}

/**
 * Command metadata for discovery
 */
export interface CommandMetadata {
  name: string;
  description: string;
  platform: 'claude' | 'copilot' | 'codex';
  filePath: string;
  category: 'pipeline' | 'utility' | 'validation';
  syntax: string; // Platform-specific invocation syntax
}

/**
 * Platform detection error
 */
export class PlatformDetectionError extends Error {
  constructor(
    message: string,
    public context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PlatformDetectionError';
  }
}

/**
 * Command not found error
 */
export class CommandNotFoundError extends Error {
  constructor(
    commandName: string,
    platform: string,
    public availableCommands: string[]
  ) {
    super(`Command '${commandName}' not found for ${platform} platform`);
    this.name = 'CommandNotFoundError';
  }
}
```

### Error Conditions

| Condition                    | Error Type             | Message Template                                                             | Recovery                                      |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| Platform undetectable        | PlatformDetectionError | "Cannot detect AI platform: {reason}"                                        | Fall back to `gofer.defaultCLI` setting       |
| Command not found            | CommandNotFoundError   | "Command '{name}' not available on {platform}"                               | Show available commands, suggest installation |
| Multiple platforms detected  | PlatformDetectionError | "Multiple AI platforms detected: {platforms}"                                | Use `gofer.defaultCLI` preference             |
| No command directories exist | PlatformDetectionError | "No command directories found (.claude/, .github/prompts/, .system/skills/)" | Suggest Gofer installation/scaffolding        |
| Command file unreadable      | CommandExecutionError  | "Cannot read command file: {path}"                                           | Check file permissions                        |

---

## 2. PlatformDetector Interface

**Description**: Detects which AI platform is currently active by analyzing
execution context, environment variables, and file structure.

**Location**: `extension/src/council/PlatformDetector.ts`

**Serves**:

- FR-013 (Platform detection logic)
- NFR-009 (Platform detection logging)
- US-2 (Transparent platform detection)

### Interface Definition

```typescript
/**
 * Platform detection service
 * Analyzes execution context to determine active AI platform
 */
export interface PlatformDetector {
  /**
   * Detect active AI platform
   * Uses multiple heuristics: execution context, file structure, process environment
   *
   * @returns Promise<PlatformDetectionResult> - Detection result with confidence
   */
  detect(): Promise<PlatformDetectionResult>;

  /**
   * Check if specific platform is available
   * Verifies CLI installation and directory structure
   *
   * @param platform - Platform to check
   * @returns Promise<boolean> - true if platform is available
   */
  isPlatformAvailable(
    platform: 'claude' | 'copilot' | 'codex'
  ): Promise<boolean>;

  /**
   * Get default platform from settings
   * Reads `gofer.defaultCLI` configuration
   *
   * @returns 'claude' | 'copilot' | 'codex' | 'auto' - User preference
   */
  getDefaultPlatform(): 'claude' | 'copilot' | 'codex' | 'auto';

  /**
   * Get detection context for logging
   * Returns diagnostic information about detection environment
   *
   * @returns PlatformDetectionContext - Context object
   */
  getDetectionContext(): PlatformDetectionContext;
}

/**
 * Platform detection result
 */
export interface PlatformDetectionResult {
  platform: 'claude' | 'copilot' | 'codex';
  confidence: 'high' | 'medium' | 'low';
  reason: string; // Human-readable explanation
  fallbackUsed: boolean; // true if used gofer.defaultCLI instead of detection
}

/**
 * Platform detection context (for logging and debugging)
 */
export interface PlatformDetectionContext {
  vsCodeExtensionHost: boolean;
  terminalContext: boolean;
  claudeDirectoryExists: boolean;
  copilotPromptsExist: boolean;
  codexSkillsExist: boolean;
  processEnv: {
    CLAUDE_CLI?: string;
    CODEX_CLI?: string;
  };
  userPreference: 'claude' | 'copilot' | 'codex' | 'auto';
}

/**
 * Default implementation of PlatformDetector
 */
export class DefaultPlatformDetector implements PlatformDetector {
  constructor(private configManager: ConfigManager) {}

  async detect(): Promise<PlatformDetectionResult>;
  async isPlatformAvailable(
    platform: 'claude' | 'copilot' | 'codex'
  ): Promise<boolean>;
  getDefaultPlatform(): 'claude' | 'copilot' | 'codex' | 'auto';
  getDetectionContext(): PlatformDetectionContext;
}
```

### Detection Algorithm

```typescript
/**
 * Platform detection priority order:
 *
 * 1. User Preference (if not 'auto'):
 *    - Read gofer.defaultCLI setting
 *    - If set to 'claude', 'copilot', or 'codex', use that (high confidence)
 *
 * 2. Execution Context Analysis:
 *    - Check if running in VSCode extension host
 *    - Check if .claude/commands/ exists → Claude Code CLI
 *    - Check if .github/prompts/ exists and Copilot extension active → Copilot Chat
 *    - Check if .system/skills/ exists → Codex CLI
 *
 * 3. Process Environment:
 *    - Check CLAUDE_CLI, CODEX_CLI environment variables
 *
 * 4. Fallback:
 *    - If detection ambiguous, use gofer.defaultCLI (even if 'auto')
 *    - If still ambiguous, default to 'claude' (backward compatibility)
 *    - Set confidence to 'low'
 */
async function detectPlatform(): Promise<PlatformDetectionResult> {
  // 1. Check user preference
  const preference = this.configManager.getDefaultCLI();
  if (preference !== 'auto') {
    return {
      platform: preference,
      confidence: 'high',
      reason: `User preference: ${preference}`,
      fallbackUsed: false,
    };
  }

  // 2. Analyze execution context
  const context = this.getDetectionContext();

  // Claude: .claude/commands/ exists + VSCode extension host
  if (context.claudeDirectoryExists && context.vsCodeExtensionHost) {
    return {
      platform: 'claude',
      confidence: 'high',
      reason: '.claude/commands/ directory exists in VSCode extension host',
      fallbackUsed: false,
    };
  }

  // Copilot: .github/prompts/ exists + Copilot extension active
  if (context.copilotPromptsExist && context.vsCodeExtensionHost) {
    const copilotActive = await this.isCopilotExtensionActive();
    if (copilotActive) {
      return {
        platform: 'copilot',
        confidence: 'high',
        reason:
          'GitHub Copilot Chat extension active + .github/prompts/ exists',
        fallbackUsed: false,
      };
    }
  }

  // Codex: .system/skills/ exists + terminal context
  if (context.codexSkillsExist) {
    return {
      platform: 'codex',
      confidence: 'medium',
      reason: '.system/skills/ directory exists',
      fallbackUsed: false,
    };
  }

  // 3. Fallback to Claude (backward compatibility)
  return {
    platform: 'claude',
    confidence: 'low',
    reason:
      'No clear detection signals - defaulting to Claude for backward compatibility',
    fallbackUsed: true,
  };
}
```

**Serves**:

- FR-013: Platform detection via execution context
- NFR-009: Logs detection decisions with reason

---

## 3. CommandGenerator Class

**Description**: Generates platform-specific command files from Claude reference
implementation. Transforms `.claude/commands/*.md` to
`.system/skills/*/SKILL.md` and `.github/prompts/*.prompt.md`.

**Location**: `extension/src/council/CommandGenerator.ts`

**Serves**:

- FR-014 (Command file generator script)
- NFR-006 (Single source of truth)
- US-6 (Cross-platform feature parity tests)

### Interface Definition

```typescript
/**
 * Generator for platform-specific command files
 * Transforms Claude commands to Codex skills and Copilot prompts
 */
export class CommandGenerator {
  private readonly sourceDir: string; // .claude/commands/
  private readonly templatesDir: string; // templates/

  /**
   * Constructor
   * @param workspaceRoot - Workspace root directory
   */
  constructor(workspaceRoot: string);

  /**
   * Generate all command files for target platform
   * Reads Claude commands and generates platform-specific versions
   *
   * @param targetPlatform - Platform to generate commands for
   * @returns Promise<GenerationResult> - Generation result with file count
   * @throws GenerationError if generation fails
   */
  async generateCommands(
    targetPlatform: 'codex' | 'copilot'
  ): Promise<GenerationResult>;

  /**
   * Generate single command file
   * Transforms one Claude command to target platform format
   *
   * @param commandName - Command to generate
   * @param targetPlatform - Target platform
   * @returns Promise<string> - Path to generated file
   */
  async generateCommand(
    commandName: string,
    targetPlatform: 'codex' | 'copilot'
  ): Promise<string>;

  /**
   * Transform command content to platform-specific format
   * Applies platform-specific templates and substitutions
   *
   * @param claudeContent - Original Claude command markdown
   * @param commandName - Command name
   * @param targetPlatform - Target platform
   * @returns string - Transformed content
   */
  transformContent(
    claudeContent: string,
    commandName: string,
    targetPlatform: 'codex' | 'copilot'
  ): string;

  /**
   * Inject platform-specific sections
   * Adds auto-chain, parallel agent, and platform notes
   *
   * @param content - Base content
   * @param targetPlatform - Target platform
   * @returns string - Content with injected sections
   */
  injectPlatformSections(
    content: string,
    targetPlatform: 'codex' | 'copilot'
  ): string;

  /**
   * Validate generated command file
   * Checks format, required sections, and syntax
   *
   * @param filePath - Path to generated file
   * @param targetPlatform - Expected platform
   * @returns Promise<ValidationResult> - Validation result
   */
  async validateGeneratedCommand(
    filePath: string,
    targetPlatform: 'codex' | 'copilot'
  ): Promise<ValidationResult>;
}
```

### Types

```typescript
/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean;
  filesGenerated: number;
  targetPlatform: 'codex' | 'copilot';
  outputDirectory: string;
  errors: GenerationError[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Generation error
 */
export class GenerationError extends Error {
  constructor(
    message: string,
    public commandName: string,
    public targetPlatform: string
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

/**
 * Platform-specific template
 */
export interface CommandTemplate {
  frontmatter: (metadata: CommandMetadata) => string;
  autoChainSection: (nextCommand: string) => string;
  parallelAgentSection: (agents: AgentConfig[]) => string;
  backwardCompatSection?: () => string;
}
```

### Template Examples

**Codex Skill Template**:

```markdown
---
name: { commandName }
description: { description }
---

# {title}

{originalContent}

## AUTO-CHAIN (Codex CLI)

After completing this stage, automatically invoke the next skill:

\`\`\`bash $ $gofer-{nextCommand} \`\`\`

Or let Codex auto-select the next skill based on context.
```

**Copilot Prompt Template**:

```markdown
---
name: { commandName }
description: { description }
agent: agent
tools: ['search/codebase', 'terminal', 'editFile', 'runCommand']
argument-hint: { argumentHint }
---

# {title}

{originalContent}

## AUTO-CHAIN (Copilot Chat)

After completing this stage, type in the next message:

\`\`\` /{nextCommand} \`\`\`

Copilot will automatically continue the pipeline.

## Parallel Agent Spawning (Copilot 2026+)

For validation stage, use Copilot's multi-agent delegation:

- Spawn 6 specialized agents concurrently
- Each agent runs validation checks in parallel
- Main agent synthesizes results

**For older Copilot versions**: Run agents sequentially via manual workflow.
```

**Serves**:

- FR-014: Generator script for platform-specific commands
- NFR-006: Maintains single source of truth

---

## 4. SkillDirectoryManager Interface

**Description**: Manages multi-directory skill discovery with priority fallback.
Searches `.claude/commands/`, `.system/skills/`, and `.github/prompts/` based on
platform.

**Location**: `extension/src/council/SkillDirectoryManager.ts`

**Serves**:

- FR-010 (Skill discovery multi-directory search)
- US-1 (Codex CLI command access)

### Interface Definition

```typescript
/**
 * Multi-directory skill loader
 * Searches for commands across platform directories with priority
 */
export interface SkillDirectoryManager {
  /**
   * Search for command across all directories
   * Priority: .claude/commands/ > .system/skills/ > .github/prompts/
   *
   * @param commandName - Command to search for
   * @returns Promise<string | null> - Absolute path to command file, or null
   */
  findCommand(commandName: string): Promise<string | null>;

  /**
   * List all commands in directory
   * Returns commands from specified platform directory
   *
   * @param directory - Directory to search ('claude' | 'codex' | 'copilot')
   * @returns Promise<string[]> - Array of command names
   */
  listCommands(directory: 'claude' | 'codex' | 'copilot'): Promise<string[]>;

  /**
   * Get command metadata
   * Reads frontmatter and extracts metadata
   *
   * @param commandPath - Absolute path to command file
   * @returns Promise<CommandMetadata> - Parsed metadata
   */
  getCommandMetadata(commandPath: string): Promise<CommandMetadata>;

  /**
   * Watch directories for changes
   * Sets up file watchers for command file updates
   *
   * @param callback - Called when command files change
   * @returns vscode.Disposable - Watcher disposable
   */
  watchDirectories(
    callback: (event: DirectoryChangeEvent) => void
  ): vscode.Disposable;
}

/**
 * Directory change event
 */
export interface DirectoryChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  commandName: string;
  filePath: string;
  platform: 'claude' | 'codex' | 'copilot';
}

/**
 * Default implementation
 */
export class DefaultSkillDirectoryManager implements SkillDirectoryManager {
  constructor(private workspaceRoot: string) {}

  async findCommand(commandName: string): Promise<string | null>;
  async listCommands(
    directory: 'claude' | 'codex' | 'copilot'
  ): Promise<string[]>;
  async getCommandMetadata(commandPath: string): Promise<CommandMetadata>;
  watchDirectories(
    callback: (event: DirectoryChangeEvent) => void
  ): vscode.Disposable;
}
```

### Search Algorithm

```typescript
/**
 * Multi-directory search with priority:
 *
 * 1. Check .claude/commands/{commandName}.md
 * 2. Check .system/skills/{commandName}/SKILL.md
 * 3. Check .github/prompts/{commandName}.prompt.md
 * 4. Return null if not found in any directory
 */
async function findCommand(commandName: string): Promise<string | null> {
  const directories = [
    { path: '.claude/commands', pattern: `${commandName}.md` },
    { path: '.system/skills', pattern: `${commandName}/SKILL.md` },
    { path: '.github/prompts', pattern: `${commandName}.prompt.md` },
  ];

  for (const dir of directories) {
    const fullPath = path.join(this.workspaceRoot, dir.path, dir.pattern);
    if (await fs.pathExists(fullPath)) {
      return fullPath;
    }
  }

  return null;
}
```

**Serves**:

- FR-010: Multi-directory search with priority fallback

---

## 5. ConfigManager Extensions

**Description**: Type-safe getters for cross-platform command settings.

**Location**: `extension/src/config.ts` (extend existing ConfigManager)

**Serves**:

- FR-006 (Default provider setting)
- US-5 (Default provider selection)

### New Configuration Keys

```typescript
export const CONFIG_KEYS = {
  // ... existing keys ...
  defaultCLI: 'gofer.defaultCLI',
} as const;

export const DEFAULTS = {
  // ... existing defaults ...
  defaultCLI: 'auto' as const,
} as const;
```

### New Getter Methods

```typescript
export class ConfigManager {
  // ... existing methods ...

  /**
   * Get default AI CLI platform
   *
   * @returns 'claude' | 'copilot' | 'codex' | 'auto' - User-selected platform
   */
  public getDefaultCLI(): 'claude' | 'copilot' | 'codex' | 'auto';

  /**
   * Get CLI platform display name
   *
   * @param platform - Platform identifier
   * @returns string - Human-readable name
   */
  public getCLIDisplayName(platform: 'claude' | 'copilot' | 'codex'): string;

  /**
   * Check if platform is enabled
   * Verifies if platform directory exists and is configured
   *
   * @param platform - Platform to check
   * @returns boolean - true if platform is enabled
   */
  public isPlatformEnabled(platform: 'claude' | 'copilot' | 'codex'): boolean;
}
```

### Implementation

```typescript
public getDefaultCLI(): 'claude' | 'copilot' | 'codex' | 'auto' {
  return this.config.get<'claude' | 'copilot' | 'codex' | 'auto'>(
    'defaultCLI',  // Strip gofer. prefix per convention
    DEFAULTS.defaultCLI
  );
}

public getCLIDisplayName(platform: 'claude' | 'copilot' | 'codex'): string {
  const names = {
    claude: 'Claude Code CLI',
    copilot: 'GitHub Copilot Chat',
    codex: 'Codex CLI'
  };
  return names[platform];
}

public isPlatformEnabled(platform: 'claude' | 'copilot' | 'codex'): boolean {
  // Check if directory exists
  const directories = {
    claude: '.claude/commands',
    copilot: '.github/prompts',
    codex: '.system/skills'
  };

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return false;

  const dirPath = path.join(workspaceRoot, directories[platform]);
  return fs.existsSync(dirPath);
}
```

### VSCode Settings Schema

**Location**: `extension/package.json` (extends contributes.configuration)

```json
{
  "gofer.defaultCLI": {
    "type": "string",
    "enum": ["claude", "copilot", "codex", "auto"],
    "enumDescriptions": [
      "Always use Claude Code CLI (requires .claude/commands/)",
      "Always use GitHub Copilot Chat (requires .github/prompts/)",
      "Always use Codex CLI (requires .system/skills/)",
      "Auto-detect based on available platforms (checks Claude first, then Codex, then Copilot)"
    ],
    "default": "auto",
    "markdownDescription": "Default AI platform for Gofer commands. Change takes effect immediately.",
    "order": 27
  }
}
```

**Serves**:

- FR-006: Dropdown setting for platform selection
- US-5: User preference for default platform

---

## Contract Summary

### Total Contracts: 5

| #   | Contract                   | Type                       | Interfaces/Methods      |
| --- | -------------------------- | -------------------------- | ----------------------- |
| 1   | CrossPlatformCommandRouter | Class                      | 6 methods + constructor |
| 2   | PlatformDetector           | Interface + Implementation | 4 methods               |
| 3   | CommandGenerator           | Class                      | 6 methods + constructor |
| 4   | SkillDirectoryManager      | Interface + Implementation | 4 methods               |
| 5   | ConfigManager Extensions   | Methods                    | 3 new methods           |

### Total Interfaces: 11

1. `CrossPlatformCommandRouter` (class)
2. `CommandExecutionResult` (interface)
3. `CommandMetadata` (interface)
4. `PlatformDetectionError` (class)
5. `CommandNotFoundError` (class)
6. `PlatformDetector` (interface)
7. `PlatformDetectionResult` (interface)
8. `PlatformDetectionContext` (interface)
9. `CommandGenerator` (class)
10. `GenerationResult` (interface)
11. `ValidationResult` (interface)
12. `SkillDirectoryManager` (interface)
13. `DirectoryChangeEvent` (interface)

### User Stories Served

| Contract                   | US-1 | US-2 | US-3 | US-4 | US-5 | US-6 | US-7 |
| -------------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| CrossPlatformCommandRouter | ✓    | ✓    |      |      | ✓    |      |      |
| PlatformDetector           | ✓    | ✓    |      |      | ✓    |      |      |
| CommandGenerator           | ✓    |      |      |      |      | ✓    |      |
| SkillDirectoryManager      | ✓    | ✓    |      |      |      |      |      |
| ConfigManager Extensions   |      |      |      |      | ✓    |      |      |

**Legend**:

- US-1: Codex CLI Full Command Access
- US-2: Auto-Chaining Across All Platforms
- US-3: Parallel Validation Agents
- US-4: Conversation History Preservation
- US-5: Default Provider Selection
- US-6: Cross-Platform Feature Parity Tests
- US-7: Capability Matrix Documentation

### Functional Requirements Served

**Core Routing**: FR-003 (cross-platform router), FR-013 (platform detection),
FR-006 (default provider setting)

**Command Generation**: FR-014 (generator script), FR-001 (Codex skills), FR-002
(Copilot prompts)

**Discovery**: FR-010 (multi-directory search), FR-015 (Codex auto-discovery)

**Auto-Chaining**: FR-004 (auto-chain instructions), FR-005 (parallel agent
spawning)

**Error Handling**: FR-012 (error normalization)

---

## Implementation Order

1. **Foundation** (Week 1):
   - PlatformDetector interface and implementation
   - ConfigManager extensions + VSCode settings
   - SkillDirectoryManager interface and implementation

2. **Routing** (Week 1-2):
   - CrossPlatformCommandRouter core logic
   - Platform detection algorithm
   - Command routing logic

3. **Generation** (Week 2):
   - CommandGenerator class
   - Platform-specific templates
   - Validation logic

4. **Integration** (Week 2-3):
   - Wire router to AutonomousCommands
   - Wire to MCP Tool Handler
   - Settings UI integration

5. **Testing** (Week 3):
   - Unit tests for each component
   - Integration tests for routing
   - E2E tests with all three platforms

---

## Backward Compatibility

All contracts maintain backward compatibility:

- Existing command execution flows unchanged
- New router is opt-in via `gofer.defaultCLI` setting
- Default 'auto' setting preserves current behavior (prefers Claude)
- No breaking changes to existing APIs

---

## Error Logging

All router operations must log to debug channel:

```typescript
{
  timestamp: string;           // ISO 8601
  component: string;            // 'CrossPlatformCommandRouter'
  operation: string;            // 'detectPlatform' | 'routeCommand' | 'getCommandPath'
  platform: string;             // Detected platform
  confidence: string;           // Detection confidence
  reason: string;               // Human-readable explanation
  fallbackUsed: boolean;        // true if used default setting
  error?: string;               // Error message if failed
}
```

**Requirement**: NFR-009 (Platform detection logging)
