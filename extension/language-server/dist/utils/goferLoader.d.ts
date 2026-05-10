/**
 * GoferLoader - Loads specifications from .specify/specs/ directory
 *
 * This is a simplified version of the extension's GoferParser
 * for use in the Language Server
 */
export interface Spec {
    id: string;
    title: string;
    description: string;
    status: SpecStatus;
    created: Date;
    updated: Date;
    author?: string;
    tasks: Task[];
    plan?: TechnicalPlan;
    dependencies: string[];
}
export type SpecStatus = 'draft' | 'ready' | 'in_progress' | 'completed' | 'blocked';
export interface Task {
    id: string;
    description: string;
    status: TaskStatus;
    dependencies: string[];
    parallel: boolean;
    estimated?: string;
    attempts: number;
    error?: string;
    completedAt?: Date;
}
export type TaskStatus = 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed' | 'blocked';
export interface TechnicalPlan {
    techStack: string[];
    architecture: string;
    testingApproach: string;
    dependencies: string[];
    risks: string[];
}
export declare class GoferLoader {
    private workspacePath;
    private cache;
    constructor(workspacePath: string);
    loadAllSpecs(): Promise<Spec[]>;
    loadSpec(specId: string): Promise<Spec>;
    /**
     * Parse header metadata from official GitHub Gofer format
     */
    private parseSpecHeader;
    private parseFrontmatter;
    private parseTasks;
    private completeTask;
    private parseSpecStatus;
    updateTaskStatus(specId: string, taskId: string, status: string): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        hits: number;
        misses: number;
        size: number;
        evictions: number;
    };
    /**
     * Clear the spec cache
     */
    clearCache(): void;
    /**
     * Shutdown and cleanup resources
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=goferLoader.d.ts.map