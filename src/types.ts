export interface Spec {
  id: string;
  title: string;
  description: string;
  status?: 'draft' | 'in_progress' | 'testing' | 'completed' | 'failed';
  created?: string;
  featureBranch?: string;
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
  data?: unknown;
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

export interface SpecMetadata {
  title?: string;
  branch?: string;
  created?: string;
  status?: 'draft' | 'in_progress' | 'testing' | 'completed' | 'failed';
  input?: string;
  id?: string;
  [key: string]: string | undefined;
}

export interface ParsedSpec {
  metadata: SpecMetadata;
  content: string;
}

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  enabled?: boolean;
}
