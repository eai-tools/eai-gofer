import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Auto-updater for extensions distributed via GitHub Releases
 */
export class AutoUpdater {
  private githubRepo: string;
  private currentVersion: string;
  private checkInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(githubRepo: string, currentVersion: string) {
    this.githubRepo = githubRepo; // e.g., "yourusername/spec-kit-orchestrator"
    this.currentVersion = currentVersion;
  }

  /**
   * Start periodic update checks
   */
  startPeriodicChecks(context: vscode.ExtensionContext): void {
    // Check on startup
    this.checkForUpdates(context);

    // Check every 24 hours
    setInterval(() => {
      this.checkForUpdates(context);
    }, this.checkInterval);
  }

  /**
   * Check for updates from GitHub Releases
   */
  async checkForUpdates(context: vscode.ExtensionContext): Promise<void> {
    try {
      const latestVersion = await this.getLatestVersion();

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        await this.promptUpdate(latestVersion);
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  /**
   * Get latest version from GitHub Releases API
   */
  private async getLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.githubRepo}/releases/latest`,
        headers: {
          'User-Agent': 'VSCode-Extension-Updater'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            const version = release.tag_name.replace('v', ''); // "v1.0.0" -> "1.0.0"
            resolve(version);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Compare version strings
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }

    return false;
  }

  /**
   * Prompt user to update
   */
  private async promptUpdate(newVersion: string): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      `🎉 Spec Kit Orchestrator v${newVersion} is available! (Current: v${this.currentVersion})`,
      'View Release Notes',
      'Download Update',
      'Later'
    );

    if (choice === 'View Release Notes') {
      const url = `https://github.com/${this.githubRepo}/releases/latest`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    } else if (choice === 'Download Update') {
      const url = `https://github.com/${this.githubRepo}/releases/latest`;
      vscode.env.openExternal(vscode.Uri.parse(url));

      vscode.window.showInformationMessage(
        'Download the .vsix file and run: code --install-extension spec-kit-orchestrator-' + newVersion + '.vsix',
        'Copy Command'
      ).then(choice => {
        if (choice === 'Copy Command') {
          vscode.env.clipboard.writeText(
            `code --install-extension spec-kit-orchestrator-${newVersion}.vsix`
          );
        }
      });
    }
  }

  /**
   * Manual update check command
   */
  async manualCheck(): Promise<void> {
    const statusBarItem = vscode.window.setStatusBarMessage('$(sync~spin) Checking for updates...');

    try {
      const latestVersion = await this.getLatestVersion();

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        await this.promptUpdate(latestVersion);
      } else {
        vscode.window.showInformationMessage(
          `✅ You're on the latest version (v${this.currentVersion})`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      statusBarItem.dispose();
    }
  }
}
