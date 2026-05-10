/**
 * MCP Tool Handler
 *
 * Handles MCP tool invocations from Claude Code or GitHub Copilot
 * via VSCode's native MCP support (1.102+)
 */
import { Connection } from 'vscode-languageserver';
import { Spec, Task } from '../utils/goferLoader';
interface SpecSummary {
    id: string;
    title: string;
    status: string;
    taskCount: number;
    completedTasks: number;
    tasks: Array<{
        id: string;
        description: string;
        status: string;
        dependencies: string[];
    }>;
}
interface GetSpecsResponse {
    success: boolean;
    count?: number;
    specs?: SpecSummary[];
    error?: string;
}
interface GetNextTaskResponse {
    success?: boolean;
    spec?: Partial<Spec> | null;
    task?: Partial<Task> | null;
    message?: string;
    error?: string;
}
interface ExecuteTaskResponse {
    success?: boolean;
    spec?: Spec;
    task?: Task;
    constitution?: string;
    testHarnessPath?: string;
    error?: string;
    errorCode?: string;
    memories?: string;
    hints?: string;
    researchChunks?: string;
    memoryCoverage?: {
        coveragePercent: number;
        memoriesLoaded: number;
        researchLoadedForGaps: boolean;
    };
}
interface UpdateTaskStatusResponse {
    success: boolean;
    spec?: Spec;
    task?: Task;
    message?: string;
    error?: string;
    errorCode?: string;
}
interface ValidationIssue {
    file: string;
    line?: number;
    severity: 'error' | 'warning';
    message: string;
}
interface ValidateCodeResponse {
    success?: boolean;
    isValid?: boolean;
    files?: string[];
    issues?: ValidationIssue[];
    summary?: string;
    message?: string;
    error?: string;
}
interface TestResult {
    success?: boolean;
    passed?: boolean;
    total?: number;
    passed_count?: number;
    failed_count?: number;
    failed_tests?: string[];
    output?: string;
    message?: string;
    note?: string;
    specId?: string;
    error?: string;
}
interface ObservationData {
    id: string;
    type: 'file_read' | 'command_output' | 'api_response' | 'search_result' | 'test_output';
    timestamp: number;
    turnNumber: number;
    tokenEstimate: number;
    content: string;
    metadata?: Record<string, unknown>;
}
interface ExpandObservationResponse {
    success: boolean;
    observation?: ObservationData;
    error?: string;
    errorCode?: string;
}
interface ContextHealthResponse {
    success: boolean;
    health?: {
        status: 'healthy' | 'warning' | 'critical';
        utilizationPercent: number;
        tokensUsed: number;
        tokensLimit: number;
        breakdown?: {
            specArtifacts: number;
            memories: number;
            hints: number;
            observations: number;
            systemFiles: number;
            conversation: number;
        };
        recommendations: string[];
        timestamp: number;
        dataSource?: 'real' | 'estimated' | 'none';
        model?: string;
        sessionId?: string;
    };
    error?: string;
}
interface ResearchChunkData {
    id: string;
    sectionTitle: string;
    content: string;
    tokenEstimate: number;
    relevanceKeywords: string[];
    order: number;
}
interface ResearchIndexResponse {
    success: boolean;
    index?: {
        sourceFile: string;
        totalTokens: number;
        chunkCount: number;
        created: number;
        chunks: Array<{
            id: string;
            title: string;
            tokens: number;
            keywords: string[];
        }>;
    };
    error?: string;
    errorCode?: string;
}
interface LoadResearchChunkResponse {
    success: boolean;
    chunk?: ResearchChunkData;
    error?: string;
    errorCode?: string;
}
interface PeekObservationResponse {
    success: boolean;
    peek?: {
        id: string;
        type: string;
        decayTier: string;
        foldLevel?: string;
        tokenEstimate: number;
        peekContent: string;
        metadata?: Record<string, unknown>;
    };
    error?: string;
    errorCode?: string;
}
interface FoldObservationResponse {
    success: boolean;
    result?: {
        id: string;
        previousLevel: string;
        newLevel: string;
    };
    error?: string;
    errorCode?: string;
}
interface GrepObservationsResponse {
    success: boolean;
    results?: {
        pattern: string;
        totalMatches: number;
        observationsMatched: number;
        matches: Array<{
            id: string;
            type: string;
            matchCount: number;
            excerpts: string[];
            metadata?: Record<string, unknown>;
        }>;
    };
    error?: string;
    errorCode?: string;
}
interface ContextReplResponse {
    success: boolean;
    content?: string;
    section?: string;
    error?: string;
    errorCode?: string;
}
interface ContextGrepResponse {
    success: boolean;
    results?: {
        pattern: string;
        totalMatches: number;
        sectionMatches: Array<{
            section: string;
            matchCount: number;
            excerpts: string[];
        }>;
    };
    error?: string;
    errorCode?: string;
}
interface ContextHistoryResponse {
    success: boolean;
    operations?: Array<{
        type: string;
        target: string;
        detail: string;
        timestamp: number;
    }>;
    error?: string;
}
interface TriggerHandoffResponse {
    success: boolean;
    handoff?: {
        file: string;
        created: number;
        contextSnapshot: {
            tokensUsed: number;
            utilizationPercent: number;
            completedTasks: string[];
            currentTask?: string;
            stage: string;
        };
        resumeCommand: string;
    };
    error?: string;
    errorCode?: string;
}
export declare class MCPToolHandler {
    private workspacePath;
    private connection;
    private goferLoader;
    private anthropic;
    private validationService;
    private testHarnessGenerator;
    private researchChunker;
    constructor(workspacePath: string, connection: Connection);
    /**
     * Log security violations for monitoring
     */
    private logSecurityViolation;
    /**
     * Validate and sanitize spec ID to prevent path traversal attacks
     */
    private validateSpecId;
    /**
     * Validate task ID
     */
    private validateTaskId;
    /**
     * MCP Tool: gofer_get_specs
     * Returns all specifications
     */
    getSpecs(): Promise<GetSpecsResponse>;
    /**
     * MCP Tool: gofer_get_next_task
     * Returns the next available task to work on
     */
    getNextTask(): Promise<GetNextTaskResponse>;
    /**
     * Read enriched context from bridge file with 60-second freshness check.
     * Returns null if file doesn't exist, is stale, or can't be read.
     */
    private readEnrichedContext;
    private areDependenciesMet;
    /**
     * MCP Tool: gofer_execute_task
     * Execute a specific task (returns task context for Claude to implement)
     */
    executeTask(specId: string, taskId: string): Promise<ExecuteTaskResponse>;
    /**
     * MCP Tool: gofer_update_task_status
     * Update the status of a task
     */
    updateTaskStatus(specId: string, taskId: string, status: string): Promise<UpdateTaskStatusResponse>;
    /**
     * MCP Tool: gofer_validate_code
     * Validate code against constitutional requirements
     */
    validateCode(files: string[]): Promise<ValidateCodeResponse>;
    /**
     * MCP Tool: gofer_run_tests
     * Run tests for a specification
     */
    runTests(specId: string): Promise<TestResult>;
    /**
     * Validate observation ID format (UUID v4)
     */
    private validateObservationId;
    /**
     * MCP Tool: gofer_expand_observation
     * Retrieves the full content of a masked observation
     */
    expandObservation(observationId: string): Promise<ExpandObservationResponse>;
    /**
     * MCP Tool: gofer_get_context_health
     * Returns the current context health status with breakdown
     *
     * Reads from extension-written state file first (Spec 012),
     * falls back to file-based calculation if state is stale or missing.
     */
    getContextHealth(includeBreakdown?: boolean): Promise<ContextHealthResponse>;
    /**
     * Calculate context health from file sizes.
     * Fallback when extension state is not available.
     */
    private calculateContextHealthFromFiles;
    /**
     * Estimate tokens from a single file.
     * Uses 4 chars = 1 token approximation.
     */
    private estimateTokensFromFile;
    /**
     * Estimate tokens from files matching a glob pattern.
     * Uses 4 chars = 1 token approximation.
     */
    private estimateTokensFromGlob;
    /**
     * MCP Tool: gofer_get_research_index
     * Returns the index of available research chunks for a spec
     */
    getResearchIndex(specId: string): Promise<ResearchIndexResponse>;
    /**
     * MCP Tool: gofer_load_research_chunk
     * Loads a specific chunk of a research document by ID
     */
    loadResearchChunk(specId: string, chunkId: string): Promise<LoadResearchChunkResponse>;
    /**
     * MCP Tool: gofer_trigger_handoff
     * Manually triggers a session handoff with context preservation
     */
    triggerHandoff(reason: 'context_critical' | 'manual_request' | 'stage_complete' | 'error_recovery', currentTask?: string, notes?: string): Promise<TriggerHandoffResponse>;
    /**
     * MCP Tool: gofer_peek_observation
     * Returns key-points or summary of an observation without full expansion.
     */
    peekObservation(observationId: string): Promise<PeekObservationResponse>;
    /**
     * MCP Tool: gofer_fold_observation
     * Sets the fold level for an observation in the cache.
     */
    foldObservation(observationId: string, foldLevel: 'collapsed' | 'summary' | 'expanded'): Promise<FoldObservationResponse>;
    /**
     * MCP Tool: gofer_grep_observations
     * Searches across all observation content for a pattern.
     */
    grepObservations(pattern: string, maxResults?: number): Promise<GrepObservationsResponse>;
    /**
     * MCP Tool: gofer_context_peek
     * Peeks at a specific section of the current context.
     */
    contextPeek(section: string): Promise<ContextReplResponse>;
    /**
     * MCP Tool: gofer_context_grep
     * Searches across all context sections for a pattern.
     */
    contextGrep(pattern: string): Promise<ContextGrepResponse>;
    /**
     * MCP Tool: gofer_context_fold
     * Folds (collapses) a context section.
     */
    contextFold(section: string): Promise<ContextReplResponse>;
    /**
     * MCP Tool: gofer_context_expand
     * Expands a collapsed context section.
     */
    contextExpand(section: string): Promise<ContextReplResponse>;
    /**
     * MCP Tool: gofer_context_undo
     * Reverts last fold/expand operation.
     */
    contextUndo(): Promise<ContextReplResponse>;
    /**
     * MCP Tool: gofer_context_history
     * Shows last 10 context operations with timestamps.
     */
    contextHistory(): Promise<ContextHistoryResponse>;
    checkSlop(scanPath?: string): Promise<{
        success: boolean;
        report?: {
            totalIssues: number;
            filesScanned: number;
            matches: Array<{
                file: string;
                line: number;
                pattern: string;
                severity: string;
                message: string;
            }>;
        };
        error?: string;
    }>;
    contextRepl(operations: Array<Record<string, unknown>>): Promise<{
        success: boolean;
        results: Array<{
            op: string;
            target: string;
            success: boolean;
            message: string;
        }>;
        error?: string;
    }>;
    runTestsDetect(testPath?: string, filter?: string): Promise<{
        success: boolean;
        framework?: string;
        command?: string;
        passed?: number;
        failed?: number;
        total?: number;
        output?: string;
        error?: string;
    }>;
    private parseTestOutput;
    private updateContextFoldState;
    private generateQuickPeek;
    private contextOperationHistory;
    private recordContextOperation;
    private loadOperationHistory;
    private saveOperationHistory;
}
export {};
//# sourceMappingURL=toolHandler.d.ts.map