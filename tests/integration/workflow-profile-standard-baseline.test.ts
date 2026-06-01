import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function readExtensionPackageJson(): Record<string, unknown> {
  const packagePath = path.join(process.cwd(), 'extension', 'package.json');
  const content = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(content) as Record<string, unknown>;
}

describe('Workflow profile defaults', () => {
  it('defines gofer.workflowProfile with standard default', () => {
    const extensionPackage = readExtensionPackageJson();
    const contributes = extensionPackage.contributes as Record<string, unknown>;
    const configuration = contributes.configuration as Record<string, unknown>;
    const properties = configuration.properties as Record<string, unknown>;
    const workflowProfile = properties['gofer.workflowProfile'] as Record<string, unknown>;

    expect(workflowProfile).toBeDefined();
    expect(workflowProfile.default).toBe('standard');
    expect(workflowProfile.enum).toEqual(['standard', 'enterpriseai']);
  });

  it('documents workflowProfile in public config docs and keeps extension docs focused on user setup', () => {
    const configDoc = fs.readFileSync(
      path.join(process.cwd(), '.tech-docs', 'configuration.md'),
      'utf8'
    );
    const extensionReadme = fs.readFileSync(
      path.join(process.cwd(), 'extension', 'README.md'),
      'utf8'
    );

    expect(configDoc).toContain('`gofer.workflowProfile`');
    expect(configDoc).toContain('"gofer.workflowProfile": "standard"');
    expect(extensionReadme).toContain('Gofer VS Code Extension');
    expect(extensionReadme).toContain('Gofer: Initialize Repository');
  });
});
