/**
 * Unit tests for Language Server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createConnection, 
  TextDocuments, 
  ProposedFeatures, 
  TextDocumentSyncKind
} from 'vscode-languageserver/node';

// Mock vscode-languageserver
vi.mock('vscode-languageserver/node', () => ({
  createConnection: vi.fn(),
  TextDocuments: vi.fn(),
  ProposedFeatures: { all: {} },
  TextDocumentSyncKind: {
    Incremental: 2
  }
}));

// Mock MCPToolHandler
vi.mock('../mcp/toolHandler', () => ({
  MCPToolHandler: vi.fn().mockImplementation(() => ({
    getSpecs: vi.fn(),
    getNextTask: vi.fn(),
    executeTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    validateCode: vi.fn(),
    runTests: vi.fn()
  }))
}));

// Mock GoferLoader
vi.mock('../utils/goferLoader', () => ({
  GoferLoader: vi.fn().mockImplementation(() => ({
    loadAllSpecs: vi.fn(),
    loadSpec: vi.fn(),
    updateTaskStatus: vi.fn()
  }))
}));

describe('Language Server', () => {
  let mockConnection: {
    onInitialize: ReturnType<typeof vi.fn>;
    onInitialized: ReturnType<typeof vi.fn>;
    onRequest: ReturnType<typeof vi.fn>;
    onDidChangeConfiguration: ReturnType<typeof vi.fn>;
    listen: ReturnType<typeof vi.fn>;
    sendNotification: ReturnType<typeof vi.fn>;
    console: {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };
  };

  let mockTextDocuments: {
    onDidChangeContent: ReturnType<typeof vi.fn>;
    listen: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock connection
    mockConnection = {
      onInitialize: vi.fn(),
      onInitialized: vi.fn(),
      onRequest: vi.fn(),
      onDidChangeConfiguration: vi.fn(),
      listen: vi.fn(),
      sendNotification: vi.fn(),
      console: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    };

    // Create mock text documents
    mockTextDocuments = {
      onDidChangeContent: vi.fn(),
      listen: vi.fn()
    };

    vi.mocked(createConnection).mockReturnValue(mockConnection as never);
    vi.mocked(TextDocuments).mockReturnValue(mockTextDocuments as never);
  });

  describe('Server Initialization', () => {
    it('should create connection and text documents', async () => {
      // Import server to trigger initialization
      await import('../server');

      expect(createConnection).toHaveBeenCalledWith(ProposedFeatures.all);
      expect(TextDocuments).toHaveBeenCalled();
    });

    it('should register event handlers', async () => {
      await import('../server');

      expect(mockConnection.onInitialize).toHaveBeenCalled();
      expect(mockConnection.onRequest).toHaveBeenCalled();
      expect(mockTextDocuments.listen).toHaveBeenCalledWith(mockConnection);
    });

    it('should initialize with MCP capabilities', async () => {
      await import('../server');

      expect(mockConnection.onInitialize).toHaveBeenCalled();
      
      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      
      const result = await initializeHandler({
        processId: 12345,
        rootUri: 'file:///test/workspace',
        capabilities: {}
      });

      expect(result).toHaveProperty('capabilities');
      expect(result.capabilities).toHaveProperty('textDocumentSync', TextDocumentSyncKind.Incremental);
      expect(result.capabilities).toHaveProperty('experimental');
      expect(result.capabilities.experimental).toHaveProperty('mcp');
    });
  });

  describe('LSP Custom Methods', () => {
    beforeEach(async () => {
      await import('../server');
    });

    it('should register gofer/getSpecs method', () => {
      const requestCalls = mockConnection.onRequest.mock.calls;
      const hasGetSpecs = requestCalls.some(call => call[0] === 'eaiGofer/getSpecs');
      expect(hasGetSpecs).toBe(true);
    });

    it('should register gofer/executeTask method', () => {
      const requestCalls = mockConnection.onRequest.mock.calls;
      const hasExecuteTask = requestCalls.some(call => call[0] === 'eaiGofer/executeTask');
      expect(hasExecuteTask).toBe(true);
    });

    it('should register gofer/updateTaskStatus method', () => {
      const requestCalls = mockConnection.onRequest.mock.calls;
      const hasUpdateTaskStatus = requestCalls.some(call => call[0] === 'eaiGofer/updateTaskStatus');
      expect(hasUpdateTaskStatus).toBe(true);
    });
  });

  describe('MCP Tools Integration', () => {
    beforeEach(async () => {
      await import('../server');
    });

    it('should register MCP tools handler', () => {
      const requestCalls = mockConnection.onRequest.mock.calls;
      const hasToolsCall = requestCalls.some(call => call[0] === 'tools/call');
      expect(hasToolsCall).toBe(true);
    });

    it('should handle MCP tool calls', async () => {
      const requestCalls = mockConnection.onRequest.mock.calls;
      const toolsCallHandler = requestCalls.find(call => call[0] === 'tools/call')?.[1];

      expect(toolsCallHandler).toBeDefined();

      if (toolsCallHandler) {
        const params = {
          name: 'eaigofer_get_specs',
          arguments: {}
        };

        // Mock the MCPToolHandler response
        const { MCPToolHandler } = await import('../mcp/toolHandler');
        const mockHandler = new MCPToolHandler('/test', mockConnection as never);
        vi.mocked(mockHandler.getSpecs).mockResolvedValue({
          success: true,
          specs: []
        });

        const result = await toolsCallHandler(params);

        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError');
      }
    });

    it('should handle invalid MCP tool names', async () => {
      const requestCalls = mockConnection.onRequest.mock.calls;
      const toolsCallHandler = requestCalls.find(call => call[0] === 'tools/call')?.[1];

      if (toolsCallHandler) {
        const params = {
          name: 'invalid_tool_name',
          arguments: {}
        };

        const result = await toolsCallHandler(params);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Unknown tool');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization with invalid parameters', async () => {
      await import('../server');

      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      
      // Should not throw with minimal params
      const result = await initializeHandler({
        processId: null,
        rootUri: null,
        capabilities: {}
      });

      expect(result).toHaveProperty('capabilities');
    });

    it('should handle text document changes', async () => {
      await import('../server');

      expect(mockTextDocuments.onDidChangeContent).toHaveBeenCalled();
    });
  });

  describe('Server Lifecycle', () => {
    it('should listen for connections', async () => {
      await import('../server');

      expect(mockConnection.listen).toHaveBeenCalled();
    });

    it('should handle initialization notification', async () => {
      await import('../server');

      expect(mockConnection.onInitialized).toHaveBeenCalled();
    });
  });
});