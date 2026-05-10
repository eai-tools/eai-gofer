/**
 * Specification Cache
 *
 * Provides in-memory caching for parsed specifications with file system watching
 * to automatically invalidate cache on file changes.
 */
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
interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    evictions: number;
}
export declare class SpecCache {
    private cache;
    private maxSize;
    private ttl;
    private watcher;
    private stats;
    private specsDirectory;
    constructor(specsDirectory: string, maxSize?: number, ttl?: number);
    /**
     * Initialize file system watcher
     */
    initialize(): Promise<void>;
    /**
     * Get spec from cache
     */
    get(specId: string): Spec | null;
    /**
     * Set spec in cache
     */
    set(specId: string, spec: Spec, filePath: string): void;
    /**
     * Invalidate specific spec
     */
    invalidate(specId: string): void;
    /**
     * Invalidate by file path
     */
    private invalidateByPath;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Evict oldest entry
     */
    private evictOldest;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get cache hit rate
     */
    getHitRate(): number;
    /**
     * Cleanup and stop watching
     */
    dispose(): Promise<void>;
    /**
     * Prune expired entries
     */
    prune(): void;
    /**
     * Get all cached spec IDs
     */
    getCachedSpecIds(): string[];
    /**
     * Check if spec is cached
     */
    has(specId: string): boolean;
    /**
     * Get cache size
     */
    size(): number;
    /**
     * Shutdown and cleanup resources
     */
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=specCache.d.ts.map