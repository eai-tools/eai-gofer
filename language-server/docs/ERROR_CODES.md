# Error Codes Documentation

This document describes the error codes used by the SpecGofer Language Server for consistent error handling and debugging.

## Overview

The SpecGofer Language Server uses structured error codes to categorize different types of failures. Each error includes a code, message, and optional data for debugging.

## Error Structure

```typescript



interface ServerError {
  code: string;
  message: string;
  statusCode?: number;
  data?: unknown;
  timestamp?: string;
}

```



## Error Categories

### 1. Initialization Errors (1000-1099)

#### INIT_ERROR (1001)

- **Description**: Server initialization failed

- **Status Code**: 500

- **Common Causes**:
  - Workspace not found
  - Invalid configuration
  - Missing dependencies

- **Example**:

  ```json



  {
    "code": "INIT_ERROR",
    "message": "Failed to initialize server components",
    "statusCode": 500,
    "data": {
      "workspace": "/path/to/workspace",
      "error": "ENOENT: no such file or directory"
    }
  }
  ```



#### NOT_INITIALIZED (1002)

- **Description**: Server components not properly initialized

- **Status Code**: 503

- **Common Causes**:
  - MCP tool handler not created
  - SpecKit loader not initialized
  - Missing workspace folder

- **Example**:

  ```json



  {
    "code": "NOT_INITIALIZED",
    "message": "SpecKit loader not initialized",
    "statusCode": 503
  }
  ```



### 2. Validation Errors (2000-2099)

#### VALIDATION_ERROR (2001)

- **Description**: Input validation failed

- **Status Code**: 400

- **Common Causes**:
  - Missing required parameters
  - Invalid parameter types
  - Parameter value out of range

- **Example**:

  ```json



  {
    "code": "VALIDATION_ERROR",
    "message": "specId and taskId are required",
    "statusCode": 400,
    "data": {
      "provided": { "specId": null, "taskId": "T001" },
      "required": ["specId", "taskId"]
    }
  }
  ```



#### INVALID_STATUS (2002)

- **Description**: Task status value is invalid

- **Status Code**: 400

- **Valid Values**: `pending`, `in_progress`, `testing`, `completed`, `failed`, `blocked`

- **Example**:

  ```json



  {
    "code": "INVALID_STATUS",
    "message": "Invalid status: 'invalid'. Valid statuses: pending, in_progress, testing, completed, failed, blocked",
    "statusCode": 400,
    "data": {
      "provided": "invalid",
      "valid": ["pending", "in_progress", "testing", "completed", "failed", "blocked"]
    }
  }
  ```



#### INVALID_SPEC_ID (2003)

- **Description**: Specification ID format is invalid

- **Status Code**: 400

- **Format**: Must match pattern `^[0-9]{3}-[a-z0-9-]+$`

- **Example**:

  ```json



  {
    "code": "INVALID_SPEC_ID",
    "message": "Invalid specification ID format: 'invalid-spec'",
    "statusCode": 400,
    "data": {
      "provided": "invalid-spec",
      "pattern": "^[0-9]{3}-[a-z0-9-]+$",
      "examples": ["001-login-feature", "002-user-profile"]
    }
  }
  ```



#### INVALID_TASK_ID (2004)

- **Description**: Task ID format is invalid

- **Status Code**: 400

- **Format**: Must match pattern `^T[0-9]{3}$`

- **Example**:

  ```json



  {
    "code": "INVALID_TASK_ID",
    "message": "Invalid task ID format: 'TASK1'",
    "statusCode": 400,
    "data": {
      "provided": "TASK1",
      "pattern": "^T[0-9]{3}$",
      "examples": ["T001", "T002", "T010"]
    }
  }
  ```



### 3. Not Found Errors (3000-3099)

#### NOT_FOUND (3001)

- **Description**: Requested resource not found

- **Status Code**: 404

- **Common Resources**: Specifications, tasks, files

- **Example**:

  ```json



  {
    "code": "NOT_FOUND",
    "message": "Resource not found: Specification: 001-missing-spec",
    "statusCode": 404,
    "data": {
      "resource": "Specification",
      "id": "001-missing-spec",
      "availableSpecs": ["001-login-feature", "002-user-profile"]
    }
  }
  ```



#### SPEC_NOT_FOUND (3002)

- **Description**: Specification not found

- **Status Code**: 404

- **Example**:

  ```json



  {
    "code": "SPEC_NOT_FOUND",
    "message": "Specification not found: 001-missing-spec",
    "statusCode": 404,
    "data": {
      "specId": "001-missing-spec",
      "searchPath": ".specify/specs/"
    }
  }
  ```



#### TASK_NOT_FOUND (3003)

- **Description**: Task not found in specification

- **Status Code**: 404

- **Example**:

  ```json



  {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found: T999 in spec 001-login-feature",
    "statusCode": 404,
    "data": {
      "specId": "001-login-feature",
      "taskId": "T999",
      "availableTasks": ["T001", "T002", "T003"]
    }
  }
  ```



### 4. File System Errors (4000-4099)

#### FILE_ERROR (4001)

- **Description**: File system operation failed

- **Status Code**: 500

- **Common Causes**:
  - File not found
  - Permission denied
  - Disk full
  - Network file system issues

- **Example**:

  ```json



  {
    "code": "FILE_ERROR",
    "message": "Failed to read specification file",
    "statusCode": 500,
    "data": {
      "path": ".specify/specs/001-login-feature/spec.md",
      "operation": "read",
      "errno": "ENOENT",
      "syscall": "open"
    }
  }
  ```



#### FILE_PARSE_ERROR (4002)

- **Description**: Failed to parse specification file

- **Status Code**: 422

- **Common Causes**:
  - Invalid YAML frontmatter
  - Malformed Markdown
  - Encoding issues

- **Example**:

  ```json



  {
    "code": "FILE_PARSE_ERROR",
    "message": "Failed to parse YAML frontmatter in specification",
    "statusCode": 422,
    "data": {
      "file": "001-login-feature/spec.md",
      "line": 5,
      "column": 12,
      "yamlError": "bad indentation of a mapping entry"
    }
  }
  ```



#### FILE_WRITE_ERROR (4003)

- **Description**: Failed to write to file

- **Status Code**: 500

- **Example**:

  ```json



  {
    "code": "FILE_WRITE_ERROR",
    "message": "Failed to update task status in specification file",
    "statusCode": 500,
    "data": {
      "file": "001-login-feature/tasks.md",
      "operation": "write",
      "errno": "EACCES"
    }
  }
  ```



### 5. API Errors (5000-5099)

#### API_ERROR (5001)

- **Description**: External API call failed

- **Status Code**: 502

- **Common APIs**: Anthropic Claude, GitHub, Twilio

- **Example**:

  ```json



  {
    "code": "API_ERROR",
    "message": "Anthropic API request failed",
    "statusCode": 502,
    "data": {
      "api": "anthropic",
      "endpoint": "/v1/messages",
      "statusCode": 429,
      "error": "rate_limit_exceeded"
    }
  }
  ```



#### API_TIMEOUT (5002)

- **Description**: API request timed out

- **Status Code**: 504

- **Example**:

  ```json



  {
    "code": "API_TIMEOUT",
    "message": "API request timed out after 30000ms",
    "statusCode": 504,
    "data": {
      "api": "anthropic",
      "timeout": 30000,
      "elapsed": 30001
    }
  }
  ```



#### API_AUTH_ERROR (5003)

- **Description**: API authentication failed

- **Status Code**: 401

- **Example**:

  ```json



  {
    "code": "API_AUTH_ERROR",
    "message": "Invalid API key for Anthropic",
    "statusCode": 401,
    "data": {
      "api": "anthropic",
      "keyPresent": true,
      "keyValid": false
    }
  }
  ```



### 6. Test Errors (6000-6099)

#### TEST_ERROR (6001)

- **Description**: Test execution failed

- **Status Code**: 500

- **Common Causes**:
  - Test framework not found
  - Test files missing
  - Environment setup issues

- **Example**:

  ```json



  {
    "code": "TEST_ERROR",
    "message": "Failed to execute Playwright tests",
    "statusCode": 500,
    "data": {
      "specId": "001-login-feature",
      "testCommand": "npx playwright test",
      "exitCode": 1,
      "stderr": "Error: Cannot find module 'playwright'"
    }
  }
  ```



#### TEST_TIMEOUT (6002)

- **Description**: Test execution timed out

- **Status Code**: 504

- **Example**:

  ```json



  {
    "code": "TEST_TIMEOUT",
    "message": "Test execution timed out after 300000ms",
    "statusCode": 504,
    "data": {
      "specId": "001-login-feature",
      "timeout": 300000,
      "elapsed": 300001
    }
  }
  ```



### 7. Security Errors (7000-7099)

#### SECURITY_VIOLATION (7001)

- **Description**: Security policy violation detected

- **Status Code**: 403

- **Common Violations**:
  - Path traversal attempt
  - Invalid file access
  - Rate limit exceeded

- **Example**:

  ```json



  {
    "code": "SECURITY_VIOLATION",
    "message": "Path traversal detected in specification ID",
    "statusCode": 403,
    "data": {
      "specId": "../../../etc/passwd",
      "violation": "path_traversal",
      "clientInfo": {
        "ip": "127.0.0.1",
        "userAgent": "vscode"
      }
    }
  }
  ```



#### RATE_LIMIT_EXCEEDED (7002)

- **Description**: Rate limit exceeded

- **Status Code**: 429

- **Example**:

  ```json



  {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 100 requests per minute",
    "statusCode": 429,
    "data": {
      "limit": 100,
      "window": 60000,
      "current": 101,
      "resetTime": "2025-01-01T12:01:00Z"
    }
  }
  ```



### 8. Internal Errors (8000-8999)

#### INTERNAL_ERROR (8001)

- **Description**: Unexpected internal server error

- **Status Code**: 500

- **Example**:

  ```json



  {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error in mcp-tools-call: TypeError: Cannot read property 'id' of undefined",
    "statusCode": 500,
    "data": {
      "operation": "mcp-tools-call",
      "stack": "TypeError: Cannot read property 'id' of undefined\n    at ..."
    }
  }
  ```



#### UNKNOWN_ERROR (8002)

- **Description**: Unknown error occurred

- **Status Code**: 500

- **Example**:

  ```json



  {
    "code": "UNKNOWN_ERROR",
    "message": "Unknown error in lsp-get-specs",
    "statusCode": 500,
    "data": {
      "operation": "lsp-get-specs"
    }
  }
  ```



## Error Handling Best Practices

### For Clients

1. **Check Error Codes**: Always check the `code` field for specific error handling
2. **Graceful Degradation**: Provide fallbacks for non-critical errors
3. **User-Friendly Messages**: Convert technical errors to user-friendly messages
4. **Logging**: Log full error details for debugging

```typescript



try {
  const result = await connection.sendRequest('specKit/getSpecs', {});
  if (!result.success) {
    switch (result.code) {
      case 'NOT_INITIALIZED':
        showMessage('Server is starting up, please wait...');
        break;
      case 'FILE_ERROR':
        showMessage('Could not read specifications. Check file permissions.');
        break;
      default:
        showMessage('An unexpected error occurred.');
        console.error('Server error:', result);
    }
  }
} catch (error) {
  console.error('Request failed:', error);
}

```



### For Server Development

1. **Use Structured Errors**: Always include code, message, and relevant data
2. **Log Security Violations**: Log all security-related errors
3. **Include Context**: Add operation name and parameters to error data
4. **Consistent Formatting**: Use the same error structure across all handlers

```typescript



// Good error handling
try {
  const spec = await specKitLoader.loadSpec(specId);
  if (!spec) {
    throw new NotFoundError(`Specification: ${specId}`);
  }
} catch (error) {
  logger.error('Failed to load specification', error, { specId, operation: 'loadSpec' });
  
  if (error instanceof NotFoundError) {
    return {
      success: false,
      code: 'SPEC_NOT_FOUND',
      message: error.message,
      data: { specId, searchPath: '.specify/specs/' }
    };
  }
  
  return {
    success: false,
    code: 'INTERNAL_ERROR',
    message: `Internal error: ${error.message}`,
    data: { operation: 'loadSpec', specId }
  };
}

```



## Error Monitoring

### Logging

All errors are logged with structured data:

```



[ERROR] MCP tool specgofer_get_specs failed Error: {"message":"SpecKit loader not initialized","code":"NOT_INITIALIZED","statusCode":503} Data: {}

```



### Metrics

Track error rates by code:
- `server.errors.total` - Total error count
- `server.errors.by_code` - Errors grouped by code
- `server.errors.by_operation` - Errors grouped by operation

### Alerting

Set up alerts for critical errors:
- `INIT_ERROR` - Server failing to start
- `SECURITY_VIOLATION` - Potential security threats
- `API_AUTH_ERROR` - Authentication issues
- High error rates (>10% of requests)

## Troubleshooting Guide

### Common Error Scenarios

#### "SpecKit loader not initialized"
1. Check workspace folder is set
2. Verify `.specify` directory exists
3. Restart language server

#### "Specification not found"
1. Check specification ID format
2. Verify file exists in `.specify/specs/`
3. Check file permissions

#### "API request failed"
1. Verify API keys are set
2. Check network connectivity
3. Review rate limits

#### "Test execution failed"
1. Check test framework installation
2. Verify test files exist
3. Review test configuration
