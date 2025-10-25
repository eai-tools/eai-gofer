# Configuration Documentation

This document describes the configuration options for the SpecGofer Language Server.

## Overview

The SpecGofer Language Server can be configured through VSCode settings, workspace settings, or environment variables. Configuration changes are applied dynamically without requiring a server restart.

## VSCode Settings

### Basic Settings

```json



{
  "specgofer.debug": false,
  "specgofer.logLevel": "info",
  "specgofer.specDirectory": ".specify",
  "specgofer.cacheEnabled": true,
  "specgofer.maxCacheSize": 100
}

```



### Advanced Settings

```json



{
  "specgofer.server.path": "./language-server/dist/server.js",
  "specgofer.server.options": {
    "execArgv": ["--max-old-space-size=4096"]
  },
  "specgofer.trace.server": "off",
  "specgofer.experimental.features": []
}

```



## Configuration Options

### Core Settings

#### `specgofer.debug`

- **Type**: `boolean`

- **Default**: `false`

- **Description**: Enable debug mode with verbose logging

- **Example**: `true`

#### `specgofer.logLevel`

- **Type**: `string`

- **Default**: `"info"`

- **Options**: `"debug"`, `"info"`, `"warn"`, `"error"`

- **Description**: Set the minimum log level for server output

- **Example**: `"debug"`

#### `specgofer.specDirectory`

- **Type**: `string`

- **Default**: `".specify"`

- **Description**: Directory containing specifications (relative to workspace root)

- **Example**: `"specs"`, `"features"`

### Caching Settings

#### `specgofer.cacheEnabled`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Enable in-memory caching of parsed specifications

- **Example**: `false`

#### `specgofer.maxCacheSize`

- **Type**: `number`

- **Default**: `100`

- **Description**: Maximum number of specifications to cache

- **Example**: `50`

#### `specgofer.cacheTtl`

- **Type**: `number`

- **Default**: `300000` (5 minutes)

- **Description**: Cache time-to-live in milliseconds

- **Example**: `600000` (10 minutes)

### Server Settings

#### `specgofer.server.path`

- **Type**: `string`

- **Default**: Auto-detected

- **Description**: Path to the language server executable

- **Example**: `"./node_modules/.bin/specgofer-server"`

#### `specgofer.server.options`

- **Type**: `object`

- **Default**: `{}`

- **Description**: Node.js options for server process

- **Example**:

  ```json



  {
    "execArgv": ["--max-old-space-size=4096"],
    "cwd": "./custom-directory"
  }
  ```



#### `specgofer.trace.server`

- **Type**: `string`

- **Default**: `"off"`

- **Options**: `"off"`, `"messages"`, `"verbose"`

- **Description**: Trace communication between client and server

- **Example**: `"verbose"`

### MCP Integration

#### `specgofer.mcp.enabled`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Enable MCP tools for Claude Code integration

- **Example**: `false`

#### `specgofer.mcp.toolTimeout`

- **Type**: `number`

- **Default**: `30000` (30 seconds)

- **Description**: Timeout for MCP tool execution in milliseconds

- **Example**: `60000`

### Validation Settings

#### `specgofer.validation.enabled`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Enable real-time specification validation

- **Example**: `false`

#### `specgofer.validation.strict`

- **Type**: `boolean`

- **Default**: `false`

- **Description**: Use strict validation rules

- **Example**: `true`

#### `specgofer.validation.customRules`

- **Type**: `array`

- **Default**: `[]`

- **Description**: Additional validation rules

- **Example**:

  ```json



  [
    {
      "rule": "task-id-format",
      "pattern": "^T\\d{3}$",
      "message": "Task IDs must be in format T001, T002, etc."
    }
  ]
  ```



### Performance Settings

#### `specgofer.performance.watchFiles`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Watch specification files for changes

- **Example**: `false`

#### `specgofer.performance.debounceMs`

- **Type**: `number`

- **Default**: `500`

- **Description**: Debounce time for file change events in milliseconds

- **Example**: `1000`

#### `specgofer.performance.maxFileSize`

- **Type**: `number`

- **Default**: `1048576` (1MB)

- **Description**: Maximum specification file size in bytes

- **Example**: `2097152` (2MB)

## Environment Variables

The server also respects environment variables:

### Required Variables

```bash



# Anthropic API key for code validation
ANTHROPIC_API_KEY=sk-ant-api-key-here

```



### Optional Variables

```bash



# Override workspace directory
SPECGOFER_WORKSPACE=/path/to/workspace

# Override specification directory
SPECGOFER_SPEC_DIR=.specify

# Override log level
SPECGOFER_LOG_LEVEL=debug

# Disable caching
SPECGOFER_CACHE_ENABLED=false

# Custom cache size
SPECGOFER_MAX_CACHE_SIZE=50

# Custom server port (for debugging)
SPECGOFER_SERVER_PORT=3000

```



## Workspace Configuration

Create `.vscode/settings.json` in your workspace:

```json



{
  "specgofer.debug": true,
  "specgofer.logLevel": "debug",
  "specgofer.specDirectory": ".specs",
  "specgofer.validation.strict": true,
  "specgofer.mcp.enabled": true,
  "specgofer.trace.server": "verbose"
}

```



## Configuration Profiles

### Development Profile

```json



{
  "specgofer.debug": true,
  "specgofer.logLevel": "debug",
  "specgofer.trace.server": "verbose",
  "specgofer.validation.strict": true,
  "specgofer.performance.watchFiles": true,
  "specgofer.cacheEnabled": false
}

```



### Production Profile

```json



{
  "specgofer.debug": false,
  "specgofer.logLevel": "warn",
  "specgofer.trace.server": "off",
  "specgofer.validation.strict": false,
  "specgofer.performance.watchFiles": true,
  "specgofer.cacheEnabled": true,
  "specgofer.maxCacheSize": 200
}

```



### Performance Optimized

```json



{
  "specgofer.cacheEnabled": true,
  "specgofer.maxCacheSize": 500,
  "specgofer.cacheTtl": 600000,
  "specgofer.performance.debounceMs": 1000,
  "specgofer.validation.enabled": false,
  "specgofer.trace.server": "off"
}

```



## Dynamic Configuration

Configuration can be changed at runtime:

```typescript



// Update configuration via LSP
await connection.workspace.getConfiguration('specgofer');
await connection.sendNotification('workspace/didChangeConfiguration', {
  settings: {
    specgofer: {
      debug: true,
      logLevel: 'debug'
    }
  }
});

```



## Configuration Validation

The server validates configuration on startup and change:

### Valid Configuration

```json



{
  "specgofer.logLevel": "debug",
  "specgofer.maxCacheSize": 100,
  "specgofer.specDirectory": ".specify"
}

```



### Invalid Configuration (will use defaults)

```json



{
  "specgofer.logLevel": "invalid-level",
  "specgofer.maxCacheSize": "not-a-number",
  "specgofer.specDirectory": 123
}

```



## Troubleshooting Configuration

### Check Current Configuration

1. Open VSCode Command Palette (`Cmd+Shift+P`)
2. Run "Preferences: Open Settings (JSON)"
3. Search for "specgofer"

### Debug Configuration Issues

1. Enable debug logging:

   ```json
   {
     "specgofer.debug": true,
     "specgofer.logLevel": "debug",
     "specgofer.trace.server": "verbose"
   }
   ```

2. Check Output panel: "SpecGofer Language Server"

3. Look for configuration-related errors:

   ```text
   [INFO] Configuration loaded: {...}
   [WARN] Invalid log level 'invalid', using 'info'
   [ERROR] Failed to load configuration: {...}
   ```

### Reset Configuration

To reset to defaults:

1. Remove all `specgofer.*` settings from settings.json
2. Restart VSCode
3. Settings will use default values

### Common Issues

#### Server Not Starting

**Problem**: Language server fails to start

**Solution**: Check server path configuration:

```json



{
  "specgofer.server.path": "./language-server/dist/server.js"
}

```



#### No Specifications Found

**Problem**: Server can't find specifications

**Solution**: Verify spec directory configuration:

```json



{
  "specgofer.specDirectory": ".specify"
}

```



#### Poor Performance

**Problem**: Server is slow or unresponsive

**Solution**: Optimize performance settings:

```json



{
  "specgofer.cacheEnabled": true,
  "specgofer.maxCacheSize": 200,
  "specgofer.performance.debounceMs": 1000
}

```



#### MCP Tools Not Available

**Problem**: Claude Code can't see MCP tools

**Solution**: Enable MCP integration:

```json



{
  "specgofer.mcp.enabled": true
}

```



## Migration Guide

### From v1.x to v2.x

```json



// Old configuration
{
  "specgofer.specsDir": "specs",
  "specgofer.enableLogging": true
}

// New configuration
{
  "specgofer.specDirectory": "specs",
  "specgofer.debug": true,
  "specgofer.logLevel": "debug"
}

```



### Breaking Changes

- `specgofer.specsDir` → `specgofer.specDirectory`
- `specgofer.enableLogging` → `specgofer.debug`
- `specgofer.verboseLogging` → `specgofer.logLevel: "debug"`

## Configuration Schema

Full JSON schema for validation:

```json



{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "specgofer.debug": {
      "type": "boolean",
      "default": false,
      "description": "Enable debug mode"
    },
    "specgofer.logLevel": {
      "type": "string",
      "enum": ["debug", "info", "warn", "error"],
      "default": "info",
      "description": "Minimum log level"
    },
    "specgofer.specDirectory": {
      "type": "string",
      "default": ".specify",
      "description": "Specification directory"
    }
  }
}

```
