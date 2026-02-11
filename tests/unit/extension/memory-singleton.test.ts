import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * T052: Verify single MemoryManager instance is used across components.
 *
 * Validates the shared singleton pattern structurally because
 * autonomousCommands.ts imports node-pty (native module) which may
 * not be available in the test Node.js version.
 */
describe('MemoryManager Singleton (T052)', () => {
  const filePath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('should export setSharedMemoryManager function', () => {
    expect(source).toContain('export function setSharedMemoryManager(');
  });

  it('should export setSharedContextBuilder function', () => {
    expect(source).toContain('export function setSharedContextBuilder(');
  });

  it('should export getSharedMemoryManager function', () => {
    expect(source).toContain('export function getSharedMemoryManager(');
  });

  it('should export getSharedContextBuilder function', () => {
    expect(source).toContain('export function getSharedContextBuilder(');
  });

  it('should declare module-level shared variables', () => {
    expect(source).toContain('let sharedMemoryManager:');
    expect(source).toContain('let sharedContextBuilder:');
  });

  it('should use shared MemoryManager in startAutonomousExecution instead of creating new', () => {
    // Verify the duplicate `new MemoryManager()` was replaced with shared fallback
    expect(source).toContain('sharedMemoryManager ?? new MemoryManager(');
  });

  it('should import ContextBuilder', () => {
    expect(source).toContain("import { ContextBuilder } from './autonomous/ContextBuilder'");
  });
});

describe('Extension wiring (T049-T050)', () => {
  const extensionPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extensionSource = fs.readFileSync(extensionPath, 'utf-8');

  it('should import ContextBuilder in extension.ts', () => {
    expect(extensionSource).toContain(
      "import { ContextBuilder } from './autonomous/ContextBuilder'"
    );
  });

  it('should create shared ContextBuilder in registerCommands', () => {
    expect(extensionSource).toContain('new ContextBuilder(');
    expect(extensionSource).toContain('workspacePath,');
    expect(extensionSource).toContain('memoryManager,');
  });

  it('should call setSharedMemoryManager from extension.ts', () => {
    expect(extensionSource).toContain('setSharedMemoryManager(');
  });

  it('should call setSharedContextBuilder from extension.ts', () => {
    expect(extensionSource).toContain('setSharedContextBuilder(');
  });
});
