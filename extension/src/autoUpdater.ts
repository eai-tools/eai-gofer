import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Auto-updater for extensions distributed via GitHub Releases
 */
export class AutoUpdater {
  private githubRepo: string;
  private currentVersion: string;
  private checkInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private extensionName: string;

  constructor(githubRepo: string, currentVersion: string, extensionName: string = 'specgofer') {
    this.githubRepo = githubRepo; // e.g., "eai-tools/specgofer"
    this.currentVersion = currentVersion;
    this.extensionName = extensionName;
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
      // Don't show error popups for automatic checks to avoid spamming users
      // Only show errors for manual checks
    }
  }

  /**
   * Get latest version from GitHub Pages JSON API
   * This works even for private repositories since GitHub Pages can be public
   */
  private async getLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'eai-tools.github.io',
        path: '/specgofer/releases.json',
        headers: {
          'user-agent': 'VSCode-Extension-Updater',
          'accept': 'application/json'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Log the response for debugging
            console.log(`GitHub Pages API Response Status: ${res.statusCode}`);
            console.log(`GitHub Pages API Response Data: ${data.substring(0, 500)}...`);

            if (res.statusCode === 404) {
              reject(new Error(`Release page not found. GitHub Pages may not be set up yet for ${this.githubRepo}.`));
              return;
            } else if (res.statusCode !== 200) {
              reject(new Error(`GitHub Pages returned status ${res.statusCode}: ${data}`));
              return;
            }

            const releaseData = JSON.parse(data);
            if (!releaseData || !releaseData.latest_version) {
              reject(new Error(`Invalid release data received from GitHub Pages. Received: ${JSON.stringify(releaseData).substring(0, 200)}`));
              return;
            }
            
            resolve(releaseData.latest_version);
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
   * Download file from URL
   */
  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(destPath);

      https.get(url, { headers: { 'User-Agent': 'VSCode-Extension-Updater' } }, (response) => {
        // Follow redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        require('fs').unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Get download URL for VSIX file from GitHub Pages release data
   */
  private async getDownloadUrl(version: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'eai-tools.github.io',
        path: '/specgofer/releases.json',
        headers: {
          'user-agent': 'VSCode-Extension-Updater',
          'accept': 'application/json'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const releaseData = JSON.parse(data);

            // Find the specific version in releases array
            const release = releaseData.releases?.find((r: any) => r.version === version);

            if (release && release.download_url) {
              resolve(release.download_url);
            } else {
              reject(new Error(`No download URL found for version ${version}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Install VSIX file using VSCode CLI
   */
  private async installVsix(vsixPath: string): Promise<void> {
    try {
      // Get the code command path
      const codeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';

      // Install the extension
      const { stdout, stderr } = await execAsync(`${codeCommand} --install-extension "${vsixPath}" --force`);

      if (stderr && !stderr.includes('successfully installed')) {
        throw new Error(stderr);
      }

      console.log('Extension installed:', stdout);
    } catch (error) {
      throw new Error(`Failed to install extension: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prompt user to update with automatic installation
   */
  private async promptUpdate(newVersion: string): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      `🎉 SpecGofer v${newVersion} is available! (Current: v${this.currentVersion})`,
      'Install Update',
      'View Release Notes',
      'Later'
    );

    if (choice === 'Install Update') {
      await this.downloadAndInstall(newVersion);
    } else if (choice === 'View Release Notes') {
      const url = `https://github.com/${this.githubRepo}/releases/latest`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }

  /**
   * Download and install the update
   */
  private async downloadAndInstall(version: string): Promise<void> {
    const statusBarItem = vscode.window.setStatusBarMessage('$(sync~spin) Downloading update...');

    try {
      // Get download URL
      const downloadUrl = await this.getDownloadUrl(version);

      // Create temp directory
      const tempDir = os.tmpdir();
      const vsixFileName = `${this.extensionName}-${version}.vsix`;
      const vsixPath = path.join(tempDir, vsixFileName);

      // Download VSIX
      vscode.window.setStatusBarMessage('$(sync~spin) Downloading update...');
      await this.downloadFile(downloadUrl, vsixPath);

      // Install VSIX
      vscode.window.setStatusBarMessage('$(sync~spin) Installing update...');
      await this.installVsix(vsixPath);

      // Clean up
      await fs.unlink(vsixPath).catch(() => {});

      statusBarItem.dispose();

      // Prompt to reload
      const reloadChoice = await vscode.window.showInformationMessage(
        `✅ SpecGofer v${version} has been installed! Reload VSCode to activate the update.`,
        'Reload Now',
        'Later'
      );

      if (reloadChoice === 'Reload Now') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }

    } catch (error) {
      statusBarItem.dispose();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const fallbackChoice = await vscode.window.showErrorMessage(
        `Failed to auto-update: ${errorMessage}`,
        'Download Manually',
        'Dismiss'
      );

      if (fallbackChoice === 'Download Manually') {
        const url = `https://github.com/${this.githubRepo}/releases/latest`;
        vscode.env.openExternal(vscode.Uri.parse(url));
      }
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        vscode.window.showInformationMessage(
          `� GitHub Pages release site not found.\n\nCurrent version: v${this.currentVersion}\n\nPlease check that GitHub Pages is enabled for the repository.\n\nSite URL: https://eai-tools.github.io/specgofer`,
          'Open Release Site', 'OK'
        ).then(choice => {
          if (choice === 'Open Release Site') {
            vscode.env.openExternal(vscode.Uri.parse('https://eai-tools.github.io/specgofer'));
          }
        });
      } else if (errorMessage.includes('rate limit')) {
        vscode.window.showWarningMessage(
          `⏳ Too many requests.\n\nCurrent version: v${this.currentVersion}\n\nPlease try again later.`,
          'OK'
        );
      } else {
        vscode.window.showErrorMessage(`Failed to check for updates: ${errorMessage}`);
      }
    } finally {
      statusBarItem.dispose();
    }
  }
}
