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
});