import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * Detects .specify folder format and handles migration/upgrade
 */
export class SpecKitMigrator {
  private workspacePath: string;
  private specifyPath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.specifyPath = path.join(workspacePath, '.specify');
  }

  /**
   * Check if .specify folder exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.specifyPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect the format of .specify folder
   */
  async detectFormat(): Promise<'none' | 'legacy-json' | 'spec-kit' | 'mixed'> {
    const exists = await this.exists();
    if (!exists) {
      return 'none';
    }

    const hasSpecs = await this.hasDirectory('specs');
    const hasMemory = await this.hasDirectory('memory');
    const hasTemplates = await this.hasDirectory('templates');
    const hasJsonSpecs = await this.hasJsonSpecs();

    // Spec Kit format has specs/, memory/, templates/
    const isSpecKit = hasSpecs && hasMemory && hasTemplates;

    // Legacy format has JSON files in root
    const isLegacy = hasJsonSpecs && !hasSpecs;

    if (isSpecKit && hasJsonSpecs) {
      return 'mixed'; // Has both formats
    } else if (isSpecKit) {
      return 'spec-kit';
    } else if (isLegacy) {
      return 'legacy-json';
    } else {
      return 'mixed'; // Partial or unknown
    }
  }

  /**
   * Check if a directory exists in .specify
   */
  private async hasDirectory(name: string): Promise<boolean> {
    try {
      const dirPath = path.join(this.specifyPath, name);
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if there are JSON spec files
   */
  private async hasJsonSpecs(): Promise<boolean> {
    try {
      const files = await fs.readdir(this.specifyPath);
      return files.some(f => f.endsWith('.json') && f !== 'spec-schema.json');
    } catch {
      return false;
    }
  }

  /**
   * Get version info from .specify folder
   */
  async getVersionInfo(): Promise<{ format: string; needsUpgrade: boolean; details: string }> {
    const format = await this.detectFormat();

    switch (format) {
      case 'none':
        return {
          format: 'none',
          needsUpgrade: false,
          details: 'No .specify folder found'
        };

      case 'legacy-json':
        return {
          format: 'legacy-json',
          needsUpgrade: true,
          details: 'Old JSON format detected. Upgrade to Spec Kit Markdown format?'
        };

      case 'spec-kit':
        return {
          format: 'spec-kit',
          needsUpgrade: false,
          details: 'Spec Kit format (up to date)'
        };

      case 'mixed':
        return {
          format: 'mixed',
          needsUpgrade: true,
          details: 'Mixed formats detected. Migrate remaining JSON specs to Markdown?'
        };

      default:
        return {
          format: 'unknown',
          needsUpgrade: false,
          details: 'Unknown format'
        };
    }
  }

  /**
   * Upgrade .specify folder to Spec Kit format
   */
  async upgrade(): Promise<void> {
    const format = await this.detectFormat();

    if (format === 'spec-kit') {
      // Even if already in spec-kit format, check if templates need updating
      await this.updateSpecKitTemplates();
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      `Install/Upgrade to GitHub Spec Kit format?\n\nThis will:\n- Install spec-kit CLI using uvx\n- Create proper folder structure\n- Copy latest templates from spec-kit\n- Set up Claude commands\n- Keep original files as backup`,
      { modal: true },
      'Upgrade', 'Cancel'
    );

    if (choice !== 'Upgrade') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Installing Spec Kit...',
        cancellable: false
      },
      async (progress) => {
        // Log version info
        const packageJson = require('../../package.json');
        console.log(`[SpecKit v${packageJson.version}] Starting initialization...`);

        progress.report({ message: 'Installing spec-kit CLI...' });
        console.log('[SpecKit] Starting CLI installation...');
        await this.installSpecKitCLI();

        progress.report({ message: 'Creating folder structure...' });
        console.log('[SpecKit] Creating folder structure...');
        await this.createSpecKitStructure();

        progress.report({ message: 'Migrating specifications...' });
        console.log('[SpecKit] Migrating specifications...');
        await this.migrateJsonSpecs();

        progress.report({ message: 'Setting up Claude commands...' });
        console.log('[SpecKit] Setting up Claude commands...');
        await this.setupClaudeCommands();

        progress.report({ message: 'Creating bash scripts...' });
        console.log('[SpecKit] Creating bash scripts...');
        await this.createBashScripts();

        progress.report({ message: 'Configuring VSCode settings...' });
        console.log('[SpecKit] Configuring VSCode settings...');
        await this.createVSCodeSettings();

        progress.report({ message: 'Finalizing...' });
        console.log('[SpecKit] Creating README...');
        await this.createReadme();

        console.log('[SpecKit] Installation complete!');
      }
    );

    vscode.window.showInformationMessage(
      '✅ Spec Kit installed successfully!',
      'View Constitution'
    ).then(choice => {
      if (choice === 'View Constitution') {
        const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');
        vscode.workspace.openTextDocument(constitutionPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });
  }

  /**
   * Install spec-kit CLI using uvx
   */
  private async installSpecKitCLI(): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Check if uvx is available
      try {
        await execAsync('uvx --version');
      } catch {
        // Try uv instead
        try {
          await execAsync('uv --version');
        } catch {
          throw new Error('UV/UVX not found. Please install UV first: https://docs.astral.sh/uv/');
        }
      }

      // IMPORTANT: Backup existing constitution before running spec-kit init
      const constitutionPath = path.join(this.workspacePath, '.specify', 'memory', 'constitution.md');
      let existingConstitution: string | null = null;
      
      try {
        existingConstitution = await fs.readFile(constitutionPath, 'utf-8');
        console.log('Backed up existing constitution for preservation');
      } catch {
        // No existing constitution - that's fine
      }

      // Install spec-kit using uvx with --force to ensure we get latest templates
      const command = `uvx --from git+https://github.com/github/spec-kit.git specify init --here --force --ai copilot --script sh`;

      // Change to workspace directory and run command
      const options = { cwd: this.workspacePath };

      await execAsync(command, options);

      // IMPORTANT: Restore existing constitution if it was backed up
      if (existingConstitution) {
        await fs.writeFile(constitutionPath, existingConstitution);
        console.log('Restored existing constitution after spec-kit init');
        vscode.window.showInformationMessage('✅ Templates updated while preserving your existing constitution');
      }

      console.log('Spec-kit CLI installed successfully');
    } catch (error: any) {
      console.error('Failed to install spec-kit CLI:', error);

      // Fallback to manual template creation if CLI install fails
      vscode.window.showWarningMessage(
        'Failed to install spec-kit CLI. Falling back to manual setup.',
        'OK'
      );

      // Create basic structure manually
      await this.createSpecKitStructureManually();
    }
  }

  /**
   * Update spec-kit templates for existing installation
   */
  private async updateSpecKitTemplates(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      'Update Spec Kit templates to latest version?',
      'Update', 'Cancel'
    );

    if (choice !== 'Update') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Updating Spec Kit templates...',
        cancellable: false
      },
      async (progress) => {
        const packageJson = require('../../package.json');
        console.log(`[SpecKit v${packageJson.version}] Updating existing installation...`);

        progress.report({ message: 'Reinstalling spec-kit with latest templates...' });
        console.log('[SpecKit Update] Starting CLI installation...');
        await this.installSpecKitCLI();

        progress.report({ message: 'Updating Claude commands...' });
        console.log('[SpecKit Update] Setting up Claude commands...');
        await this.setupClaudeCommands();

        progress.report({ message: 'Updating bash scripts...' });
        console.log('[SpecKit Update] Creating bash scripts...');
        await this.createBashScripts();

        progress.report({ message: 'Updating VSCode settings...' });
        console.log('[SpecKit Update] Configuring VSCode settings...');
        await this.createVSCodeSettings();

        console.log('[SpecKit Update] Update complete!');
      }
    );

    vscode.window.showInformationMessage('✅ Templates updated successfully!');
  }

  /**
   * Setup Claude commands from spec-kit
   */
  private async setupClaudeCommands(): Promise<void> {
    try {
      console.log('[setupClaudeCommands] Starting...');

      // Get the extension's bundled commands
      const extensionPath = vscode.extensions.getExtension('EnterpriseAI.specgofer')?.extensionPath;
      if (!extensionPath) {
        console.warn('[setupClaudeCommands] Could not find extension path for Claude commands');
        return;
      }

      console.log('[setupClaudeCommands] Extension path:', extensionPath);

      // Check if we have Claude commands in the extension bundle
      const bundledCommandsPath = path.join(extensionPath, 'resources', 'claude-commands');
      const claudeDir = path.join(this.workspacePath, '.claude');
      const commandsDir = path.join(claudeDir, 'commands');

      console.log('[setupClaudeCommands] Bundled commands path:', bundledCommandsPath);
      console.log('[setupClaudeCommands] Target commands dir:', commandsDir);

      // Ensure .claude/commands directory exists
      await fs.mkdir(commandsDir, { recursive: true });
      console.log('[setupClaudeCommands] Created directory:', commandsDir);

      try {
        // Try to copy from bundled resources first
        const files = await fs.readdir(bundledCommandsPath);
        console.log('[setupClaudeCommands] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          if (file.startsWith('speckit.') && file.endsWith('.md')) {
            const source = path.join(bundledCommandsPath, file);
            const target = path.join(commandsDir, file);
            await fs.copyFile(source, target);
            copiedCount++;
            console.log('[setupClaudeCommands] Copied:', file);
          }
        }
        console.log('[setupClaudeCommands] Successfully copied', copiedCount, 'command files');
      } catch (error) {
        // If no bundled commands, try to get from GitHub or local spec-kit installation
        console.error('[setupClaudeCommands] Error reading bundled commands:', error);
        console.log('[setupClaudeCommands] No bundled Claude commands found, checking for spec-kit installation');

        // Check if spec-kit created the commands
        const specKitCommandsDir = path.join(this.workspacePath, '.claude', 'commands');
        try {
          const files = await fs.readdir(specKitCommandsDir);
          const hasSpecKitCommands = files.some(f => f.startsWith('speckit.'));

          if (!hasSpecKitCommands) {
            console.warn('[setupClaudeCommands] No spec-kit Claude commands found after installation');
          } else {
            console.log('[setupClaudeCommands] Found spec-kit commands from CLI installation');
          }
        } catch {
          console.warn('[setupClaudeCommands] Claude commands directory not found');
        }
      }
    } catch (error) {
      console.error('[setupClaudeCommands] Failed to setup Claude commands:', error);
    }
  }

  /**
   * Create Spec Kit folder structure manually (fallback)
   */
  private async createSpecKitStructureManually(): Promise<void> {
    const folders = [
      'memory',
      'scripts/bash',
      'scripts/powershell',
      'specs',
      'templates'
    ];

    for (const folder of folders) {
      const folderPath = path.join(this.specifyPath, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }

    // Create constitution if it doesn't exist
    const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');
    try {
      await fs.access(constitutionPath);
    } catch {
      await this.createConstitution();
    }

    // Create proper templates from spec-kit format
    console.log('[SpecKit Fallback] Creating templates...');
    await this.createTemplates();

    // Setup Claude commands from bundled resources
    console.log('[SpecKit Fallback] Setting up Claude commands...');
    await this.setupClaudeCommands();

    // Create bash scripts from bundled resources
    console.log('[SpecKit Fallback] Creating bash scripts...');
    await this.createBashScripts();

    // Configure VSCode settings
    console.log('[SpecKit Fallback] Configuring VSCode settings...');
    await this.createVSCodeSettings();

    // Create README
    console.log('[SpecKit Fallback] Creating README...');
    await this.createReadme();

    console.log('[SpecKit Fallback] Manual setup complete!');
  }

  /**
   * Create Spec Kit folder structure
   */
  private async createSpecKitStructure(): Promise<void> {
    // The spec-kit CLI should have created the structure
    // Just ensure all directories exist
    const folders = [
      'memory',
      'scripts/bash',
      'scripts/powershell',
      'specs',
      'templates'
    ];

    for (const folder of folders) {
      const folderPath = path.join(this.specifyPath, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }
  }

  /**
   * Migrate JSON specs to Markdown format
   */
  private async migrateJsonSpecs(): Promise<void> {
    const files = await fs.readdir(this.specifyPath);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'spec-schema.json');

    let specNumber = 1;

    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(this.specifyPath, jsonFile);
      const content = await fs.readFile(jsonPath, 'utf-8');
      const spec = JSON.parse(content);

      // Generate spec ID
      const specId = spec.id || `${specNumber.toString().padStart(3, '0')}-${this.slugify(spec.title)}`;

      // Create spec directory
      const specDir = path.join(this.specifyPath, 'specs', specId);
      await fs.mkdir(specDir, { recursive: true });

      // Convert to Markdown
      const markdown = this.convertJsonToMarkdown(spec, specId);

      // Write spec.md
      await fs.writeFile(path.join(specDir, 'spec.md'), markdown);

      // Backup original JSON
      const backupDir = path.join(this.specifyPath, '_backup');
      await fs.mkdir(backupDir, { recursive: true });
      await fs.copyFile(jsonPath, path.join(backupDir, jsonFile));

      specNumber++;
    }
  }

  /**
   * Convert JSON spec to Markdown with YAML frontmatter
   */
  private convertJsonToMarkdown(spec: any, specId: string): string {
    const now = new Date().toISOString().split('T')[0];

    // YAML frontmatter
    const frontmatter = {
      feature: specId,
      status: spec.status || 'draft',
      created: now,
      updated: now,
      author: 'migrated'
    };

    const yamlStr = yaml.stringify(frontmatter);

    // Build Markdown content
    let markdown = `---\n${yamlStr}---\n\n`;

    // Feature Overview
    markdown += `# Feature Overview\n\n${spec.description || spec.title}\n\n`;

    // User Stories (if exists)
    if (spec.userStories && spec.userStories.length > 0) {
      markdown += `## User Stories\n\n`;
      spec.userStories.forEach((story: string) => {
        markdown += `- ${story}\n`;
      });
      markdown += `\n`;
    }

    // Functional Requirements (from tasks)
    if (spec.tasks && spec.tasks.length > 0) {
      markdown += `## Functional Requirements\n\n`;
      spec.tasks.forEach((task: any, i: number) => {
        markdown += `${i + 1}. **FR-${(i + 1).toString().padStart(3, '0')}**: ${task.description}\n`;
      });
      markdown += `\n`;
    }

    // Success Criteria (from acceptanceCriteria)
    if (spec.acceptanceCriteria && spec.acceptanceCriteria.length > 0) {
      markdown += `## Success Criteria\n\n`;
      spec.acceptanceCriteria.forEach((ac: any) => {
        markdown += `- ${ac.description}\n`;
      });
      markdown += `\n`;
    }

    // Key Entities (placeholder)
    markdown += `## Key Entities\n\n`;
    markdown += `[To be defined based on implementation]\n\n`;

    // Assumptions (placeholder)
    markdown += `## Assumptions\n\n`;
    markdown += `- Standard web browser environment\n`;
    markdown += `- Users have necessary permissions\n\n`;

    // Clarifications (from qaRules)
    if (spec.qaRules && spec.qaRules.length > 0) {
      markdown += `## Clarifications\n\n`;
      spec.qaRules.forEach((rule: any, i: number) => {
        markdown += `### Question ${i + 1}: ${rule.question}\n`;
        markdown += `**Q:** ${rule.question}\n`;
        markdown += `**A:** ${rule.answer}\n`;
        markdown += `**Confidence:** ${rule.confidence}\n\n`;
      });
    }

    return markdown;
  }

  /**
   * Create constitution.md from template
   */
  private async createConstitution(): Promise<void> {
    const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');

    // Read from the template we created earlier
    const templatePath = path.join(__dirname, '../../..', '.specify', 'memory', 'constitution.md');

    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      await fs.writeFile(constitutionPath, template);
    } catch {
      // If template doesn't exist, create a minimal one
      const minimalConstitution = `# Project Constitution

## Article I: Code Quality

All code must:
- Follow language best practices
- Include appropriate documentation
- Pass linting and type checking
- Maintain reasonable complexity

## Article II: Testing Standards

- Minimum 80% code coverage
- All features must have tests
- Tests must be reliable and fast

## Article III: User Experience

- Performance: API responses under 500ms
- All features must be accessible
- Error messages must be helpful

For the complete constitution template, see the Spec Kit documentation.
`;
      await fs.writeFile(constitutionPath, minimalConstitution);
    }
  }

  /**
   * Create template files with proper spec-kit format
   */
  private async createTemplates(): Promise<void> {
    const templatesDir = path.join(this.specifyPath, 'templates');

    // spec-template.md - proper spec-kit format
    const specTemplate = `---
feature: "[feature-id]"
status: "draft"
created: "[YYYY-MM-DD]"
updated: "[YYYY-MM-DD]"
author: "[author-name]"
---

# Feature Overview

[Provide a high-level description of the feature, focusing on user value and business context. Explain what problem this feature solves and who will benefit from it.]

## User Stories

- As a [user type], I want to [action] so that [benefit]
- As a [user type], I want to [action] so that [benefit]

## Functional Requirements

1. **FR-001**: [Describe a specific, testable requirement]
   - Acceptance: [How to verify this requirement is met]

2. **FR-002**: [Another requirement]
   - Acceptance: [Verification criteria]

## Success Criteria

- [ ] [Measurable outcome that indicates feature success]
- [ ] [Another measurable outcome]
- [ ] [Performance or quality metric]

## Key Entities

### [Entity Name]
- **field1**: [type] - [description]
- **field2**: [type] - [description]
- **relationships**: [describe relationships to other entities]

### [Another Entity]
- **field1**: [type] - [description]

## Assumptions

- [State any assumptions about the environment, users, or system]
- [Technical assumptions or constraints]
- [Business rules or requirements that are taken as given]

## Out of Scope

- [Explicitly state what this feature will NOT do]
- [Features or functionality to be addressed later]

## Risks and Mitigations

- **Risk**: [Potential issue]
  - **Mitigation**: [How to address it]

## Dependencies

### Internal
- [Other features or components this depends on]

### External
- [Third-party services, libraries, or systems]

## Clarifications

### Q1: [Question that arose during specification]
**Q:** [The question]
**A:** [The answer]
**Confidence:** [High/Medium/Low]
`;

    await fs.writeFile(path.join(templatesDir, 'spec-template.md'), specTemplate);

    // plan-template.md - proper spec-kit format
    const planTemplate = `# Technical Plan: [Feature Name]

## Technology Stack

- **Language/Runtime**: [e.g., TypeScript/Node.js 20+]
- **Framework**: [e.g., Express, React]
- **Database**: [e.g., PostgreSQL, Redis]
- **Testing**: [e.g., Jest, Playwright]
- **Infrastructure**: [e.g., AWS, Docker]

## Architecture

### System Architecture
[Describe the overall system architecture, including high-level components and their interactions]

### Component Design
[Detail the specific components that will be built or modified]

### Data Flow
[Explain how data moves through the system]

## API Design

### Endpoints
- **GET /api/[resource]**: [Description]
  - Request: [Format]
  - Response: [Format]

- **POST /api/[resource]**: [Description]
  - Request: [Format]
  - Response: [Format]

### Data Models
\`\`\`typescript
interface [ModelName] {
  id: string;
  // other fields
}
\`\`\`

## Implementation Strategy

### Phase 1: [Foundation]
- [ ] Set up project structure
- [ ] Configure development environment
- [ ] Set up testing framework

### Phase 2: [Core Features]
- [ ] Implement [feature]
- [ ] Add [capability]

### Phase 3: [Polish]
- [ ] Performance optimization
- [ ] Error handling improvements

## Security Considerations

- **Authentication**: [Approach]
- **Authorization**: [Strategy]
- **Data Protection**: [Methods]
- **Audit Logging**: [What will be logged]

## Performance Requirements

- **Response Time**: [Target latency]
- **Throughput**: [Requests per second]
- **Concurrent Users**: [Expected load]
- **Data Volume**: [Storage requirements]

## Testing Strategy

### Unit Tests
- [What will be unit tested]
- Coverage target: [percentage]

### Integration Tests
- [Integration points to test]

### E2E Tests
- [User flows to test]

### Performance Tests
- [Load testing scenarios]

## Monitoring and Observability

- **Metrics**: [What to measure]
- **Logging**: [What to log]
- **Alerting**: [Alert conditions]
- **Dashboards**: [Key visualizations]

## Migration Plan

- [ ] Data migration strategy
- [ ] Rollback plan
- [ ] Feature flag configuration

## Documentation Requirements

- [ ] API documentation
- [ ] Developer guide
- [ ] User documentation
- [ ] Runbook for operations

## Dependencies

### Libraries
- [package-name]: [version] - [purpose]

### Services
- [service-name]: [purpose]

### Infrastructure
- [resource]: [specification]

## Implementation Notes

[Special considerations, gotchas, or important details for developers]

## References

- [Link to design documents]
- [Link to related specifications]
- [External documentation]
`;

    await fs.writeFile(path.join(templatesDir, 'plan-template.md'), planTemplate);

    // tasks-template.md - proper spec-kit format
    const tasksTemplate = `# Task Breakdown: [Feature Name]

## Overview
Total Tasks: [count]
Estimated Effort: [time estimate]
Priority: [High/Medium/Low]

## Task Categories

### Setup & Configuration
Foundational tasks that prepare the development environment and project structure.

### Testing Infrastructure
Tasks to establish testing capabilities before implementation.

### Core Implementation
The main feature development tasks.

### Integration & Polish
Tasks to integrate the feature and refine the implementation.

## Tasks

### T001: [P] Set up development environment
**Category**: Setup
**Priority**: High
**Effort**: 1-2 hours
**Dependencies**: None
**Description**:
- Configure local development environment
- Install required dependencies
- Set up development database
- Verify build and test scripts work

**Acceptance Criteria**:
- [ ] All dependencies installed
- [ ] Tests can be run successfully
- [ ] Development server starts without errors

---

### T002: [P] Create test structure and fixtures
**Category**: Testing
**Priority**: High
**Effort**: 2-3 hours
**Dependencies**: T001
**Description**:
- Set up test directory structure
- Create test fixtures and mocks
- Configure test database
- Write initial smoke tests

**Acceptance Criteria**:
- [ ] Test framework configured
- [ ] Test fixtures created
- [ ] At least one passing test

---

### T003: [P] Write unit tests for [component]
**Category**: Testing
**Priority**: High
**Effort**: 3-4 hours
**Dependencies**: T002
**Description**:
- Write comprehensive unit tests
- Achieve >80% code coverage
- Include edge cases

**Acceptance Criteria**:
- [ ] All public methods have tests
- [ ] Edge cases covered
- [ ] Tests are maintainable and clear

---

### T004: Implement [core feature]
**Category**: Implementation
**Priority**: High
**Effort**: 4-6 hours
**Dependencies**: T003
**Description**:
- Implement the main functionality
- Follow established patterns
- Add appropriate logging

**Acceptance Criteria**:
- [ ] Feature works as specified
- [ ] All tests pass
- [ ] Code reviewed and approved

---

### T005: Add integration tests
**Category**: Testing
**Priority**: Medium
**Effort**: 2-3 hours
**Dependencies**: T004
**Description**:
- Write integration tests for API endpoints
- Test database interactions
- Verify error handling

**Acceptance Criteria**:
- [ ] All endpoints tested
- [ ] Error cases handled
- [ ] Database transactions verified

---

### T006: Implement error handling and logging
**Category**: Implementation
**Priority**: Medium
**Effort**: 2-3 hours
**Dependencies**: T004
**Description**:
- Add comprehensive error handling
- Implement structured logging
- Add monitoring hooks

**Acceptance Criteria**:
- [ ] All errors handled gracefully
- [ ] Logging provides debugging info
- [ ] Monitoring integration complete

---

### T007: Performance optimization
**Category**: Polish
**Priority**: Low
**Effort**: 2-4 hours
**Dependencies**: T005
**Description**:
- Profile and optimize performance
- Add caching where appropriate
- Optimize database queries

**Acceptance Criteria**:
- [ ] Performance targets met
- [ ] No N+1 queries
- [ ] Response times under threshold

---

### T008: Documentation and deployment
**Category**: Documentation
**Priority**: Medium
**Effort**: 2-3 hours
**Dependencies**: T006
**Description**:
- Write API documentation
- Update README
- Create deployment guide
- Add to changelog

**Acceptance Criteria**:
- [ ] API fully documented
- [ ] Setup instructions clear
- [ ] Deployment process documented

## Task Dependencies Diagram

\`\`\`
T001 (Setup)
  └── T002 (Test Structure)
       └── T003 (Unit Tests)
            └── T004 (Implementation)
                 ├── T005 (Integration Tests)
                 ├── T006 (Error Handling)
                 │    └── T007 (Performance)
                 └── T008 (Documentation)
\`\`\`

## Risk Mitigation

- **Blocked on T001**: Have fallback development container ready
- **T004 takes longer**: Can be split into subtasks
- **Performance issues in T007**: Consider phased optimization

## Notes

- Tasks marked with [P] should be done in pair programming or with review
- Update task estimates based on actual time spent
- Add new tasks as discovered during implementation
`;

    await fs.writeFile(path.join(templatesDir, 'tasks-template.md'), tasksTemplate);
  }

  /**
   * Create bash scripts from bundled resources
   */
  private async createBashScripts(): Promise<void> {
    try {
      console.log('[createBashScripts] Starting...');

      const extensionPath = vscode.extensions.getExtension('EnterpriseAI.specgofer')?.extensionPath;
      if (!extensionPath) {
        console.warn('[createBashScripts] Could not find extension path for bash scripts');
        return;
      }

      console.log('[createBashScripts] Extension path:', extensionPath);

      const bundledScriptsPath = path.join(extensionPath, 'resources', 'bash-scripts');
      const targetScriptsPath = path.join(this.specifyPath, 'scripts', 'bash');

      console.log('[createBashScripts] Bundled scripts path:', bundledScriptsPath);
      console.log('[createBashScripts] Target scripts path:', targetScriptsPath);

      // Ensure target directory exists
      await fs.mkdir(targetScriptsPath, { recursive: true });
      console.log('[createBashScripts] Created directory:', targetScriptsPath);

      try {
        // Copy all .sh files from bundled resources
        const files = await fs.readdir(bundledScriptsPath);
        console.log('[createBashScripts] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.sh')) {
            const source = path.join(bundledScriptsPath, file);
            const target = path.join(targetScriptsPath, file);
            await fs.copyFile(source, target);

            // Make scripts executable
            await fs.chmod(target, 0o755);
            copiedCount++;
            console.log('[createBashScripts] Copied and made executable:', file);
          }
        }
        console.log('[createBashScripts] Successfully created', copiedCount, 'bash scripts');
      } catch (error) {
        console.error('[createBashScripts] Error reading bundled scripts:', error);
        console.warn('[createBashScripts] No bundled bash scripts found, skipping script creation');
      }
    } catch (error) {
      console.error('[createBashScripts] Failed to create bash scripts:', error);
    }
  }

  /**
   * Create or update VSCode settings.json for Spec Kit
   */
  private async createVSCodeSettings(): Promise<void> {
    try {
      console.log('[createVSCodeSettings] Starting...');

      const vscodeDir = path.join(this.workspacePath, '.vscode');
      const settingsPath = path.join(vscodeDir, 'settings.json');

      console.log('[createVSCodeSettings] VSCode dir:', vscodeDir);
      console.log('[createVSCodeSettings] Settings path:', settingsPath);

      // Ensure .vscode directory exists
      await fs.mkdir(vscodeDir, { recursive: true });
      console.log('[createVSCodeSettings] Created directory:', vscodeDir);

      // Read existing settings or start with empty object
      let settings: any = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf-8');
        settings = JSON.parse(existingContent);
        console.log('[createVSCodeSettings] Loaded existing settings');
      } catch {
        console.log('[createVSCodeSettings] No existing settings found, creating new');
      }

      // Add Spec Kit specific settings
      const specKitSettings = {
        'files.associations': {
          '**/.specify/**/*.md': 'markdown',
          '**/.claude/commands/*.md': 'markdown'
        },
        'search.exclude': {
          '**/.specify/_backup/**': true,
          '**/.specify/_archive/**': true
        },
        'files.exclude': {
          '**/.specify/_backup/**': true
        }
      };

      // Merge settings (don't overwrite existing)
      for (const [key, value] of Object.entries(specKitSettings)) {
        if (!settings[key]) {
          settings[key] = value;
          console.log('[createVSCodeSettings] Added setting:', key);
        } else {
          // Merge nested objects
          settings[key] = { ...value, ...settings[key] };
          console.log('[createVSCodeSettings] Merged setting:', key);
        }
      }

      // Write back to file
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      console.log('[createVSCodeSettings] Successfully updated .vscode/settings.json');
    } catch (error) {
      console.error('[createVSCodeSettings] Failed to create VSCode settings:', error);
    }
  }

  /**
   * Create README in .specify folder
   */
  private async createReadme(): Promise<void> {
    const readme = `# Specification Directory

This folder contains all project specifications following GitHub Spec Kit standards.

## Structure

- **memory/** - Constitution and project principles
- **specs/** - Feature specifications (numbered: 001-feature-name/)
- **templates/** - Templates for creating new specs
- **scripts/** - Helper scripts for workflow

## Creating a New Spec

1. Use the Spec Kit extension: "Spec Kit: Create New Specification"
2. Or manually: Copy templates/spec-template.md to specs/###-feature-name/spec.md
3. Fill out all sections
4. Generate technical plan
5. Break down into tasks

## Workflow

1. **Specify** - Create spec.md with requirements
2. **Plan** - Generate plan.md with architecture
3. **Tasks** - Break down into tasks.md
4. **Implement** - Execute tasks in order
5. **Validate** - Check against constitution

See the extension documentation for more details.
`;

    await fs.writeFile(path.join(this.specifyPath, 'README.md'), readme);
  }

  /**
   * Convert string to slug format
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
