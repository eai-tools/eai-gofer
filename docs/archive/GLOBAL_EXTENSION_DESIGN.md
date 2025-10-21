# Global Spec Kit Extension - Redesign

## Your New Vision

You want to:
1. **Install extension once** in VSCode (globally)
2. **Open any repository** → Extension offers to initialize Spec Kit
3. **Create specs using UI** → No manual file editing
4. **Send tasks to existing tools** → Claude terminals or GitHub Copilot (hook into them, don't replace)
5. **Track progress** → Visual tree view shows status

## How It Works

### 1. Installation (One Time)

```bash
cd extension
npm install
npm run compile
npx @vscode/vsce package
code --install-extension spec-kit-orchestrator-1.0.0.vsix
```

Or press F5 for development mode.

### 2. Using in Any Repo

```
1. Open VSCode
2. File → Open Folder (any repo)
3. Extension detects: "No .specify folder found"
4. Shows welcome view: "Initialize Spec Kit?"
5. Click "Initialize" → Creates structure
6. Start creating specs!
```

### 3. UI Flow

**Activity Bar:**
- New "Spec Kit" icon appears (notebook icon)
- Click it → Shows two panels:
  - **Specifications** - All specs/tasks
  - **Constitution** - Project principles

**Creating a Spec:**
```
1. Click + icon in Specifications panel
2. Dialog: "Enter feature name"
3. You type: "User Login"
4. Extension creates: .specify/specs/001-user-login/
5. Opens spec.md template in editor
6. You fill it out (or use AI to help)
7. Click "Generate Plan" → Creates plan.md
8. Click "Generate Tasks" → Creates tasks.md
```

**Sending to AI:**
```
1. Tree view shows:
   📋 001-user-login
      ├── ⚪ T001: Create login form
      ├── ⚪ T002: Add authentication API
      └── ⚪ T003: Write tests

2. Right-click T001
3. Choose: "Send to Claude" or "Send to Copilot"
4. Extension detects active Claude terminal
5. Sends formatted prompt to terminal
6. You see it execute in real-time
7. Mark task complete when done
```

## Key Components

### 1. SpecKitInitializer
Creates `.specify` structure in any repo:
```typescript
class SpecKitInitializer {
  async initialize(workspacePath: string) {
    // Create folders
    await fs.mkdir('.specify/memory');
    await fs.mkdir('.specify/scripts/bash');
    await fs.mkdir('.specify/specs');
    await fs.mkdir('.specify/templates');

    // Copy constitution template
    await this.copyConstitution();

    // Copy script templates
    await this.copyScripts();

    // Create README
    await this.createReadme();

    // Create AGENTS.md
    await this.createAgentsFile();
  }
}
```

### 2. SpecProvider (Tree View)
Shows specs and tasks:
```typescript
class SpecProvider implements vscode.TreeDataProvider {
  // Shows hierarchy:
  // - Spec folders (001-feature-name)
  //   - spec.md
  //   - plan.md
  //   - Tasks
  //     - T001: Task 1
  //     - T002: Task 2

  getChildren(element) {
    if (!element) {
      // Root: return all spec folders
      return this.loadAllSpecs();
    } else if (element.type === 'spec') {
      // Show spec contents
      return this.loadSpecContents(element);
    } else if (element.type === 'tasks') {
      // Show individual tasks
      return this.loadTasks(element);
    }
  }
}
```

### 3. ClaudeTerminalIntegration
Hooks into existing Claude Code terminals:
```typescript
class ClaudeTerminalIntegration {
  async sendTask(task: Task) {
    // Find active Claude terminal
    const terminal = this.findClaudeTerminal();

    if (!terminal) {
      // No terminal found, offer to create one
      const choice = await vscode.window.showWarningMessage(
        'No Claude Code terminal found. Open Claude?',
        'Yes', 'No'
      );

      if (choice === 'Yes') {
        // Open Claude Code interface
        await vscode.commands.executeCommand('claude.openChat');
      }
      return;
    }

    // Format task as prompt
    const prompt = this.formatTaskPrompt(task);

    // Send to terminal
    terminal.sendText(prompt);
    terminal.show();
  }

  private findClaudeTerminal(): vscode.Terminal | undefined {
    const config = vscode.workspace.getConfiguration('specKit');
    const terminalName = config.get<string>('claudeTerminalName', 'Claude');

    return vscode.window.terminals.find(t =>
      t.name.toLowerCase().includes(terminalName.toLowerCase())
    );
  }

  private formatTaskPrompt(task: Task): string {
    return `# Task ${task.id}: ${task.description}

Please implement this task according to the specification:

${task.deliveryPrompt}

Make sure to:
1. Follow the project constitution (.specify/memory/constitution.md)
2. Write tests first (TDD approach)
3. Update the specification when complete

Let me know when you're done!`;
  }
}
```

### 4. CopilotIntegration
Sends tasks to GitHub Copilot Chat:
```typescript
class CopilotIntegration {
  async sendTask(task: Task) {
    // Use Copilot Chat API
    const prompt = this.formatForCopilot(task);

    // Open Copilot Chat with prompt
    await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');

    // Note: VSCode doesn't have direct API to send to Copilot Chat yet
    // So we copy to clipboard and show message
    await vscode.env.clipboard.writeText(prompt);

    vscode.window.showInformationMessage(
      'Task copied to clipboard. Paste into Copilot Chat!',
      'Open Copilot'
    ).then(choice => {
      if (choice === 'Open Copilot') {
        vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
      }
    });
  }

  private formatForCopilot(task: Task): string {
    return `@workspace Implement this task from Spec Kit:

**Task**: ${task.description}

**Details**: ${task.deliveryPrompt}

**Constitution**: Check .specify/memory/constitution.md for project principles.

**Related Files**: See .specify/specs/${task.specId}/

Please implement following TDD approach and constitutional guidelines.`;
  }
}
```

### 5. SpecGenerator
UI-driven spec creation:
```typescript
class SpecGenerator {
  async createNewSpec() {
    // Interactive wizard
    const featureName = await vscode.window.showInputBox({
      prompt: 'Enter feature name',
      placeHolder: 'e.g., User Authentication'
    });

    if (!featureName) return;

    // Get next number
    const nextNum = await this.getNextSpecNumber();
    const specId = `${nextNum.toString().padStart(3, '0')}-${this.slugify(featureName)}`;

    // Create directory
    const specDir = path.join(this.workspacePath, '.specify', 'specs', specId);
    await fs.mkdir(specDir, { recursive: true });

    // Create spec.md from template
    const specContent = await this.generateSpecTemplate(featureName, specId);
    await fs.writeFile(path.join(specDir, 'spec.md'), specContent);

    // Open in editor
    const doc = await vscode.workspace.openTextDocument(path.join(specDir, 'spec.md'));
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      `Created specification: ${specId}`,
      'Generate Plan'
    ).then(choice => {
      if (choice === 'Generate Plan') {
        this.generatePlan(specId);
      }
    });
  }

  async generatePlan(specId?: string) {
    if (!specId) {
      // Let user choose spec
      specId = await this.selectSpec();
    }

    if (!specId) return;

    // Read spec.md
    const specPath = path.join(this.workspacePath, '.specify', 'specs', specId, 'spec.md');
    const specContent = await fs.readFile(specPath, 'utf-8');

    // Ask user for tech stack
    const techStack = await vscode.window.showQuickPick([
      'Node.js + React + TypeScript',
      'Python + Flask',
      'Ruby on Rails',
      'Custom...'
    ], {
      placeHolder: 'Select tech stack'
    });

    if (!techStack) return;

    // Generate plan using template
    const planContent = await this.generatePlanTemplate(specContent, techStack);

    // Write plan.md
    const planPath = path.join(this.workspacePath, '.specify', 'specs', specId, 'plan.md');
    await fs.writeFile(planPath, planContent);

    // Open plan
    const doc = await vscode.workspace.openTextDocument(planPath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage('Plan generated!', 'Generate Tasks').then(choice => {
      if (choice === 'Generate Tasks') {
        this.generateTasks(specId);
      }
    });
  }

  async generateTasks(specId?: string) {
    // Similar to generatePlan
    // Reads spec.md and plan.md
    // Generates tasks.md with TDD ordering
  }

  async validate(): Promise<ValidationResult> {
    // Load constitution
    const constitution = await this.loadConstitution();

    // Load all specs
    const specs = await this.loadAllSpecs();

    // Validate each spec
    const violations: string[] = [];

    for (const spec of specs) {
      const result = await this.validateSpec(spec, constitution);
      violations.push(...result.violations);
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}
```

## Extension Manifest (package.json)

Key features:
- **Activation**: `onStartupFinished` (always active, lightweight)
- **Activity Bar**: Custom "Spec Kit" section
- **Commands**: Initialize, Create Spec, Send to Claude/Copilot
- **Views**: Specifications tree, Constitution viewer
- **Settings**: Preferred AI, auto-initialize, terminal names

## User Experience

### First Time in New Repo

```
1. Open VSCode
2. File → Open Folder → my-new-project
3. See "Spec Kit" icon in activity bar (grayed out)
4. Click it
5. Welcome view: "No Spec Kit found in this workspace"
6. Button: "Initialize Spec Kit"
7. Click → Creates .specify structure
8. Shows quick start guide
9. Button: "Create Your First Spec"
10. Guided wizard walks through spec creation
```

### Working with Existing Spec Kit Repo

```
1. Open repo with .specify folder
2. Extension auto-detects
3. Loads all specs into tree view
4. Shows status (completed/pending)
5. Right-click any task → "Send to Claude"
6. Work in Claude terminal
7. When done, mark task complete in tree
8. Progress updates automatically
```

### Multi-Tool Workflow

**Using Claude Code:**
```
1. Open Claude Code terminal (Cmd+Shift+P → Claude)
2. In Spec Kit tree, right-click task
3. "Send to Claude"
4. Task appears in Claude terminal
5. Claude implements
6. You review
7. Mark complete in Spec Kit tree
```

**Using GitHub Copilot:**
```
1. Open Copilot Chat panel
2. In Spec Kit tree, right-click task
3. "Send to Copilot"
4. Prompt copied to clipboard
5. Paste into Copilot Chat
6. Copilot suggests implementation
7. Accept changes
8. Mark complete in Spec Kit tree
```

**Hybrid Approach:**
```
1. Use Copilot for quick tasks
2. Use Claude for complex reasoning
3. Spec Kit tracks all progress
4. Constitution validates everything
```

## File Structure After Initialization

```
your-repo/
├── .specify/                    # Created by extension
│   ├── memory/
│   │   └── constitution.md     # Quality gates
│   ├── scripts/
│   │   └── bash/
│   ├── specs/                  # Your features
│   └── templates/
├── AGENTS.md                   # Created by extension
├── src/                        # Your code
└── tests/                      # Your tests
```

## Settings

```json
{
  "specKit.autoInitialize": true,
  "specKit.preferredAI": "claude",
  "specKit.claudeTerminalName": "Claude",
  "specKit.autoValidate": true,
  "specKit.showWelcome": true
}
```

## Commands Available

- `Spec Kit: Initialize Repository` - Create .specify structure
- `Spec Kit: Create New Specification` - Guided spec creation
- `Spec Kit: Generate Technical Plan` - Create plan.md
- `Spec Kit: Generate Task Breakdown` - Create tasks.md
- `Spec Kit: Validate Specifications` - Check constitution compliance
- `Spec Kit: Send Current Task to Claude` - Send to Claude terminal
- `Spec Kit: Send Current Task to Copilot` - Send to Copilot Chat
- `Spec Kit: Show Progress Panel` - Open tree view
- `Spec Kit: Refresh Specifications` - Reload from disk

## Key Advantages

1. **Install Once, Use Everywhere** - Works in any repo
2. **No External Process** - Extension only, no Node.js orchestrator
3. **Hooks Existing Tools** - Works with Claude/Copilot you already use
4. **Visual Interface** - Tree view, buttons, guided wizards
5. **Spec Kit Compliant** - Follows GitHub standards
6. **Lightweight** - No background processes, no file watchers
7. **Marketplace Ready** - Can publish to VSCode marketplace

## Next Steps

To implement this redesign:

1. Create new TypeScript files:
   - `specKitInitializer.ts`
   - `specProvider.ts`
   - `constitutionProvider.ts`
   - `claudeTerminalIntegration.ts`
   - `copilotIntegration.ts`
   - `specGenerator.ts`

2. Update `extension.ts` to use new architecture

3. Remove orchestrator process (not needed)

4. Test in development mode

5. Package for distribution

Would you like me to implement this new architecture?
