/**
 * Specification Cache
 * 
 * Provides in-memory caching for parsed specifications with file system watching
 * to automatically invalidate cache on file changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { watch, FSWatcher } from 'chokidar';

// Spec interface (compatible with SpecKitLoader)
interface Spec {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'ready' | 'in_progress' | 'completed' | 'blocked';
  created: Date;
  updated: Date;
  author?: string;
  tasks: Task[];
  dependencies: string[];
}

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed' | 'blocked';
  dependencies: string[];
  parallel: boolean;
  estimated?: string;
  attempts: number;
  error?: string;
  completedAt?: Date;
}

interface CacheEntry {
  spec: Spec;
  timestamp: number;
  filePath: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

export class SpecCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;
  private watcher: FSWatcher | null;
  private stats: CacheStats;
  private specsDirectory: string;

  constructor(specsDirectory: string, maxSize = 100, ttl = 300000) {
    this.specsDirectory = specsDirectory;
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl; // 5 minutes default
    this.watcher = null;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0
    };
  }

  /**
   * Initialize file system watcher
   */
  async initialize(): Promise<void> {
    if (this.watcher) {
      return;
    }

    // Watch for changes in specs directory
    this.watcher = watch(path.join(this.specsDirectory, '**/*.md'), {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher.on('change', (filePath: string) => {
      this.invalidateByPath(filePath);
    });

    this.watcher.on('unlink', (filePath: string) => {
      this.invalidateByPath(filePath);
    });
  }

  /**
   * Get spec from cache
   */
  get(specId: string): Spec | null {
    const entry = this.cache.get(specId);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(specId);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Check if file still exists and hasn't been modified
    try {
      const stats = fs.statSync(entry.filePath);
      const fileModified = stats.mtimeMs;
      
      if (fileModified > entry.timestamp) {
        // File was modified, invalidate cache
        this.cache.delete(specId);
        this.stats.misses++;
        this.stats.evictions++;
        return null;
      }
    } catch (error) {
      // File doesn't exist anymore
      this.cache.delete(specId);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    return entry.spec;
  }

  /**
   * Set spec in cache
   */
  set(specId: string, spec: Spec, filePath: string): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(specId, {
      spec,
      timestamp: Date.now(),
      filePath
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Invalidate specific spec
   */
  invalidate(specId: string): void {
    this.cache.delete(specId);
    this.stats.size = this.cache.size;
  }

  /**
   * Invalidate by file path
   */
  private invalidateByPath(filePath: string): void {
    const normalizedPath = path.normalize(filePath);
    
    // Find and invalidate all specs that use this file
    for (const [specId, entry] of this.cache.entries()) {
      if (path.normalize(entry.filePath) === normalizedPath) {
        this.cache.delete(specId);
        this.stats.evictions++;
      }
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * Cleanup and stop watching
   */
  async dispose(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.clear();
  }

  /**
   * Prune expired entries
   */
  prune(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.stats.evictions++;
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Get all cached spec IDs
   */
  getCachedSpecIds(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if spec is cached
   */
  has(specId: string): boolean {
    return this.cache.has(specId);
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Shutdown and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.cache.clear();
  }
}
