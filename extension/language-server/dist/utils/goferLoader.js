"use strict";
/**
 * GoferLoader - Loads specifications from .specify/specs/ directory
 *
 * This is a simplified version of the extension's GoferParser
 * for use in the Language Server
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
exports.GoferLoader = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const specCache_js_1 = require("./specCache.js");
class GoferLoader {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        const specsDir = path.join(workspacePath, '.specify', 'specs');
        this.cache = new specCache_js_1.SpecCache(specsDir, 100, 5 * 60 * 1000); // 100 specs, 5 min TTL
        void this.cache.initialize();
    }
    async loadAllSpecs() {
        const specsDir = path.join(this.workspacePath, '.specify', 'specs');
        try {
            const entries = await fs.readdir(specsDir, { withFileTypes: true });
            const specDirs = entries.filter((e) => e.isDirectory());
            const specs = await Promise.all(specDirs.map(async (dir) => {
                try {
                    return await this.loadSpec(dir.name);
                }
                catch (_error) {
                    // Silently skip specs that fail to load
                    return null;
                }
            }));
            return specs.filter((s) => s !== null);
        }
        catch (_error) {
            // Return empty array if directory doesn't exist
            return [];
        }
    }
    async loadSpec(specId) {
        // Check cache first
        const cached = this.cache.get(specId);
        if (cached) {
            return cached;
        }
        const specDir = path.join(this.workspacePath, '.specify', 'specs', specId);
        const specPath = path.join(specDir, 'spec.md');
        const tasksPath = path.join(specDir, 'tasks.md');
        // Parse spec.md
        const specContent = await fs.readFile(specPath, 'utf-8');
        const { frontmatter, content } = this.parseFrontmatter(specContent);
        // Parse tasks.md
        const tasksContent = await fs.readFile(tasksPath, 'utf-8');
        const tasks = this.parseTasks(tasksContent);
        const spec = {
            id: specId,
            title: typeof frontmatter.feature === 'string' ? frontmatter.feature : specId,
            description: content,
            status: this.parseSpecStatus(typeof frontmatter.status === 'string' ? frontmatter.status : 'draft'),
            created: new Date(typeof frontmatter.created === 'string' ? frontmatter.created : Date.now()),
            updated: new Date(typeof frontmatter.updated === 'string' ? frontmatter.updated : Date.now()),
            author: typeof frontmatter.author === 'string' ? frontmatter.author : undefined,
            tasks,
            dependencies: Array.isArray(frontmatter.dependencies) ? frontmatter.dependencies : [],
        };
        // Cache the parsed spec
        this.cache.set(specId, spec, specPath);
        return spec;
    }
    /**
     * Parse header metadata from official GitHub Gofer format
     */
    parseSpecHeader(content) {
        const lines = content.split('\n');
        const metadata = {};
        let contentStartIndex = 0;
        // Extract title from first line
        const titleMatch = lines[0]?.match(/^#\s*(?:Feature Specification:\s*)?(.+)$/);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
            contentStartIndex = 1;
        }
        // Parse metadata lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                contentStartIndex = i + 1;
                break;
            }
            // Parse metadata fields
            const featureBranchMatch = line.match(/^Feature Branch:\s*`?([^`]+)`?$/);
            if (featureBranchMatch) {
                metadata.branch = featureBranchMatch[1];
                continue;
            }
            const createdMatch = line.match(/^Created:\s*(.+)$/);
            if (createdMatch) {
                metadata.created = createdMatch[1];
                continue;
            }
            const statusMatch = line.match(/^Status:\s*(.+)$/);
            if (statusMatch) {
                metadata.status = statusMatch[1];
                continue;
            }
            const inputMatch = line.match(/^Input:\s*(.+)$/);
            if (inputMatch) {
                metadata.input = inputMatch[1];
                continue;
            }
            // If we hit a non-metadata line, start content from here
            contentStartIndex = i;
            break;
        }
        const bodyContent = lines.slice(contentStartIndex).join('\n').trim();
        return { metadata, content: bodyContent };
    }
    parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        if (!match) {
            // Try to parse as official GitHub Gofer format
            const { metadata, content: bodyContent } = this.parseSpecHeader(content);
            // Convert to legacy format for compatibility
            const frontmatter = {
                id: metadata.branch || 'unknown',
                title: metadata.title || 'Unknown Feature',
                status: metadata.status || 'draft',
                created: metadata.created || new Date().toISOString(),
                updated: metadata.created || new Date().toISOString(),
                author: undefined,
                dependencies: [],
            };
            return { frontmatter, content: bodyContent };
        }
        const frontmatter = yaml.parse(match[1]);
        const bodyContent = match[2].trim();
        return { frontmatter, content: bodyContent };
    }
    parseTasks(content) {
        const tasks = [];
        const lines = content.split('\n');
        let currentTask = null;
        let taskIndex = 0;
        for (const line of lines) {
            // Support both formats: "- [ ] **T001**: Description" and "- [ ] #1 Description"
            const taskMatchBold = line.match(/^-\s+\[([x ])\]\s+\*\*([A-Z]\d+)\*\*:\s+(.+)$/);
            const taskMatchHash = line.match(/^-\s+\[([x ])\]\s+#(\d+)\s+(.+)$/);
            const taskMatch = taskMatchBold || taskMatchHash;
            if (taskMatch) {
                if (currentTask && currentTask.id) {
                    tasks.push(this.completeTask(currentTask, taskIndex++));
                }
                const [, checkbox, id, description] = taskMatch;
                currentTask = {
                    id,
                    description: description.trim(),
                    status: (checkbox === 'x' ? 'completed' : 'pending'),
                    dependencies: [],
                    parallel: false,
                    attempts: 0,
                };
                continue;
            }
            if (currentTask && line.trim().startsWith('-')) {
                const depMatch = line.match(/Dependencies:\s*(.+)/i);
                if (depMatch) {
                    const deps = depMatch[1].trim();
                    if (deps !== 'None' && deps !== 'none') {
                        currentTask.dependencies = deps.split(',').map((d) => d.trim());
                    }
                    continue;
                }
                const estMatch = line.match(/Estimated:\s*(.+)/i);
                if (estMatch) {
                    currentTask.estimated = estMatch[1].trim();
                    continue;
                }
                if (line.includes('[P]')) {
                    currentTask.parallel = true;
                    continue;
                }
            }
        }
        if (currentTask && currentTask.id) {
            tasks.push(this.completeTask(currentTask, taskIndex));
        }
        return tasks;
    }
    completeTask(partial, index) {
        return {
            id: partial.id || `T${String(index + 1).padStart(3, '0')}`,
            description: partial.description || 'Untitled task',
            status: partial.status || 'pending',
            dependencies: partial.dependencies || [],
            parallel: partial.parallel || false,
            estimated: partial.estimated,
            attempts: partial.attempts || 0,
        };
    }
    parseSpecStatus(status) {
        const normalized = status.toLowerCase();
        switch (normalized) {
            case 'draft':
                return 'draft';
            case 'ready':
                return 'ready';
            case 'in_progress':
            case 'in progress':
                return 'in_progress';
            case 'completed':
                return 'completed';
            case 'blocked':
                return 'blocked';
            default:
                return 'draft';
        }
    }
    async updateTaskStatus(specId, taskId, status) {
        const tasksPath = path.join(this.workspacePath, '.specify', 'specs', specId, 'tasks.md');
        let content = await fs.readFile(tasksPath, 'utf-8');
        const taskRegex = new RegExp(`^(-\\s+\\[)[x ]\\](\\s+\\*\\*${taskId}\\*\\*:.+)$`, 'gm');
        const checkbox = status === 'completed' ? 'x' : ' ';
        content = content.replace(taskRegex, `$1${checkbox}$2`);
        await fs.writeFile(tasksPath, content, 'utf-8');
        // Invalidate cache for this spec
        this.cache.invalidate(specId);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Clear the spec cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Shutdown and cleanup resources
     */
    async shutdown() {
        await this.cache.shutdown();
    }
}
exports.GoferLoader = GoferLoader;
//# sourceMappingURL=goferLoader.js.map