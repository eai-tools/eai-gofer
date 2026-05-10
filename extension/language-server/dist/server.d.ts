/**
 * Gofer Language Server
 *
 * Provides both:
 * 1. Language Server Protocol (LSP) for extension communication
 * 2. Model Context Protocol (MCP) tools for Claude Code integration
 *
 * Architecture: Single server process that handles both protocols
 */
export declare class ServerError extends Error {
    code: string;
    statusCode?: number | undefined;
    constructor(message: string, code: string, statusCode?: number | undefined);
}
export declare class ValidationError extends ServerError {
    constructor(message: string);
}
export declare class NotFoundError extends ServerError {
    constructor(resource: string);
}
//# sourceMappingURL=server.d.ts.map