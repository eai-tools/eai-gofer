# Latest VSCode Integration Research (October 2025)

**Research Date:** October 20, 2025
**Sources:** Web search results for Claude Code, Copilot Chat, LSP, and MCP integration

---

## 🔥 CRITICAL UPDATES FOR 2025

### 1. Model Context Protocol (MCP) - PRODUCTION READY

**Status:** Generally Available in VSCode 1.102+ (July 2025)

**Major Discovery:** MCP is now officially supported in VSCode with GitHub Copilot!

#### What This Means for SpecGofer:
✅ **We can use official MCP instead of custom implementation**
✅ **Built-in VSCode support** - no need for separate MCP server process
✅ **Production-ready** - officially supported by Microsoft + Anthropic

#### MCP Configuration in VSCode:
```json
// .vscode/mcp.json or user settings under "mcp" section
{
  "mcp": {
    "servers": {
      "specgofer": {
        "command": "node",
        "args": ["./mcp-server/dist/server.js"],
        "env": {
          "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}"
        }
      }
    }
  }
}
```

#### MCP Features Available:
- ✅ **Tools** - Function calling
- ✅ **Workspace Awareness** - Access to workspace files
- ✅ **Authorization** - OAuth and API key support
- ✅ **Prompts** - Reusable prompt templates
- ✅ **Resources** - External data sources
- ✅ **Sampling** - LLM sampling control

#### Input Variables:
- `${env:VAR_NAME}` - Environment variables
- `${input:VAR_NAME}` - Prompt user for input
- `${config:section.setting}` - VSCode settings

---

### 2. Claude Code VSCode Extension - NATIVE INTEGRATION

**Extension ID:** `anthropic.claude-code`
**Status:** Beta, available on VSCode Marketplace

#### Key Features (2025):
1. **Subagents** - Parallel task delegation
2. **Hooks** - Automatic actions at specific points (e.g., run tests after code changes)
3. **Background Tasks** - Long-running processes without blocking
4. **Real-time Diffs** - See Claude's changes in IDE
5. **Selection Context** - Current selection automatically shared
6. **File References** - `@File#L1-99` syntax
7. **Diagnostic Sharing** - Lint/syntax errors automatically sent

#### Commands:
- File reference shortcut: Cmd+Option+K (Mac) / Alt+Ctrl+K (Win/Linux)

#### Third-Party Provider Support:
- Amazon Bedrock
- Google Vertex AI
- Custom Anthropic API

#### Compatible IDEs:
- Visual Studio Code
- Cursor
- Windsurf
- VSCodium

---

### 3. GitHub Copilot Chat API - LIMITED PROGRAMMATIC ACCESS

**Extension ID:** `GitHub.copilot-chat`

#### What's Available:
✅ **Chat Participants** - Extensions can contribute chat participants
✅ **Command to Open Chat:** `workbench.action.chat.open` with prompt argument
✅ **VS Code Chat Extension API** - Official API for integration

#### What's NOT Available:
❌ **No direct programmatic message sending** to Copilot Chat
❌ **No response capturing** from Copilot
❌ **No task execution API**

#### Recommendation:
**For SpecGofer:** Don't rely on Copilot Chat integration - focus on Claude Code + MCP

**Reason:** Copilot Chat has no programmatic API for external extensions to send tasks and receive responses. We can only open the chat panel or contribute chat participants (which is for tools, not orchestration).

---

### 4. Language Server Protocol (LSP) - MATURE & STABLE

**Official Package:** `vscode-languageserver-node` (Microsoft)
**Latest Spec:** LSP 3.17

#### Key Features for SpecGofer:
- JSON-RPC over stdio/IPC for communication
- Custom methods supported (e.g., `specKit/getSpecs`)
- Bidirectional notifications
- Request/response pattern
- Works with any language/framework

#### Implementation Pattern:
```typescript
// Server
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';

const connection = createConnection(ProposedFeatures.all);

connection.onRequest('custom/method', async (params) => {
  // Handle request
  return { result: 'data' };
});

connection.listen();
```

```typescript
// Client (Extension)
import { LanguageClient } from 'vscode-languageclient/node';

const client = new LanguageClient('serverId', 'Server Name', serverOptions, clientOptions);
client.start();

const result = await client.sendRequest('custom/method', params);
```

---

## 🎯 UPDATED ARCHITECTURE RECOMMENDATION

Based on 2025 research, here's the optimal architecture:

### Option B+ (LSP + Native MCP Integration)

```
┌─────────────────────────────────────────┐
│      VSCode Extension (SpecGofer)       │
│      • UI (Tree Views)                  │
│      • LSP Client                       │
│      • MCP Configuration                │
└──────────────┬──────────────────────────┘
               │ JSON-RPC
┌──────────────▼──────────────────────────┐
│   SpecGofer Language Server             │
│   • Task Orchestrator                   │
│   • Constitutional Validator            │
│   • Test Runner                         │
│   • Retry Handler                       │
│   • Calls Claude API                    │
└──────────────┬──────────────────────────┘
               │ MCP Protocol
┌──────────────▼──────────────────────────┐
│   VSCode Native MCP Support (1.102+)    │
│   • Registered as MCP server            │
│   • Tools exposed to Copilot/Claude     │
│   • Authorization handled by VSCode     │
└─────────────────────────────────────────┘
```

### Why This is Better:

1. **No Custom MCP Server Process** - VSCode handles MCP natively
2. **Official Support** - Microsoft + Anthropic collaboration
3. **Production Ready** - GA since July 2025
4. **Simpler Architecture** - One less process to manage
5. **Better Integration** - Works with GitHub Copilot too

---

## 📋 UPDATED IMPLEMENTATION PLAN

### Phase 1 Changes:

#### Week 1: LSP Server (Unchanged)
- Create Language Server
- Implement `specKit/getSpecs`
- Test LSP communication

#### Week 2: MCP Integration (UPDATED)
**OLD:** Build custom MCP server
**NEW:** Register Language Server as MCP server in VSCode

**Configuration:**
```json
// .vscode/mcp.json
{
  "mcp": {
    "servers": {
      "specgofer": {
        "command": "node",
        "args": ["${workspaceFolder}/language-server/dist/server.js"],
        "env": {
          "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}"
        }
      }
    }
  }
}
```

**MCP Server Implementation:**
```typescript
// language-server/src/server.ts
import { createConnection } from 'vscode-languageserver/node';

const connection = createConnection();

// Standard LSP methods
connection.onInitialize(params => {
  return {
    capabilities: {
      textDocumentSync: 1,
      // Custom: MCP tools
      experimental: {
        mcp: {
          tools: [
            {
              name: 'execute_task',
              description: 'Execute a task from specification',
              parameters: {
                type: 'object',
                properties: {
                  specId: { type: 'string' },
                  taskId: { type: 'string' }
                },
                required: ['specId', 'taskId']
              }
            },
            {
              name: 'validate_code',
              description: 'Validate code against constitution',
              parameters: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'string' } }
                },
                required: ['files']
              }
            }
          ]
        }
      }
    }
  };
});

// Handle MCP tool calls
connection.onRequest('mcp/tools/execute', async (params) => {
  const { name, arguments: args } = params;

  switch (name) {
    case 'execute_task':
      return await executeTask(args.specId, args.taskId);
    case 'validate_code':
      return await validateCode(args.files);
  }
});

connection.listen();
```

#### Week 3: Claude Code Integration (NEW)
**Option A:** Use Claude Code extension directly
- User installs Claude Code extension
- SpecGofer exposes MCP tools
- Claude Code calls SpecGofer tools
- No direct API calls needed

**Option B:** Hybrid approach
- Language Server calls Claude API directly
- Also exposes MCP tools for Claude Code extension
- Best of both worlds

---

## 🔧 TECHNICAL IMPLICATIONS

### 1. MCP Tool Exposure
Our Language Server can expose tools that Claude Code (or Copilot) can call:
- `execute_task(specId, taskId)` - Run a spec task
- `get_next_task()` - Get next available task
- `validate_code(files)` - Run constitutional validation
- `run_tests(spec_id)` - Execute tests
- `update_task_status(taskId, status)` - Update progress

### 2. Bidirectional Communication
- **Extension → LSP:** Request specs, execute tasks
- **LSP → Extension:** Progress notifications
- **Claude → LSP (via MCP):** Call tools, get context
- **LSP → Claude (via API):** Send prompts, get implementations

### 3. Authentication
VSCode handles OAuth/API key management:
```json
{
  "mcp": {
    "servers": {
      "specgofer": {
        "env": {
          "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}",
          "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
        }
      }
    }
  }
}
```

---

## 🚫 WHAT TO AVOID

### 1. Don't Build Custom MCP Server Process
**OLD PLAN:** Separate `mcp-server/` directory
**NEW PLAN:** Integrate MCP into Language Server

**Reason:** VSCode 1.102+ has native MCP support

### 2. Don't Try to Integrate with Copilot Chat Directly
**Problem:** No programmatic API for sending tasks
**Solution:** Expose MCP tools instead - Copilot can call them

### 3. Don't Use File-Based Communication
**OLD:** `.claude-input.txt` / `.claude-output.txt`
**NEW:** LSP + MCP for structured communication

---

## ✅ RECOMMENDED NEXT STEPS

### 1. Verify VSCode Version
```bash
code --version
# Need 1.102 or higher for MCP support
```

### 2. Create Language Server with MCP Tools
```bash
mkdir -p language-server/src
cd language-server
npm init -y
npm install vscode-languageserver yaml gray-matter @anthropic-ai/sdk
```

### 3. Implement LSP + MCP Combined Server
Single server that:
- Implements LSP methods for extension communication
- Exposes MCP tools for Claude Code integration
- Calls Claude API when needed

### 4. Configure MCP in SpecGofer Extension
Extension automatically creates `.vscode/mcp.json` when initialized

### 5. Test Integration
- Extension communicates via LSP
- Claude Code discovers MCP tools
- Tools can be called: `@specgofer execute_task spec-001 T001`

---

## 📊 COMPARISON: OLD vs NEW APPROACH

| Aspect | OLD (Separate MCP Server) | NEW (Native MCP in LSP) |
|--------|---------------------------|-------------------------|
| **Processes** | 3 (Extension, LSP, MCP) | 2 (Extension, LSP) |
| **MCP Support** | Custom implementation | Native VSCode support |
| **Maintenance** | Complex | Simpler |
| **Integration** | Manual configuration | Automatic discovery |
| **Production Ready** | Experimental | GA (July 2025) |
| **Copilot Compat** | No | Yes |
| **Authentication** | Manual | VSCode managed |

---

## 🎯 CONCLUSION

**MAJOR UPDATE:** VSCode now has **native MCP support** (GA since July 2025). This eliminates the need for a separate MCP server process.

**NEW ARCHITECTURE:**
1. **LSP Server** - Handles orchestration, validation, testing
2. **MCP Tools** - Exposed in same LSP server for Claude Code
3. **Native VSCode MCP** - Handles protocol, authentication, discovery

**BENEFIT:** Simpler architecture, officially supported, production-ready

**ACTION:** Update OPTION_B_LSP_MCP_ARCHITECTURE.md to reflect native MCP integration

---

## 📚 KEY RESOURCES

1. **VSCode MCP Docs:** VSCode 1.102+ has native MCP support
2. **LSP Guide:** https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
3. **MCP Spec:** https://github.com/modelcontextprotocol
4. **Claude Code Extension:** https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code
5. **Copilot Chat API:** Chat participants only, no programmatic task sending

---

**Research Status:** ✅ Complete - Ready for implementation with updated architecture

**Next Action:** Update architecture document and proceed with LSP + Native MCP implementation
