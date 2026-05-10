"use strict";
/**
 * Specification Cache
 *
 * Provides in-memory caching for parsed specifications with file system watching
 * to automatically invalidate cache on file changes.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chokidar_1 = require("chokidar");
class SpecCache {
    constructor(specsDirectory, maxSize = 100, ttl = 300000) {
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
    async initialize() {
        if (this.watcher) {
            return;
        }
        // Watch for changes in specs directory
        this.watcher = (0, chokidar_1.watch)(path.join(this.specsDirectory, '**/*.md'), {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });
        this.watcher.on('change', (filePath) => {
            this.invalidateByPath(filePath);
        });
        this.watcher.on('unlink', (filePath) => {
            this.invalidateByPath(filePath);
        });
    }
    /**
     * Get spec from cache
     */
    get(specId) {
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
        }
        catch (error) {
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
    set(specId, spec, filePath) {
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
    invalidate(specId) {
        this.cache.delete(specId);
        this.stats.size = this.cache.size;
    }
    /**
     * Invalidate by file path
     */
    invalidateByPath(filePath) {
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
    clear() {
        this.cache.clear();
        this.stats.size = 0;
    }
    /**
     * Evict oldest entry
     */
    evictOldest() {
        let oldestKey = null;
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
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get cache hit rate
     */
    getHitRate() {
        const total = this.stats.hits + this.stats.misses;
        return total === 0 ? 0 : this.stats.hits / total;
    }
    /**
     * Cleanup and stop watching
     */
    async dispose() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        this.clear();
    }
    /**
     * Prune expired entries
     */
    prune() {
        const now = Date.now();
        const expiredKeys = [];
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
    getCachedSpecIds() {
        return Array.from(this.cache.keys());
    }
    /**
     * Check if spec is cached
     */
    has(specId) {
        return this.cache.has(specId);
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    /**
     * Shutdown and cleanup resources
     */
    async shutdown() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        this.cache.clear();
    }
}
exports.SpecCache = SpecCache;
//# sourceMappingURL=specCache.js.map