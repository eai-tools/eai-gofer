/**
 * Unit tests for OutputMonitor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutputMonitor } from '../../../src/autonomous/OutputMonitor';

describe('OutputMonitor', () => {
  let outputMonitor: OutputMonitor;

  beforeEach(() => {
    outputMonitor = new OutputMonitor();
  });

  describe('detectTaskCompletion', () => {
    it('should detect task completion marker', () => {
      const output = '✅ Task #T005: Implemented user authentication';
      const result = outputMonitor.detectTaskCompletion(output);

      expect(result).toBeDefined();
      expect(result?.taskId).toBe('T005');
      expect(result?.newStatus).toBe('completed');
    });

    it('should detect task start marker', () => {
      const output = '🔄 Task #T012: Setting up database models';
      const result = outputMonitor.detectTaskCompletion(output);

      expect(result).toBeDefined();
      expect(result?.taskId).toBe('T012');
      expect(result?.newStatus).toBe('in_progress');
    });

    it('should detect task failure marker', () => {
      const output = '❌ Task #T008: Failed to compile TypeScript';
      const result = outputMonitor.detectTaskCompletion(output);

      expect(result).toBeDefined();
      expect(result?.taskId).toBe('T008');
      expect(result?.newStatus).toBe('failed');
    });

    it('should return null for non-task output', () => {
      const output = 'Just some regular terminal output';
      const result = outputMonitor.detectTaskCompletion(output);

      expect(result).toBeNull();
    });

    it('should handle multiline output with task marker', () => {
      const output = `
        Running tests...
        ✅ Task #T015: All tests passed
        Cleaning up...
      `;
      const result = outputMonitor.detectTaskCompletion(output);

      expect(result).toBeDefined();
      expect(result?.taskId).toBe('T015');
    });
  });

  describe('detectError', () => {
    it('should detect TypeScript compilation error', () => {
      const output = `
        src/models/User.ts:42:5 - error TS2322: Type 'string' is not assignable to type 'number'.
        42     age: "invalid"
               ~~~
      `;
      const result = outputMonitor.detectError(output);

      expect(result).toBeDefined();
      expect(result?.errorType).toBe('type_error');
      expect(result?.affectedFiles).toContain('src/models/User.ts');
    });

    it('should detect syntax error', () => {
      const output = `
        SyntaxError: Unexpected token } in JSON at position 42
            at JSON.parse (<anonymous>)
      `;
      const result = outputMonitor.detectError(output);

      expect(result).toBeDefined();
      expect(result?.errorType).toBe('syntax_error');
    });

    it('should detect test failure', () => {
      const output = `
        FAIL  tests/user.test.ts
        ● User › should validate email format
          expect(received).toBe(expected)
          Expected: true
          Received: false
      `;
      const result = outputMonitor.detectError(output);

      expect(result).toBeDefined();
      expect(result?.errorType).toBe('test_failure');
      expect(result?.affectedFiles).toContain('tests/user.test.ts');
    });

    it('should detect linting error', () => {
      const output = `
        /src/app.ts
          12:5  error  'foo' is assigned a value but never used  @typescript-eslint/no-unused-vars
      `;
      const result = outputMonitor.detectError(output);

      expect(result).toBeDefined();
      expect(result?.errorType).toBe('linting_error');
    });

    it('should return null for non-error output', () => {
      const output = 'Everything is working fine!';
      const result = outputMonitor.detectError(output);

      expect(result).toBeNull();
    });

    it('should extract stack trace from error', () => {
      const output = `
        Error: Connection refused
            at Socket.connect (/app/db.ts:25:15)
            at Database.init (/app/db.ts:10:5)
            at main (/app/index.ts:5:3)
      `;
      const result = outputMonitor.detectError(output);

      expect(result).toBeDefined();
      expect(result?.stackTrace).toBeDefined();
      expect(result?.stackTrace).toContain('at Socket.connect');
    });
  });

  describe('detectQuestion', () => {
    it('should detect question with options', () => {
      const output = `
        I need to choose an authentication method:
        Option A: JWT tokens with refresh
        Option B: Session-based auth
        Which approach should I use?
      `;
      const result = outputMonitor.detectQuestion(output);

      expect(result).toBeDefined();
      expect(result?.confidence).toBe('high');
      expect(result?.options.length).toBe(2);
      expect(result?.options[0]).toContain('JWT tokens');
      expect(result?.options[1]).toContain('Session-based');
    });

    it('should detect "Which approach" question', () => {
      const output = 'Which approach should I use for error handling?';
      const result = outputMonitor.detectQuestion(output);

      expect(result).toBeDefined();
      expect(result?.confidence).toBe('high');
      expect(result?.questionText).toContain('Which approach');
    });

    it('should detect "Should I" question', () => {
      const output = 'Should I use Redis for caching or Memcached?';
      const result = outputMonitor.detectQuestion(output);

      expect(result).toBeDefined();
      expect(result?.confidence).toBe('medium');
    });

    it('should detect "I\'m blocked on" statement', () => {
      const output = "I'm blocked on setting up the database schema";
      const result = outputMonitor.detectQuestion(output);

      expect(result).toBeDefined();
      expect(result?.confidence).toBe('high');
    });

    it('should return null for rhetorical questions', () => {
      const output = 'Installing dependencies... Done!';
      const result = outputMonitor.detectQuestion(output);

      expect(result).toBeNull();
    });

    it('should handle questions with context', () => {
      const output = `
        Analyzing the codebase structure...
        I found two possible patterns for the API layer.
        Option A: RESTful endpoints with Express
        Option B: GraphQL with Apollo Server
        Which method should I implement?
      `;
      const result = outputMonitor.detectQuestion(output);

      expect(result).toBeDefined();
      expect(result?.confidence).toBe('high');
      expect(result?.context).toBeDefined();
    });
  });

  describe('detectContextWarning', () => {
    it('should detect context window warning', () => {
      const output = 'Warning: Context window approaching limit (180K tokens)';
      const result = outputMonitor.detectContextWarning(output);

      expect(result).toBe(true);
    });

    it('should detect token limit message', () => {
      const output = 'Error: Token limit exceeded. Please start a new conversation.';
      const result = outputMonitor.detectContextWarning(output);

      expect(result).toBe(true);
    });

    it('should detect context exhaustion patterns', () => {
      const output = 'I apologize, but my context window is nearly full...';
      const result = outputMonitor.detectContextWarning(output);

      expect(result).toBe(true);
    });

    it('should return false for normal output', () => {
      const output = 'Implementing the context manager module...';
      const result = outputMonitor.detectContextWarning(output);

      expect(result).toBe(false);
    });
  });

  describe('parseStream', () => {
    it('should parse multiple events from output stream', () => {
      const output = `
        🔄 Task #T001: Starting implementation
        Installing dependencies...
        ✅ Task #T001: Setup complete
        🔄 Task #T002: Running tests
        FAIL tests/app.test.ts
          Expected: true
          Received: false
      `;

      const events = outputMonitor.parseStream(output);

      expect(events.length).toBeGreaterThan(0);

      // Should have detected task starts, completions, and error
      const taskEvents = events.filter((e) => e.type === 'task_update');
      const errorEvents = events.filter((e) => e.type === 'error_detected');

      expect(taskEvents.length).toBeGreaterThanOrEqual(2);
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for clean output', () => {
      const output = 'Just regular output with no special markers';
      const events = outputMonitor.parseStream(output);

      expect(events).toEqual([]);
    });
  });
});
