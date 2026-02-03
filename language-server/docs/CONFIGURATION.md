# Configuration Documentation

This document describes the configuration options for the Gofer Language Server.

## Overview

The Gofer Language Server can be configured through VSCode settings, workspace
settings, or environment variables. Configuration changes are applied
dynamically without requiring a server restart.

## VSCode Settings

### Basic Settings

```json
{
  "gofer.debug": false,
  "gofer.logLevel": "info",
  "gofer.specDirectory": ".specify",
  "gofer.cacheEnabled": true,
  "gofer.maxCacheSize": 100
}
```

### Advanced Settings

```json
{
  "gofer.server.path": "./language-server/dist/server.js",
  "gofer.server.options": {
    "execArgv": ["--max-old-space-size=4096"]
  },
  "gofer.trace.server": "off",
  "gofer.experimental.features": []
}
```

## Configuration Options

### Core Settings

#### `gofer.debug`

- **Type**: `boolean`

- **Default**: `false`

- **Description**: Enable debug mode with verbose logging

- **Example**: `true`

#### `gofer.logLevel`

- **Type**: `string`

- **Default**: `"info"`

- **Options**: `"debug"`, `"info"`, `"warn"`, `"error"`

- **Description**: Set the minimum log level for server output

- **Example**: `"debug"`

#### `gofer.specDirectory`

- **Type**: `string`

- **Default**: `".specify"`

- **Description**: Directory containing specifications (relative to workspace
  root)

- **Example**: `"specs"`, `"features"`

### Caching Settings

#### `gofer.cacheEnabled`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Enable in-memory caching of parsed specifications

- **Example**: `false`

#### `gofer.maxCacheSize`

- **Type**: `number`

- **Default**: `100`

- **Description**: Maximum number of specifications to cache

- **Example**: `50`

#### `gofer.cacheTtl`

- **Type**: `number`

- **Default**: `300000` (5 minutes)

- **Description**: Cache time-to-live in milliseconds

- **Example**: `600000` (10 minutes)

### Server Settings

#### `gofer.server.path`

- **Type**: `string`

- **Default**: Auto-detected

- **Description**: Path to the language server executable

- **Example**: `"./node_modules/.bin/gofer-server"`

#### `gofer.server.options`

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

#### `gofer.trace.server`

- **Type**: `string`

- **Default**: `"off"`

- **Options**: `"off"`, `"messages"`, `"verbose"`

- **Description**: Trace communication between client and server

- **Example**: `"verbose"`

### MCP Integration

#### `gofer.mcp.enabled`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Enable MCP tools for Claude Code integration

- **Example**: `false`

#### `gofer.mcp.toolTimeout`

- **Type**: `number`

- **Default**: `30000` (30 seconds)

- **Description**: Timeout for MCP tool execution in milliseconds

- **Example**: `60000`

### Validation Settings

#### `gofer.validation.enabled`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Enable real-time specification validation

- **Example**: `false`

#### `gofer.validation.strict`

- **Type**: `boolean`

- **Default**: `false`

- **Description**: Use strict validation rules

- **Example**: `true`

#### `gofer.validation.customRules`

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

#### `gofer.performance.watchFiles`

- **Type**: `boolean`

- **Default**: `true`

- **Description**: Watch specification files for changes

- **Example**: `false`

#### `gofer.performance.debounceMs`

- **Type**: `number`

- **Default**: `500`

- **Description**: Debounce time for file change events in milliseconds

- **Example**: `1000`

#### `gofer.performance.maxFileSize`

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
  "gofer.debug": true,
  "gofer.logLevel": "debug",
  "gofer.specDirectory": ".specs",
  "gofer.validation.strict": true,
  "gofer.mcp.enabled": true,
  "gofer.trace.server": "verbose"
}
```

## Configuration Profiles

### Development Profile

```json
{
  "gofer.debug": true,
  "gofer.logLevel": "debug",
  "gofer.trace.server": "verbose",
  "gofer.validation.strict": true,
  "gofer.performance.watchFiles": true,
  "gofer.cacheEnabled": false
}
```

### Production Profile

```json
{
  "gofer.debug": false,
  "gofer.logLevel": "warn",
  "gofer.trace.server": "off",
  "gofer.validation.strict": false,
  "gofer.performance.watchFiles": true,
  "gofer.cacheEnabled": true,
  "gofer.maxCacheSize": 200
}
```

### Performance Optimized

```json
{
  "gofer.cacheEnabled": true,
  "gofer.maxCacheSize": 500,
  "gofer.cacheTtl": 600000,
  "gofer.performance.debounceMs": 1000,
  "gofer.validation.enabled": false,
  "gofer.trace.server": "off"
}
```

## Dynamic Configuration

Configuration can be changed at runtime:

```typescript
// Update configuration via LSP
await connection.workspace.getConfiguration('gofer');
await connection.sendNotification('workspace/didChangeConfiguration', {
  settings: {
    gofer: {
      debug: true,
      logLevel: 'debug',
    },
  },
});
```

## Configuration Validation

The server validates configuration on startup and change:

### Valid Configuration

```json
{
  "gofer.logLevel": "debug",
  "gofer.maxCacheSize": 100,
  "gofer.specDirectory": ".specify"
}
```

### Invalid Configuration (will use defaults)

```json
{
  "gofer.logLevel": "invalid-level",
  "gofer.maxCacheSize": "not-a-number",
  "gofer.specDirectory": 123
}
```

## Troubleshooting Configuration

### Check Current Configuration

1. Open VSCode Command Palette (`Cmd+Shift+P`)
2. Run "Preferences: Open Settings (JSON)"
3. Search for "gofer"

### Debug Configuration Issues

1. Enable debug logging:

   ```json
   {
     "gofer.debug": true,
     "gofer.logLevel": "debug",
     "gofer.trace.server": "verbose"
   }
   ```

2. Check Output panel: "Gofer Language Server"

3. Look for configuration-related errors:

   ```text
   [INFO] Configuration loaded: {...}
   [WARN] Invalid log level 'invalid', using 'info'
   [ERROR] Failed to load configuration: {...}
   ```

### Reset Configuration

To reset to defaults:

1. Remove all `gofer.*` settings from settings.json
2. Restart VSCode
3. Settings will use default values

### Common Issues

#### Server Not Starting

**Problem**: Language server fails to start

**Solution**: Check server path configuration:

```json
{
  "gofer.server.path": "./language-server/dist/server.js"
}
```

#### No Specifications Found

**Problem**: Server can't find specifications

**Solution**: Verify spec directory configuration:

```json
{
  "gofer.specDirectory": ".specify"
}
```

#### Poor Performance

**Problem**: Server is slow or unresponsive

**Solution**: Optimize performance settings:

```json
{
  "gofer.cacheEnabled": true,
  "gofer.maxCacheSize": 200,
  "gofer.performance.debounceMs": 1000
}
```

#### MCP Tools Not Available

**Problem**: Claude Code can't see MCP tools

**Solution**: Enable MCP integration:

```json
{
  "gofer.mcp.enabled": true
}
```

## Migration Guide

### From v1.x to v2.x

```json



// Old configuration
{
  "gofer.specsDir": "specs",
  "gofer.enableLogging": true
}

// New configuration
{
  "gofer.specDirectory": "specs",
  "gofer.debug": true,
  "gofer.logLevel": "debug"
}

```

### Breaking Changes

- `gofer.specsDir` → `gofer.specDirectory`
- `gofer.enableLogging` → `gofer.debug`
- `gofer.verboseLogging` → `gofer.logLevel: "debug"`

## Configuration Schema

Full JSON schema for validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "gofer.debug": {
      "type": "boolean",
      "default": false,
      "description": "Enable debug mode"
    },
    "gofer.logLevel": {
      "type": "string",
      "enum": ["debug", "info", "warn", "error"],
      "default": "info",
      "description": "Minimum log level"
    },
    "gofer.specDirectory": {
      "type": "string",
      "default": ".specify",
      "description": "Specification directory"
    }
  }
}
```
