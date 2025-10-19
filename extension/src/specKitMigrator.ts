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
      vscode.window.showInformationMessage('Already in Spec Kit format!');
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      `Upgrade .specify folder to GitHub Spec Kit format?\n\nThis will:\n- Create specs/, memory/, templates/ folders\n- Convert JSON specs to Markdown\n- Add constitution.md\n- Keep original JSON files as backup`,
      { modal: true },
      'Upgrade', 'Cancel'
    );

    if (choice !== 'Upgrade') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Upgrading to Spec Kit format...',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Creating folder structure...' });
        await this.createSpecKitStructure();

        progress.report({ message: 'Migrating specifications...' });
        await this.migrateJsonSpecs();

        progress.report({ message: 'Creating templates...' });
        await this.createTemplates();

        progress.report({ message: 'Finalizing...' });
        await this.createReadme();
      }
    );

    vscode.window.showInformationMessage(
      '✅ Upgraded to Spec Kit format!',
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
   * Create Spec Kit folder structure
   */
  private async createSpecKitStructure(): Promise<void> {
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
      // Copy from template
      await this.createConstitution();
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
   * Create template files
   */
  private async createTemplates(): Promise<void> {
    const templatesDir = path.join(this.specifyPath, 'templates');

    // spec-template.md
    const specTemplate = `---
feature: "[###-feature-name]"
status: "draft"
created: "[YYYY-MM-DD]"
updated: "[YYYY-MM-DD]"
author: "[author-name]"
---

# Feature Overview

[High-level description focusing on user value and business context]

## User Stories

- As a [user type], I want to [action] so that [benefit]

## Functional Requirements

1. **FR-001**: [Testable requirement]

## Success Criteria

- [Measurable outcome]

## Key Entities

- **EntityName**: field1, field2, field3

## Assumptions

- [Assumption 1]
`;

    await fs.writeFile(path.join(templatesDir, 'spec-template.md'), specTemplate);

    // plan-template.md
    const planTemplate = `# Technical Plan: [Feature Name]

## Technology Stack

- **Language/Runtime**:
- **Framework**:
- **Database**:
- **Testing**:

## Architecture

[Describe the architecture]

## Dependencies

-

## Implementation Notes

[Notes for developers]
`;

    await fs.writeFile(path.join(templatesDir, 'plan-template.md'), planTemplate);

    // tasks-template.md
    const tasksTemplate = `# Task Breakdown: [Feature Name]

## Setup Tasks

### T001: [Setup task]
**Category**: Setup
**Dependencies**: None
**Description**:

## Test Tasks (Write First!)

### T002: [P] Write tests for [feature]
**Category**: Testing
**Dependencies**: T001
**Description**:

## Implementation Tasks

### T003: Implement [feature]
**Category**: Implementation
**Dependencies**: T002
**Description**:
`;

    await fs.writeFile(path.join(templatesDir, 'tasks-template.md'), tasksTemplate);
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
