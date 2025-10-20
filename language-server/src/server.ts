/**
 * SpecGofer Language Server
 *
 * Provides both:
 * 1. Language Server Protocol (LSP) for extension communication
 * 2. Model Context Protocol (MCP) tools for Claude Code integration
 *
 * Architecture: Single server process that handles both protocols
 */

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'path';
import { SpecKitLoader } from './utils/specKitLoader';
import { MCPToolHandler } from './mcp/toolHandler';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Global state
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
let workspacePath: string | undefined;

// Initialize SpecKit loader and MCP tool handler
let specKitLoader: SpecKitLoader | undefined;
let mcpToolHandler: MCPToolHandler | undefined;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Check client capabilities
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  // Get workspace path
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    workspacePath = params.workspaceFolders[0].uri.replace('file://', '');
    connection.console.log(`Workspace path: ${workspacePath}`);

    // Initialize SpecKit loader
    specKitLoader = new SpecKitLoader(workspacePath);
    mcpToolHandler = new MCPToolHandler(workspacePath, connection);
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // LSP capabilities
      completionProvider: {
        resolveProvider: true,
      },
      // MCP capabilities (experimental)
      experimental: {
        mcp: {
          // MCP tools exposed to Claude Code / GitHub Copilot
          tools: [
            {
              name: 'specgofer_get_specs',
              description: 'Get all specifications from the .specify folder',
              parameters: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
            {
              name: 'specgofer_get_next_task',
              description: 'Get the next available task to work on',
              parameters: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
            {
              name: 'specgofer_execute_task',
              description: 'Execute a specific task from a specification',
              parameters: {
                type: 'object',
                properties: {
                  specId: {
                    type: 'string',
                    description: 'The specification ID (e.g., "001-login-feature")',
                  },
                  taskId: {
                    type: 'string',
                    description: 'The task ID (e.g., "T001")',
                  },
                },
                required: ['specId', 'taskId'],
              },
            },
            {
              name: 'specgofer_update_task_status',
              description: 'Update the status of a task',
              parameters: {
                type: 'object',
                properties: {
                  specId: {
                    type: 'string',
                    description: 'The specification ID',
                  },
                  taskId: {
                    type: 'string',
                    description: 'The task ID',
                  },
                  status: {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'testing', 'completed', 'failed', 'blocked'],
                    description: 'The new status',
                  },
                },
                required: ['specId', 'taskId', 'status'],
              },
            },
            {
              name: 'specgofer_validate_code',
              description: 'Validate code against constitutional requirements',
              parameters: {
                type: 'object',
                properties: {
                  files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of file paths to validate',
                  },
                },
                required: ['files'],
              },
            },
            {
              name: 'specgofer_run_tests',
              description: 'Run tests for a specification',
              parameters: {
                type: 'object',
                properties: {
                  specId: {
                    type: 'string',
                    description: 'The specification ID',
                  },
                },
                required: ['specId'],
              },
            },
          ],
        },
      },
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for configuration changes
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }

  connection.console.log('SpecGofer Language Server initialized successfully');
});

// ============================================================================
// LSP CUSTOM METHODS
// ============================================================================

/**
 * LSP Custom Method: specKit/getSpecs
 * Returns all specifications from .specify/specs/
 */
connection.onRequest('specKit/getSpecs', async (params: { workspaceRoot?: string }) => {
  try {
    if (!specKitLoader) {
      throw new Error('SpecKit loader not initialized');
    }

    const specs = await specKitLoader.loadAllSpecs();

    connection.console.log(`Loaded ${specs.length} specifications`);

    return {
      success: true,
      specs,
    };
  } catch (error) {
    connection.console.error(`Error loading specs: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      specs: [],
    };
  }
});

/**
 * LSP Custom Method: specKit/executeTask
 * Execute a task (called by extension, not MCP)
 */
connection.onRequest(
  'specKit/executeTask',
  async (params: { specId: string; taskId: string; context?: any }) => {
    try {
      if (!mcpToolHandler) {
        throw new Error('MCP tool handler not initialized');
      }

      // For now, just return task info
      // Full implementation will call Claude API
      const result = await mcpToolHandler.executeTask(params.specId, params.taskId);

      return {
        success: true,
        result,
      };
    } catch (error) {
      connection.console.error(`Error executing task: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

/**
 * LSP Custom Method: specKit/updateTaskStatus
 * Update task status in tasks.md
 */
connection.onRequest(
  'specKit/updateTaskStatus',
  async (params: { specId: string; taskId: string; status: string }) => {
    try {
      if (!specKitLoader) {
        throw new Error('SpecKit loader not initialized');
      }

      await specKitLoader.updateTaskStatus(params.specId, params.taskId, params.status);

      // Notify extension of progress
      connection.sendNotification('specKit/taskProgress', {
        specId: params.specId,
        taskId: params.taskId,
        status: params.status,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
      };
    } catch (error) {
      connection.console.error(`Error updating task status: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

// ============================================================================
// MCP TOOL HANDLERS
// ============================================================================

/**
 * MCP Tool Invocation Handler
 * Called by Claude Code or GitHub Copilot via VSCode's native MCP support
 */
connection.onRequest('mcp/tools/execute', async (params: { name: string; arguments: any }) => {
  try {
    if (!mcpToolHandler) {
      throw new Error('MCP tool handler not initialized');
    }

    const { name, arguments: args } = params;

    connection.console.log(`MCP tool called: ${name} with args: ${JSON.stringify(args)}`);

    // Route to appropriate handler
    switch (name) {
      case 'specgofer_get_specs':
        return await mcpToolHandler.getSpecs();

      case 'specgofer_get_next_task':
        return await mcpToolHandler.getNextTask();

      case 'specgofer_execute_task':
        return await mcpToolHandler.executeTask(args.specId, args.taskId);

      case 'specgofer_update_task_status':
        return await mcpToolHandler.updateTaskStatus(args.specId, args.taskId, args.status);

      case 'specgofer_validate_code':
        return await mcpToolHandler.validateCode(args.files);

      case 'specgofer_run_tests':
        return await mcpToolHandler.runTests(args.specId);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    connection.console.error(`MCP tool execution error: ${error}`);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// ============================================================================
// STANDARD LSP HANDLERS
// ============================================================================

connection.onDidChangeConfiguration((change) => {
  // Handle configuration changes
  connection.console.log('Configuration changed');
});

// Text document changes
documents.onDidChangeContent((change) => {
  // Handle document changes
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

connection.console.log('SpecGofer Language Server started');
