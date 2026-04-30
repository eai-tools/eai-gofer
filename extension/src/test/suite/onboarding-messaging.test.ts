import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

interface ViewsWelcomeEntry {
  view: string;
  contents: string;
}

interface ExtensionPackageContributes {
  viewsWelcome?: readonly ViewsWelcomeEntry[];
}

interface ExtensionPackageShape {
  displayName?: string;
  description?: string;
  contributes?: ExtensionPackageContributes;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readExtensionPackage(): ExtensionPackageShape {
  const raw = readFile(path.join(process.cwd(), 'package.json'));
  return JSON.parse(raw) as ExtensionPackageShape;
}

suite('onboarding messaging', () => {
  test('leads welcome messaging with EnterpriseAI-first positioning while preserving additive compatibility', () => {
    const packageJson = readExtensionPackage();
    const displayName = packageJson.displayName ?? '';
    const description = packageJson.description ?? '';
    const welcomeContents =
      packageJson.contributes?.viewsWelcome?.find(
        (entry: ViewsWelcomeEntry) => entry.view === 'goferProgress'
      )?.contents ?? '';

    assert.ok(displayName.includes('EnterpriseAI Vertical App Delivery'));
    assert.ok(description.includes('EnterpriseAI-first'));
    assert.ok(welcomeContents.includes('EnterpriseAI vertical app delivery'));
    assert.ok(welcomeContents.includes('EnterpriseAI-first guidance is the default'));
    assert.ok(welcomeContents.includes('gofer.workflowProfile=standard'));
  });

  test('keeps EnterpriseAI-first additive messaging aligned across docs and extension initialization surface', () => {
    const extensionReadme = readFile(path.join(process.cwd(), 'README.md'));
    const rootReadme = readFile(path.join(process.cwd(), '..', 'README.md'));
    const extensionSource = readFile(path.join(process.cwd(), 'src', 'extension.ts'));

    assert.ok(extensionReadme.includes('EnterpriseAI-first vertical app delivery workflow'));
    assert.ok(
      extensionReadme.includes('guidance is the default') ||
        extensionReadme.includes('additive to standard Gofer')
    );

    assert.ok(rootReadme.includes('defaults to an EnterpriseAI-first workflow profile'));
    assert.ok(rootReadme.includes('standard workflow as an explicit'));

    assert.ok(extensionSource.includes('EnterpriseAI-first guidance by default'));
    assert.ok(extensionSource.includes('multi-platform workflows remain supported'));
  });
});
