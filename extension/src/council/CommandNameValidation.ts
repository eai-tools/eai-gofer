import * as path from 'path';

export function validateCommandName(commandName: string): void {
  if (!commandName || commandName.trim().length === 0) {
    throw new Error('Command name cannot be empty');
  }

  if (
    commandName.includes('..') ||
    commandName.includes('/') ||
    commandName.includes('\\') ||
    commandName.includes('\0')
  ) {
    throw new Error(`Invalid command name: "${commandName}" (path traversal not allowed)`);
  }

  if (path.isAbsolute(commandName)) {
    throw new Error(`Invalid command name: "${commandName}" (absolute paths not allowed)`);
  }
}
