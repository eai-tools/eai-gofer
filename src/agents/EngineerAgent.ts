/** Engineer Agent - Tasks T039-T041 */
import { ClaudeClient } from '../utils/ClaudeClient.js';
import type { ValidationResult } from '../types/index.js';

export class EngineerAgent {
  constructor(private claudeClient: ClaudeClient) {}

  async validate(
    taskDescription: string,
    code: string,
    constitution: string
  ): Promise<ValidationResult> {
    const prompt = this.buildValidationPrompt(taskDescription, code, constitution);
    const response = await this.claudeClient.sendMessage(prompt);
    return this.parseValidationResponse(response);
  }

  buildValidationPrompt(task: string, code: string, constitution: string): string {
    return `Validate this code against the constitution:\n\nTask: ${task}\n\nCode:\n${code}\n\nConstitution:\n${constitution}\n\nRespond with JSON: {isValid: boolean, issues: [], suggestions: [], constitutionChecks: {}}`;
  }

  parseValidationResponse(response: string): ValidationResult {
    const parsed = JSON.parse(response);
    return {
      id: crypto.randomUUID(),
      taskId: '',
      timestamp: new Date().toISOString(),
      isValid: parsed.isValid,
      issues: parsed.issues || [],
      suggestions: parsed.suggestions || [],
      constitutionChecks: parsed.constitutionChecks || {},
    };
  }
}
