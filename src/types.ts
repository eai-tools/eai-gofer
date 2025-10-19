export interface Spec {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
  acceptanceCriteria: AcceptanceCriteria[];
  qaRules: QARule[];
}

export interface Task {
  id: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed';
  deliveryPrompt: string;
  attempts?: number;
  lastError?: string;
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  testType: 'playwright' | 'unit' | 'integration' | 'manual';
  testPath: string;
  passed?: boolean;
}

export interface QARule {
  question: string;
  answer: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  needsHumanInput?: boolean;
  question?: string;
  options?: string[];
}

export interface TestResult {
  passed: boolean;
  failedTests: string[];
  summary: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}
