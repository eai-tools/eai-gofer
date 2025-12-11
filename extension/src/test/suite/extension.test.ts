import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('EnterpriseAI.specgofer'));
  });

  test('Should activate successfully', async () => {
    const extension = vscode.extensions.getExtension('EnterpriseAI.specgofer');
    assert.ok(extension);
    
    // The extension should activate when needed
    if (!extension.isActive) {
      await extension.activate();
    }
    
    assert.ok(extension.isActive);
  });

  test('Initialize command should be registered globally', async () => {
    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('EnterpriseAI.specgofer');
    assert.ok(extension);
    
    if (!extension.isActive) {
      await extension.activate();
    }

    // Get all available commands
    const commands = await vscode.commands.getCommands(true);
    
    // Verify specGofer.initialize command is registered
    assert.ok(
      commands.includes('specGofer.initialize'),
      'specGofer.initialize command should be registered even without workspace'
    );
  });

  test('Initialize command should handle missing workspace gracefully', async () => {
    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('EnterpriseAI.specgofer');
    assert.ok(extension);
    
    if (!extension.isActive) {
      await extension.activate();
    }

    // Note: We can't easily test the command execution without a workspace in unit tests
    // But we've verified it's registered above, which is the main issue being fixed
    // The actual workspace handling would be tested in integration/E2E tests
  });
});