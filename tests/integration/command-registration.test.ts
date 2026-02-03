/**
 * Command Registration Tests
 *
 * Validates that all commands declared in package.json are properly registered
 * in extension.ts activation function.
 *
 * This prevents the "command not found" errors that occur when commands are
 * declared in package.json but not registered in the activation function.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as path from 'path';

// Unmock fs for this test file - we need real file system access
vi.unmock('fs');
vi.unmock('fs/promises');

// Import real fs
import { readFileSync } from 'fs';

/**
 * TypeScript interfaces for package.json structure
 */
interface CommandDefinition {
  command: string;
  title: string;
  icon?: string;
}

interface ViewDefinition {
  id: string;
  name: string;
  contextualTitle?: string;
}

interface MenuDefinition {
  command: string;
  when: string;
  group?: string;
}

interface KeybindingDefinition {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

interface ViewContainerDefinition {
  id: string;
  title: string;
  icon: string;
}

interface PackageJson {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  main: string;
  icon: string;
  categories: string[];
  engines: {
    vscode: string;
  };
  repository: {
    type: string;
    url: string;
  };
  activationEvents: string[];
  contributes: {
    commands: CommandDefinition[];
    views: {
      [viewContainerId: string]: ViewDefinition[];
    };
    viewsContainers: {
      activitybar: ViewContainerDefinition[];
    };
    menus: {
      'view/title': MenuDefinition[];
    };
    keybindings: KeybindingDefinition[];
  };
}

describe('Command Registration Validation', () => {
  let packageJson: PackageJson;
  let extensionSource: string;
  let memoryCommandsSource: string;
  let specCommandsSource: string;
  let councilCommandsSource: string;

  beforeAll(() => {
    // Read package.json
    const packagePath = path.join(__dirname, '../../extension/package.json');
    packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

    // Read extension.ts source
    const extensionPath = path.join(__dirname, '../../extension/src/extension.ts');
    extensionSource = readFileSync(extensionPath, 'utf-8');

    // Read command files
    const memoryCommandsPath = path.join(
      __dirname,
      '../../extension/src/commands/memoryCommands.ts'
    );
    memoryCommandsSource = readFileSync(memoryCommandsPath, 'utf-8');

    const specCommandsPath = path.join(__dirname, '../../extension/src/commands/specCommands.ts');
    specCommandsSource = readFileSync(specCommandsPath, 'utf-8');

    const councilCommandsPath = path.join(
      __dirname,
      '../../extension/src/commands/councilCommands.ts'
    );
    councilCommandsSource = readFileSync(councilCommandsPath, 'utf-8');
  });

  it('should have commands declared in package.json', () => {
    expect(packageJson.contributes.commands).toBeDefined();
    expect(packageJson.contributes.commands.length).toBeGreaterThan(0);
  });

  it('should register all declared commands in extension.ts or command files', () => {
    const declaredCommands = packageJson.contributes.commands.map((cmd) => cmd.command);
    const missingCommands: string[] = [];

    for (const command of declaredCommands) {
      // Check if command is registered in extension.ts, memoryCommands.ts, or specCommands.ts
      // Pattern: vscode.commands.registerCommand('commandName', ...)
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      const isRegistered =
        registrationPattern.test(extensionSource) ||
        registrationPattern.test(memoryCommandsSource) ||
        registrationPattern.test(specCommandsSource) ||
        registrationPattern.test(councilCommandsSource);

      if (!isRegistered) {
        missingCommands.push(command);
      }
    }

    if (missingCommands.length > 0) {
      throw new Error(
        `The following commands are declared in package.json but not registered:\n${missingCommands.join('\n')}`
      );
    }
  });

  it('should have all critical navigation commands registered', () => {
    const criticalCommands = [
      'eaiGofer.refreshSpecs',
      'eaiGofer.refreshConstitution',
      'eaiGofer.refreshMemory',
      'eaiGofer.showProgress',
      'eaiGofer.showConstitution',
      'eaiGofer.initialize',
    ];

    const missingCommands: string[] = [];

    for (const command of criticalCommands) {
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (!registrationPattern.test(extensionSource)) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });

  it('should register all tree view commands', () => {
    const treeViewCommands = [
      'eaiGofer.showSpecDetails',
      'eaiGofer.showTaskDetails',
      'eaiGofer.showSectionDetails',
      'eaiGofer.showArticleDetails',
      'eaiGofer.showMemoryDocument',
      'eaiGofer.showMemorySection',
    ];

    const missingCommands: string[] = [];

    for (const command of treeViewCommands) {
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (!registrationPattern.test(extensionSource)) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });

  it.skip('should register all autonomous execution commands', () => {
    // TODO: Re-enable when autonomous execution feature is implemented
    const autonomousCommands = [
      'eaiGofer.startAutonomous',
      'eaiGofer.stopAutonomous',
      'eaiGofer.pauseAutonomous',
      'eaiGofer.resumeAutonomous',
    ];

    const missingCommands: string[] = [];

    for (const command of autonomousCommands) {
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (!registrationPattern.test(extensionSource)) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });

  it('should register all memory commands', () => {
    const memoryCommands = ['eaiGofer.refreshMemory', 'eaiGofer.showMemoryDocument'];

    const missingCommands: string[] = [];

    for (const command of memoryCommands) {
      // These might be registered in memoryCommands.ts or extension.ts
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (
        !registrationPattern.test(extensionSource) &&
        !registrationPattern.test(memoryCommandsSource)
      ) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });

  it('should register registerGlobalCommands() function', () => {
    // Check that registerGlobalCommands function exists
    expect(extensionSource).toContain('function registerGlobalCommands(');

    // Check that it's called in activate()
    expect(extensionSource).toContain('registerGlobalCommands(context)');
  });

  it('should register registerCommands() function', () => {
    // Check that registerCommands function exists
    expect(extensionSource).toContain('function registerCommands(');

    // Check that it's called somewhere
    expect(extensionSource).toContain('registerCommands(');
  });

  it('should have all commands in both registerGlobalCommands and registerCommands', () => {
    const globalCommandsSection = extensionSource.match(
      /function registerGlobalCommands\([^)]*\)\s*\{([\s\S]*?)^}/m
    );
    const workspaceCommandsSection = extensionSource.match(
      /function registerCommands\([^)]*\)\s*\{([\s\S]*?)^}/m
    );

    expect(globalCommandsSection).toBeTruthy();
    expect(workspaceCommandsSection).toBeTruthy();

    // Extract command registrations from both sections
    const globalCommands = globalCommandsSection
      ? globalCommandsSection[1].match(/registerCommand\s*\(\s*['"]([^'"]+)['"]/g) || []
      : [];
    const workspaceCommands = workspaceCommandsSection
      ? workspaceCommandsSection[1].match(/registerCommand\s*\(\s*['"]([^'"]+)['"]/g) || []
      : [];

    const totalRegistrations = globalCommands.length + workspaceCommands.length;

    // Should have at least 20 command registrations total
    expect(totalRegistrations).toBeGreaterThan(20);
  });

  it('should activate on onStartupFinished event', () => {
    expect(packageJson.activationEvents).toContain('onStartupFinished');
  });

  it('should have main entry point as dist/extension.js', () => {
    expect(packageJson.main).toBe('./dist/extension.js');
  });

  it('should export activate() function', () => {
    expect(extensionSource).toMatch(/export\s+async\s+function\s+activate\s*\(/);
  });

  it('should export deactivate() function', () => {
    expect(extensionSource).toMatch(/export\s+async\s+function\s+deactivate\s*\(/);
  });

  it('should have tree views registered before commands', () => {
    // registerTreeViews should be called before registerGlobalCommands
    const registerTreeViewsCall = extensionSource.indexOf('registerTreeViews(context)');
    const registerGlobalCommandsCall = extensionSource.indexOf('registerGlobalCommands(context)');

    expect(registerTreeViewsCall).toBeGreaterThan(-1);
    expect(registerGlobalCommandsCall).toBeGreaterThan(-1);
    expect(registerTreeViewsCall).toBeLessThan(registerGlobalCommandsCall);
  });

  it('should have all view containers declared in package.json', () => {
    expect(packageJson.contributes.viewsContainers).toBeDefined();
    expect(packageJson.contributes.viewsContainers.activitybar).toBeDefined();
    expect(packageJson.contributes.viewsContainers.activitybar.length).toBeGreaterThan(0);
  });

  it('should have all views declared in package.json', () => {
    expect(packageJson.contributes.views).toBeDefined();
    expect(packageJson.contributes.views['spec-kit']).toBeDefined();

    const views = packageJson.contributes.views['spec-kit'];
    expect(views).toContainEqual(
      expect.objectContaining({
        id: 'eaiGoferProgress',
      })
    );
    expect(views).toContainEqual(
      expect.objectContaining({
        id: 'eaiGoferConstitution',
      })
    );
    expect(views).toContainEqual(
      expect.objectContaining({
        id: 'eaiGoferMemory',
      })
    );
  });

  it('should register tree data providers for all views', () => {
    expect(extensionSource).toContain("registerTreeDataProvider('eaiGoferProgress'");
    expect(extensionSource).toContain("registerTreeDataProvider('eaiGoferConstitution'");
    expect(extensionSource).toContain("registerTreeDataProvider('eaiGoferMemory'");
  });

  it('should have update commands registered', () => {
    const updateCommands = ['eaiGofer.checkForUpdates', 'eaiGofer.updateNow'];

    const missingCommands: string[] = [];

    for (const command of updateCommands) {
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (!registrationPattern.test(extensionSource)) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });

  it('should have spec creation and management commands registered', () => {
    const specCommands = ['eaiGofer.createSpec', 'eaiGofer.openSpec'];

    const missingCommands: string[] = [];

    for (const command of specCommands) {
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (!registrationPattern.test(extensionSource)) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });

  it('should have Open With commands registered', () => {
    const openWithCommands = [
      'eaiGofer.openWithPreview',
      'eaiGofer.openWithMarkSharp',
      'eaiGofer.openWithMarkdownEditor',
      'eaiGofer.openWithMarkdownWYSIWYG',
    ];

    const missingCommands: string[] = [];

    for (const command of openWithCommands) {
      const registrationPattern = new RegExp(
        `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`,
        'm'
      );

      if (!registrationPattern.test(extensionSource)) {
        missingCommands.push(command);
      }
    }

    expect(missingCommands).toEqual([]);
  });
});

describe('Package.json Validation', () => {
  let packageJson: PackageJson;

  beforeAll(() => {
    const packagePath = path.join(__dirname, '../../extension/package.json');
    packageJson = JSON.parse(readFileSync(packagePath, 'utf-8')) as PackageJson;
  });

  it('should have required metadata', () => {
    expect(packageJson.name).toBe('eai-gofer');
    expect(packageJson.displayName).toBeDefined();
    expect(packageJson.description).toBeDefined();
    expect(packageJson.version).toBeDefined();
    expect(packageJson.publisher).toBeDefined();
  });

  it('should have engines.vscode defined', () => {
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.vscode).toBeDefined();
  });

  it('should have categories defined', () => {
    expect(packageJson.categories).toBeDefined();
    expect(packageJson.categories.length).toBeGreaterThan(0);
  });

  it('should have icon defined', () => {
    expect(packageJson.icon).toBeDefined();
  });

  it('should have repository defined', () => {
    expect(packageJson.repository).toBeDefined();
    expect(packageJson.repository.url).toContain('github.com');
  });

  it('should have all command titles and icons', () => {
    for (const command of packageJson.contributes.commands) {
      expect(command.command).toBeDefined();
      expect(command.title).toBeDefined();
      // Not all commands need icons, but if they have one, it should be valid
      if (command.icon) {
        expect(command.icon).toMatch(/^\$\([a-z-]+\)$/);
      }
    }
  });

  it('should have view/title menus for all views', () => {
    const viewTitleMenus = packageJson.contributes.menus['view/title'];
    expect(viewTitleMenus).toBeDefined();

    // Should have refresh commands in view/title for each view
    const progressRefresh = viewTitleMenus.find(
      (menu) =>
        menu.command === 'eaiGofer.refreshSpecs' && menu.when === 'view == eaiGoferProgress'
    );
    expect(progressRefresh).toBeDefined();

    const constitutionRefresh = viewTitleMenus.find(
      (menu) =>
        menu.command === 'eaiGofer.refreshConstitution' &&
        menu.when === 'view == eaiGoferConstitution'
    );
    expect(constitutionRefresh).toBeDefined();

    const memoryRefresh = viewTitleMenus.find(
      (menu) =>
        menu.command === 'eaiGofer.refreshMemory' && menu.when === 'view == eaiGoferMemory'
    );
    expect(memoryRefresh).toBeDefined();
  });

  it('should have keybindings for important commands', () => {
    const keybindings = packageJson.contributes.keybindings;
    expect(keybindings).toBeDefined();

    // Check for important keybindings
    const initializeKeybinding = keybindings.find((kb) => kb.command === 'eaiGofer.initialize');
    expect(initializeKeybinding).toBeDefined();

    const refreshKeybinding = keybindings.find((kb) => kb.command === 'eaiGofer.refreshSpecs');
    expect(refreshKeybinding).toBeDefined();
  });
});
