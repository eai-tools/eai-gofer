import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './utils/logger';
import { FileUtils } from './utils/fileUtils';
import { GitHubApiClient, downloadLatestTemplates, getLatestTemplateRelease } from './utils/githubApi';
import { getWorkspacePaths } from './config';

/**
 * Template downloader with ZIP extraction and GitHub integration
 * Handles downloading, caching, and installing templates from GitHub releases
 */

export interface TemplateDownloadProgress {
  stage: 'downloading' | 'extracting' | 'installing' | 'complete' | 'error';
  message: string;
  progress?: number; // 0-100
  error?: Error;
}

export interface TemplateManifest {
  name: string;
  version: string;
  description: string;
  templates: TemplateInfo[];
  updated: string;
}

export interface TemplateInfo {
  name: string;
  description: string;
  path: string;
  type: 'spec' | 'memory' | 'config';
  tags: string[];
}

export interface DownloadOptions {
  force?: boolean; // Force download even if cached version exists
  useCache?: boolean; // Use cached version if available
  progress?: (update: TemplateDownloadProgress) => void;
}

/**
 * ZIP file extraction utilities using JSZip
 */
class ZipExtractor {
  private static logger = Logger.for('ZipExtractor');

  /**
   * Extract ZIP archive to directory
   */
  public static async extractZip(
    zipBuffer: ArrayBuffer, 
    targetDir: string,
    options: { 
      progress?: (update: { file: string; progress: number }) => void;
      filter?: (fileName: string) => boolean;
    } = {}
  ): Promise<string[]> {
    try {
      // Dynamically import JSZip to avoid bundling issues
      const jsZip = require('jszip');
      const zip = new jsZip();
      
      this.logger.debug(`Extracting ZIP archive (${zipBuffer.byteLength} bytes) to ${targetDir}`);
      
      // Load the ZIP file
      const zipData = await zip.loadAsync(zipBuffer);
      const files = Object.keys(zipData.files);
      const extractedFiles: string[] = [];
      
      // Ensure target directory exists
      await FileUtils.ensureDirectory(targetDir);
      
      let processed = 0;
      const total = files.length;
      
      // Extract each file
      for (const fileName of files) {
        const file = zipData.files[fileName];
        
        // Skip directories and apply filter
        if (file.dir || (options.filter && !options.filter(fileName))) {
          processed++;
          continue;
        }
        
        // Get file content
        const content = await file.async('arraybuffer');
        const filePath = path.join(targetDir, fileName);
        
        // Ensure directory exists for nested files
        await FileUtils.ensureDirectory(path.dirname(filePath));
        
        // Write file
        const buffer = Buffer.from(content);
        await require('fs/promises').writeFile(filePath, buffer);
        
        extractedFiles.push(filePath);
        processed++;
        
        // Report progress
        if (options.progress) {
          options.progress({
            file: fileName,
            progress: Math.round((processed / total) * 100),
          });
        }
      }
      
      this.logger.info(`Extracted ${extractedFiles.length} files from ZIP archive`);
      return extractedFiles;
    } catch (error) {
      this.logger.error('Failed to extract ZIP archive', error as Error);
      throw error;
    }
  }

  /**
   * List contents of ZIP archive without extracting
   */
  public static async listZipContents(zipBuffer: ArrayBuffer): Promise<string[]> {
    try {
      const jsZip = require('jszip');
      const zip = new jsZip();
      
      const zipData = await zip.loadAsync(zipBuffer);
      const files = Object.keys(zipData.files).filter(name => !zipData.files[name].dir);
      
      this.logger.debug(`ZIP archive contains ${files.length} files`);
      return files;
    } catch (error) {
      this.logger.error('Failed to list ZIP contents', error as Error);
      throw error;
    }
  }
}

/**
 * Template downloader and manager
 */
export class TemplateDownloader {
  private static instance: TemplateDownloader;
  private logger = Logger.for('TemplateDownloader');
  private githubClient: GitHubApiClient;
  private cacheDir: string;

  private constructor(cacheDir: string) {
    this.githubClient = GitHubApiClient.getInstance();
    this.cacheDir = cacheDir;
  }

  public static getInstance(cacheDir: string): TemplateDownloader {
    if (!TemplateDownloader.instance) {
      TemplateDownloader.instance = new TemplateDownloader(cacheDir);
    }
    return TemplateDownloader.instance;
  }

  /**
   * Download and install latest templates
   */
  public async downloadLatestTemplates(
    workspacePath: string, 
    options: DownloadOptions = {}
  ): Promise<TemplateManifest> {
    const { progress } = options;

    try {
      progress?.({ stage: 'downloading', message: 'Fetching latest release info...' });
      
      // Get latest release info
      const releaseInfo = await getLatestTemplateRelease();
      this.logger.info(`Latest template version: ${releaseInfo.version}`);
      
      // Check cache
      const cacheKey = `templates-${releaseInfo.version}`;
      const cachedPath = path.join(this.cacheDir, cacheKey);
      
      if (options.useCache && await FileUtils.exists(cachedPath) && !options.force) {
        this.logger.info(`Using cached templates: ${releaseInfo.version}`);
        progress?.({ stage: 'installing', message: 'Installing cached templates...' });
        return await this.installFromCache(cachedPath, workspacePath, progress);
      }
      
      // Download templates
      progress?.({ stage: 'downloading', message: 'Downloading template archive...', progress: 0 });
      
      const zipBuffer = await downloadLatestTemplates();
      
      progress?.({ stage: 'extracting', message: 'Extracting templates...', progress: 50 });
      
      // Extract to cache
      await FileUtils.ensureDirectory(cachedPath);
      const extractedFiles = await ZipExtractor.extractZip(zipBuffer, cachedPath, {
        progress: (update) => {
          progress?.({
            stage: 'extracting',
            message: `Extracting: ${path.basename(update.file)}`,
            progress: 50 + (update.progress * 0.3), // 50-80%
          });
        },
        filter: (fileName) => {
          // Only extract template-related files
          return fileName.includes('templates/') || fileName.includes('spec-kit/') || fileName === 'manifest.json';
        },
      });
      
      progress?.({ stage: 'installing', message: 'Installing templates...', progress: 80 });
      
      // Install templates
      const manifest = await this.installFromCache(cachedPath, workspacePath, progress);
      
      progress?.({ stage: 'complete', message: 'Templates installed successfully!', progress: 100 });
      
      return manifest;
    } catch (error) {
      this.logger.error('Failed to download templates', error as Error);
      progress?.({ stage: 'error', message: 'Failed to download templates', error: error as Error });
      throw error;
    }
  }

  /**
   * Install templates from cached directory
   */
  private async installFromCache(
    cachePath: string, 
    workspacePath: string,
    progress?: (update: TemplateDownloadProgress) => void
  ): Promise<TemplateManifest> {
    const paths = getWorkspacePaths(workspacePath);
    
    try {
      // Look for manifest
      const manifestPath = await this.findManifest(cachePath);
      let manifest: TemplateManifest;
      
      if (manifestPath) {
        const manifestContent = await FileUtils.readTextFile(manifestPath);
        manifest = JSON.parse(manifestContent);
      } else {
        // Create a basic manifest if none found
        manifest = {
          name: 'GitHub Spec Kit Templates',
          version: 'unknown',
          description: 'Templates downloaded from GitHub',
          templates: [],
          updated: new Date().toISOString(),
        };
      }
      
      // Find template directories
      const templateDirs = await this.findTemplateDirs(cachePath);
      
      // Install each template
      for (let i = 0; i < templateDirs.length; i++) {
        const templateDir = templateDirs[i];
        const templateName = path.basename(templateDir);
        
        progress?.({
          stage: 'installing',
          message: `Installing template: ${templateName}`,
          progress: 80 + ((i / templateDirs.length) * 20),
        });
        
        await this.installTemplate(templateDir, paths.templates, templateName);
        
        // Add to manifest if not already present
        if (!manifest.templates.find(t => t.name === templateName)) {
          manifest.templates.push({
            name: templateName,
            description: `Template: ${templateName}`,
            path: templateName,
            type: 'spec',
            tags: ['github', 'spec-kit'],
          });
        }
      }
      
      // Save updated manifest
      const manifestOutputPath = path.join(paths.templates, 'manifest.json');
      await FileUtils.writeTextFile(manifestOutputPath, JSON.stringify(manifest, null, 2));
      
      this.logger.info(`Installed ${templateDirs.length} templates`);
      return manifest;
    } catch (error) {
      this.logger.error('Failed to install templates from cache', error as Error);
      throw error;
    }
  }

  /**
   * Find manifest file in extracted directory
   */
  private async findManifest(rootDir: string): Promise<string | null> {
    const manifestFiles = await FileUtils.findFiles(rootDir, /manifest\.json$/);
    return manifestFiles.length > 0 ? manifestFiles[0] : null;
  }

  /**
   * Find template directories
   */
  private async findTemplateDirs(rootDir: string): Promise<string[]> {
    const structure = await FileUtils.getDirectoryStructure(rootDir, 5);
    const templateDirs: string[] = [];
    
    function findTemplates(dir: any): void {
      if (dir.name === 'templates' && dir.type === 'directory' && dir.children) {
        for (const child of dir.children) {
          if (child.type === 'directory') {
            templateDirs.push(child.path);
          }
        }
      } else if (dir.children) {
        for (const child of dir.children) {
          findTemplates(child);
        }
      }
    }
    
    findTemplates(structure);
    return templateDirs;
  }

  /**
   * Install a single template
   */
  private async installTemplate(sourcePath: string, targetPath: string, templateName: string): Promise<void> {
    const targetDir = path.join(targetPath, templateName);
    
    try {
      // Ensure target directory exists
      await FileUtils.ensureDirectory(targetDir);
      
      // Copy all files from source to target
      const structure = await FileUtils.getDirectoryStructure(sourcePath, 3);
      await this.copyStructure(structure, targetDir);
      
      this.logger.debug(`Installed template: ${templateName}`);
    } catch (error) {
      this.logger.error(`Failed to install template: ${templateName}`, error as Error);
      throw error;
    }
  }

  /**
   * Recursively copy directory structure
   */
  private async copyStructure(source: any, targetBase: string): Promise<void> {
    if (source.type === 'file') {
      const targetPath = path.join(targetBase, path.basename(source.path));
      await FileUtils.copyFile(source.path, targetPath);
    } else if (source.type === 'directory' && source.children) {
      const targetDir = path.join(targetBase, path.basename(source.path));
      await FileUtils.ensureDirectory(targetDir);
      
      for (const child of source.children) {
        await this.copyStructure(child, targetDir);
      }
    }
  }

  /**
   * Get list of installed templates
   */
  public async getInstalledTemplates(workspacePath: string): Promise<TemplateInfo[]> {
    const paths = getWorkspacePaths(workspacePath);
    const manifestPath = path.join(paths.templates, 'manifest.json');
    
    try {
      if (await FileUtils.exists(manifestPath)) {
        const manifestContent = await FileUtils.readTextFile(manifestPath);
        const manifest: TemplateManifest = JSON.parse(manifestContent);
        return manifest.templates;
      }
      
      // If no manifest, scan directory
      if (await FileUtils.exists(paths.templates)) {
        const entries = await FileUtils.listDirectory(paths.templates);
        const templates: TemplateInfo[] = [];
        
        for (const entry of entries) {
          const entryPath = path.join(paths.templates, entry);
          const info = await FileUtils.getFileInfo(entryPath);
          
          if (info.isDirectory) {
            templates.push({
              name: entry,
              description: `Template: ${entry}`,
              path: entry,
              type: 'spec',
              tags: [],
            });
          }
        }
        
        return templates;
      }
      
      return [];
    } catch (error) {
      this.logger.error('Failed to get installed templates', error as Error);
      return [];
    }
  }

  /**
   * Check if templates need updating
   */
  public async checkForUpdates(workspacePath: string): Promise<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }> {
    try {
      // Get installed version
      const paths = getWorkspacePaths(workspacePath);
      const manifestPath = path.join(paths.templates, 'manifest.json');
      let currentVersion = 'unknown';
      
      if (await FileUtils.exists(manifestPath)) {
        const manifestContent = await FileUtils.readTextFile(manifestPath);
        const manifest: TemplateManifest = JSON.parse(manifestContent);
        currentVersion = manifest.version;
      }
      
      // Get latest version
      const releaseInfo = await getLatestTemplateRelease();
      const hasUpdate = currentVersion !== releaseInfo.version;
      
      return {
        hasUpdate,
        currentVersion,
        latestVersion: releaseInfo.version,
      };
    } catch (error) {
      this.logger.error('Failed to check for template updates', error as Error);
      return { hasUpdate: false };
    }
  }

  /**
   * Clean up old cached versions
   */
  public async cleanupCache(keepCount: number = 3): Promise<void> {
    try {
      if (!await FileUtils.exists(this.cacheDir)) {
        return;
      }
      
      const entries = await FileUtils.listDirectory(this.cacheDir);
      const templateCaches = entries
        .filter(name => name.startsWith('templates-'))
        .map(name => ({
          name,
          path: path.join(this.cacheDir, name),
        }));
      
      // Sort by name (which includes version) and keep only recent ones
      templateCaches.sort((a, b) => b.name.localeCompare(a.name));
      
      const toDelete = templateCaches.slice(keepCount);
      
      for (const cache of toDelete) {
        await FileUtils.deleteDirectory(cache.path);
        this.logger.debug(`Cleaned up old template cache: ${cache.name}`);
      }
      
      if (toDelete.length > 0) {
        this.logger.info(`Cleaned up ${toDelete.length} old template caches`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup template cache', error as Error);
    }
  }
}

/**
 * Convenience functions for template management
 */

/**
 * Download and install templates with progress UI
 */
export async function downloadTemplatesWithProgress(
  workspacePath: string,
  cacheDir: string,
  options: DownloadOptions = {}
): Promise<TemplateManifest> {
  const downloader = TemplateDownloader.getInstance(cacheDir);
  
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Downloading Templates',
      cancellable: false,
    },
    async (progress) => {
      return new Promise((resolve, reject) => {
        downloader.downloadLatestTemplates(workspacePath, {
          ...options,
          progress: (update) => {
            progress.report({
              message: update.message,
              increment: update.progress ? update.progress - (progress as any).value : undefined,
            });
            
            if (update.stage === 'complete') {
              resolve(update as any);
            } else if (update.stage === 'error') {
              reject(update.error);
            }
            
            // Call user's progress callback
            options.progress?.(update);
          },
        }).then(resolve).catch(reject);
      });
    }
  );
}

/**
 * Check for template updates and show notification
 */
export async function checkTemplateUpdatesWithNotification(workspacePath: string, cacheDir: string): Promise<void> {
  try {
    const downloader = TemplateDownloader.getInstance(cacheDir);
    const updateInfo = await downloader.checkForUpdates(workspacePath);
    
    if (updateInfo.hasUpdate) {
      const action = await vscode.window.showInformationMessage(
        `Template updates available: ${updateInfo.currentVersion} → ${updateInfo.latestVersion}`,
        'Update Now',
        'Later'
      );
      
      if (action === 'Update Now') {
        await downloadTemplatesWithProgress(workspacePath, cacheDir, { force: true });
        vscode.window.showInformationMessage('Templates updated successfully!');
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to check for template updates: ${(error as Error).message}`);
  }
}