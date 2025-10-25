import * as vscode from 'vscode';
import { Logger } from './logger';
import { ConfigManager } from '../config';

/**
 * Performance optimization utilities for large repositories
 * Provides debouncing, caching, lazy loading, and other optimizations
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export interface PerformanceMetrics {
  operationCounts: Record<string, number>;
  operationTimes: Record<string, number[]>;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
  gcCount: number;
}

/**
 * Debounced function executor
 */
export class Debouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private logger = Logger.for('Debouncer');

  /**
   * Debounce a function call
   */
  public debounce<T extends any[]>(
    key: string,
    fn: (...args: T) => void | Promise<void>,
    delayMs: number
  ): (...args: T) => void {
    return (...args: T) => {
      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        this.timers.delete(key);
        try {
          await fn(...args);
        } catch (error) {
          this.logger.error(`Debounced function failed: ${key}`, error as Error);
        }
      }, delayMs);

      this.timers.set(key, timer);
    };
  }

  /**
   * Cancel a debounced function
   */
  public cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Cancel all debounced functions
   */
  public cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Check if a function is pending
   */
  public isPending(key: string): boolean {
    return this.timers.has(key);
  }

  /**
   * Get count of pending functions
   */
  public getPendingCount(): number {
    return this.timers.size;
  }

  /**
   * Dispose debouncer
   */
  public dispose(): void {
    this.cancelAll();
  }
}

/**
 * Smart cache with LRU eviction and size limits
 */
export class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxMemoryMb: number;
  private defaultTtlMs: number;
  private logger = Logger.for('SmartCache');
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    maxSize: number = 1000,
    maxMemoryMb: number = 100,
    defaultTtlMs: number = 30 * 60 * 1000 // 30 minutes
  ) {
    this.maxSize = maxSize;
    this.maxMemoryMb = maxMemoryMb;
    this.defaultTtlMs = defaultTtlMs;
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Get value from cache
   */
  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.defaultTtlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  public set(key: string, value: T, customTtlMs?: number): void {
    const now = Date.now();
    const size = this.estimateSize(value);

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      size,
      accessCount: 1,
      lastAccessed: now,
    };

    this.cache.set(key, entry);

    // Trigger cleanup if needed
    this.cleanupIfNeeded();
  }

  /**
   * Check if key exists and is not expired
   */
  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete entry from cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    memoryUsageMb: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalSize = 0;
    let totalHits = 0;
    let oldestTime = Date.now();
    let newestTime = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      totalHits += entry.accessCount;
      oldestTime = Math.min(oldestTime, entry.timestamp);
      newestTime = Math.max(newestTime, entry.timestamp);
    }

    return {
      size: this.cache.size,
      memoryUsageMb: totalSize / (1024 * 1024),
      hitRate: totalHits / Math.max(this.cache.size, 1),
      oldestEntry: oldestTime,
      newestEntry: newestTime,
    };
  }

  /**
   * Cleanup expired and excess entries
   */
  private cleanupIfNeeded(): void {
    const now = Date.now();
    const stats = this.getStats();

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTtlMs) {
        this.cache.delete(key);
      }
    }

    // Remove excess entries by size
    if (this.cache.size > this.maxSize) {
      this.evictLeastRecentlyUsed(this.cache.size - this.maxSize);
    }

    // Remove excess entries by memory
    if (stats.memoryUsageMb > this.maxMemoryMb) {
      this.evictByMemoryPressure();
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.logger.debug(`Evicted ${count} LRU entries`);
  }

  /**
   * Evict entries to reduce memory usage
   */
  private evictByMemoryPressure(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => (a.size / Math.max(a.accessCount, 1)) - (b.size / Math.max(b.accessCount, 1)));

    let removedCount = 0;
    const targetMemory = this.maxMemoryMb * 0.8; // Target 80% of max

    while (this.getStats().memoryUsageMb > targetMemory && removedCount < entries.length) {
      this.cache.delete(entries[removedCount][0]);
      removedCount++;
    }

    this.logger.debug(`Evicted ${removedCount} entries due to memory pressure`);
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
      return 1024; // Default estimate
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIfNeeded();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Dispose cache
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Lazy loader for expensive operations
 */
export class LazyLoader<T> {
  private cache = new Map<string, Promise<T>>();
  private logger = Logger.for('LazyLoader');

  /**
   * Load value lazily with caching
   */
  public async load(key: string, factory: () => Promise<T>): Promise<T> {
    // Return cached promise if exists
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Create new promise and cache it
    const promise = factory().catch(error => {
      // Remove failed promise from cache
      this.cache.delete(key);
      this.logger.error(`Lazy load failed for key: ${key}`, error);
      throw error;
    });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * Check if value is loaded or loading
   */
  public isLoaded(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear cached value
   */
  public clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  public clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  public getSize(): number {
    return this.cache.size;
  }
}

/**
 * Performance monitor for tracking operation metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private logger = Logger.for('PerformanceMonitor');
  private config = ConfigManager.getInstance();

  private constructor() {
    this.metrics = {
      operationCounts: {},
      operationTimes: {},
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      gcCount: 0,
    };

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Time an operation
   */
  public async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordOperation(operationName, duration);
      
      if (duration > 1000) { // Log slow operations
        this.logger.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordOperation(`${operationName}_failed`, duration);
      throw error;
    } finally {
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = endMemory - startMemory;
      
      if (memoryDelta > 10 * 1024 * 1024) { // Log high memory operations (10MB+)
        this.logger.warn(`High memory operation: ${operationName} used ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }

  /**
   * Record cache hit
   */
  public recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  /**
   * Record cache miss
   */
  public recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  /**
   * Get performance statistics
   */
  public getStats(): PerformanceMetrics & {
    averageOperationTime: Record<string, number>;
    slowestOperations: Array<{ name: string; averageTime: number }>;
    cacheHitRate: number;
  } {
    const averageOperationTime: Record<string, number> = {};
    const slowestOperations: Array<{ name: string; averageTime: number }> = [];

    for (const [name, times] of Object.entries(this.metrics.operationTimes)) {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      averageOperationTime[name] = average;
      slowestOperations.push({ name, averageTime: average });
    }

    slowestOperations.sort((a, b) => b.averageTime - a.averageTime);

    const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheAccess > 0 ? this.metrics.cacheHits / totalCacheAccess : 0;

    return {
      ...this.metrics,
      averageOperationTime,
      slowestOperations: slowestOperations.slice(0, 10),
      cacheHitRate,
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metrics = {
      operationCounts: {},
      operationTimes: {},
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      gcCount: 0,
    };
  }

  /**
   * Record operation timing
   */
  private recordOperation(name: string, duration: number): void {
    this.metrics.operationCounts[name] = (this.metrics.operationCounts[name] || 0) + 1;
    
    if (!this.metrics.operationTimes[name]) {
      this.metrics.operationTimes[name] = [];
    }
    
    this.metrics.operationTimes[name].push(duration);
    
    // Keep only last 100 measurements per operation
    if (this.metrics.operationTimes[name].length > 100) {
      this.metrics.operationTimes[name] = this.metrics.operationTimes[name].slice(-100);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsage = memoryUsage.heapUsed;
      
      // Check for memory pressure
      const memoryMb = memoryUsage.heapUsed / 1024 / 1024;
      if (memoryMb > 500) { // Warn if using more than 500MB
        this.logger.warn(`High memory usage detected: ${memoryMb.toFixed(2)}MB`);
      }
    }, 30000); // Every 30 seconds
  }
}

/**
 * Throttled file watcher for efficient file system monitoring
 */
export class ThrottledFileWatcher {
  private watcher?: vscode.FileSystemWatcher;
  private debouncer = new Debouncer();
  private logger = Logger.for('FileWatcher');
  private callbacks = new Map<string, (uri: vscode.Uri) => void>();

  /**
   * Watch files with throttling
   */
  public watch(
    pattern: string,
    onChange: (uri: vscode.Uri) => void,
    throttleMs: number = 1000
  ): vscode.Disposable {
    if (this.watcher) {
      this.watcher.dispose();
    }

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    const throttledCallback = this.debouncer.debounce(
      `file-change-${pattern}`,
      onChange,
      throttleMs
    );

    this.callbacks.set(pattern, throttledCallback);

    const disposables = [
      this.watcher.onDidChange(throttledCallback),
      this.watcher.onDidCreate(throttledCallback),
      this.watcher.onDidDelete(throttledCallback),
    ];

    return {
      dispose: () => {
        disposables.forEach(d => d.dispose());
        this.watcher?.dispose();
        this.debouncer.cancel(`file-change-${pattern}`);
        this.callbacks.delete(pattern);
      },
    };
  }

  /**
   * Dispose all watchers
   */
  public dispose(): void {
    this.watcher?.dispose();
    this.debouncer.dispose();
    this.callbacks.clear();
  }
}

/**
 * Global performance optimization manager
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private debouncer = new Debouncer();
  private cache = new SmartCache<any>();
  private lazyLoader = new LazyLoader<any>();
  private monitor = PerformanceMonitor.getInstance();
  private fileWatcher = new ThrottledFileWatcher();
  private logger = Logger.for('PerformanceOptimizer');

  private constructor() {}

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Get the debouncer
   */
  public getDebouncer(): Debouncer {
    return this.debouncer;
  }

  /**
   * Get the cache
   */
  public getCache(): SmartCache<any> {
    return this.cache;
  }

  /**
   * Get the lazy loader
   */
  public getLazyLoader(): LazyLoader<any> {
    return this.lazyLoader;
  }

  /**
   * Get the performance monitor
   */
  public getMonitor(): PerformanceMonitor {
    return this.monitor;
  }

  /**
   * Get the file watcher
   */
  public getFileWatcher(): ThrottledFileWatcher {
    return this.fileWatcher;
  }

  /**
   * Optimize configuration based on performance mode
   */
  public applyPerformanceMode(mode: 'fast' | 'balanced' | 'thorough'): void {
    switch (mode) {
      case 'fast':
        // Aggressive caching, longer debounce times
        this.cache = new SmartCache(2000, 200, 60 * 60 * 1000); // 1 hour TTL
        break;
        
      case 'balanced':
        // Default settings
        this.cache = new SmartCache(1000, 100, 30 * 60 * 1000); // 30 min TTL
        break;
        
      case 'thorough':
        // Less caching, shorter debounce times
        this.cache = new SmartCache(500, 50, 15 * 60 * 1000); // 15 min TTL
        break;
    }
    
    this.logger.info(`Applied performance mode: ${mode}`);
  }

  /**
   * Get comprehensive performance report
   */
  public getPerformanceReport(): {
    monitor: ReturnType<PerformanceMonitor['getStats']>;
    cache: ReturnType<SmartCache<any>['getStats']>;
    debouncer: { pendingCount: number };
    memory: NodeJS.MemoryUsage;
  } {
    return {
      monitor: this.monitor.getStats(),
      cache: this.cache.getStats(),
      debouncer: { pendingCount: this.debouncer.getPendingCount() },
      memory: process.memoryUsage(),
    };
  }

  /**
   * Dispose all performance optimizations
   */
  public dispose(): void {
    this.debouncer.dispose();
    this.cache.dispose();
    this.lazyLoader.clearAll();
    this.fileWatcher.dispose();
    this.logger.info('Performance optimizer disposed');
  }
}

/**
 * Decorator for automatic performance monitoring
 */
export function withPerformanceMonitoring(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance();
      return monitor.timeOperation(name, () => method.apply(this, args));
    };
    
    return descriptor;
  };
}

/**
 * Initialize performance optimizations
 */
export function initializePerformanceOptimizations(context: vscode.ExtensionContext): void {
  const optimizer = PerformanceOptimizer.getInstance();
  const config = ConfigManager.getInstance();
  
  // Apply performance mode from config
  const mode = config.getPerformanceMode();
  optimizer.applyPerformanceMode(mode);
  
  // Set up disposal
  context.subscriptions.push({
    dispose: () => optimizer.dispose(),
  });
  
  Logger.for('Performance').info('Performance optimizations initialized', { mode });
}