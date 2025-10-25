/**
 * Test data generators for creating realistic test scenarios
 */

export interface SpecData {
  id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  created: string;
  author: string;
  description: string;
  tasks: TaskData[];
  acceptanceCriteria: string[];
  techStack: string[];
  dependencies: string[];
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  estimatedHours: number;
  actualHours?: number;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface ProjectStructure {
  name: string;
  type: 'web' | 'api' | 'cli' | 'library' | 'mobile';
  files: FileStructure[];
  dependencies: string[];
}

export interface FileStructure {
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileStructure[];
}

export class TestDataGenerator {
  private static counter = 0;

  /**
   * Generate a unique ID
   */
  public static generateId(prefix = 'test'): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  /**
   * Generate a realistic spec
   */
  public static generateSpec(overrides: Partial<SpecData> = {}): SpecData {
    const baseSpecs = [
      {
        title: 'User Authentication System',
        description: 'Implement secure user authentication with JWT tokens',
        techStack: ['Node.js', 'Express', 'JWT', 'bcrypt'],
        acceptanceCriteria: [
          'Users can register with email and password',
          'Users can login and receive JWT token',
          'Protected routes require valid token',
          'Password hashing is implemented'
        ]
      },
      {
        title: 'Real-time Chat Feature',
        description: 'Add real-time messaging capabilities to the application',
        techStack: ['WebSocket', 'Socket.io', 'React', 'Node.js'],
        acceptanceCriteria: [
          'Users can send and receive messages in real-time',
          'Message history is persisted',
          'Online status indicators work',
          'Multiple chat rooms supported'
        ]
      },
      {
        title: 'Data Analytics Dashboard',
        description: 'Create comprehensive analytics dashboard with charts',
        techStack: ['React', 'Chart.js', 'D3.js', 'REST API'],
        acceptanceCriteria: [
          'Display key metrics in visual charts',
          'Real-time data updates',
          'Export functionality',
          'Responsive design'
        ]
      }
    ];

    const randomSpec = baseSpecs[Math.floor(Math.random() * baseSpecs.length)];
    
    return {
      id: this.generateId('spec'),
      title: randomSpec.title,
      status: 'draft',
      created: new Date().toISOString(),
      author: 'Test User',
      description: randomSpec.description,
      tasks: this.generateTasks(3, 8),
      acceptanceCriteria: randomSpec.acceptanceCriteria,
      techStack: randomSpec.techStack,
      dependencies: [],
      ...overrides
    };
  }

  /**
   * Generate multiple specs
   */
  public static generateSpecs(count: number): SpecData[] {
    return Array.from({ length: count }, () => this.generateSpec());
  }

  /**
   * Generate realistic tasks
   */
  public static generateTasks(minCount = 1, maxCount = 10): TaskData[] {
    const taskTemplates = [
      { title: 'Set up project structure', priority: 'high' as const, estimatedHours: 2 },
      { title: 'Implement database schema', priority: 'critical' as const, estimatedHours: 4 },
      { title: 'Create API endpoints', priority: 'high' as const, estimatedHours: 6 },
      { title: 'Add authentication middleware', priority: 'critical' as const, estimatedHours: 3 },
      { title: 'Write unit tests', priority: 'medium' as const, estimatedHours: 4 },
      { title: 'Create UI components', priority: 'medium' as const, estimatedHours: 5 },
      { title: 'Add error handling', priority: 'high' as const, estimatedHours: 2 },
      { title: 'Optimize performance', priority: 'low' as const, estimatedHours: 3 },
      { title: 'Write documentation', priority: 'low' as const, estimatedHours: 2 },
      { title: 'Deploy to staging', priority: 'medium' as const, estimatedHours: 1 }
    ];

    const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    const selectedTemplates = taskTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    return selectedTemplates.map((template, index) => ({
      id: this.generateId('task'),
      title: template.title,
      description: `Detailed description for ${template.title.toLowerCase()}`,
      status: index === 0 ? 'in_progress' as const : 'pending' as const,
      dependencies: index > 0 ? [this.generateId('task')] : [],
      estimatedHours: template.estimatedHours,
      priority: template.priority,
      tags: ['backend', 'frontend', 'testing'][Math.floor(Math.random() * 3)] ? ['backend'] : []
    }));
  }

  /**
   * Generate a project structure
   */
  public static generateProjectStructure(type: ProjectStructure['type'] = 'web'): ProjectStructure {
    const structures: Record<ProjectStructure['type'], FileStructure[]> = {
      web: [
        {
          path: 'src',
          type: 'directory',
          children: [
            { path: 'src/components', type: 'directory' },
            { path: 'src/pages', type: 'directory' },
            { path: 'src/utils', type: 'directory' },
            { path: 'src/App.tsx', type: 'file', content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;' },
            { path: 'src/index.tsx', type: 'file', content: 'import React from "react";\nimport ReactDOM from "react-dom";\nimport App from "./App";\n\nReactDOM.render(<App />, document.getElementById("root"));' }
          ]
        },
        {
          path: 'public',
          type: 'directory',
          children: [
            { path: 'public/index.html', type: 'file', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Test App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>' }
          ]
        },
        { path: 'package.json', type: 'file', content: '{\n  "name": "test-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^17.0.0"\n  }\n}' }
      ],
      
      api: [
        {
          path: 'src',
          type: 'directory',
          children: [
            { path: 'src/routes', type: 'directory' },
            { path: 'src/models', type: 'directory' },
            { path: 'src/middleware', type: 'directory' },
            { path: 'src/app.ts', type: 'file', content: 'import express from "express";\n\nconst app = express();\n\napp.get("/", (req, res) => {\n  res.json({ message: "Hello API" });\n});\n\nexport default app;' }
          ]
        },
        { path: 'package.json', type: 'file', content: '{\n  "name": "test-api",\n  "version": "1.0.0",\n  "dependencies": {\n    "express": "^4.17.0"\n  }\n}' }
      ],
      
      cli: [
        {
          path: 'src',
          type: 'directory',
          children: [
            { path: 'src/commands', type: 'directory' },
            { path: 'src/utils', type: 'directory' },
            { path: 'src/cli.ts', type: 'file', content: '#!/usr/bin/env node\n\nconsole.log("Hello CLI");' }
          ]
        },
        { path: 'package.json', type: 'file', content: '{\n  "name": "test-cli",\n  "version": "1.0.0",\n  "bin": {\n    "test-cli": "./dist/cli.js"\n  }\n}' }
      ],
      
      library: [
        {
          path: 'src',
          type: 'directory',
          children: [
            { path: 'src/index.ts', type: 'file', content: 'export function hello(): string {\n  return "Hello Library";\n}' },
            { path: 'src/utils.ts', type: 'file', content: 'export function isString(value: unknown): value is string {\n  return typeof value === "string";\n}' }
          ]
        },
        { path: 'package.json', type: 'file', content: '{\n  "name": "test-library",\n  "version": "1.0.0",\n  "main": "dist/index.js"\n}' }
      ],
      
      mobile: [
        {
          path: 'src',
          type: 'directory',
          children: [
            { path: 'src/screens', type: 'directory' },
            { path: 'src/components', type: 'directory' },
            { path: 'src/navigation', type: 'directory' },
            { path: 'src/App.tsx', type: 'file', content: 'import React from "react";\nimport { View, Text } from "react-native";\n\nfunction App() {\n  return (\n    <View>\n      <Text>Hello Mobile</Text>\n    </View>\n  );\n}\n\nexport default App;' }
          ]
        },
        { path: 'package.json', type: 'file', content: '{\n  "name": "test-mobile",\n  "version": "1.0.0",\n  "dependencies": {\n    "react-native": "^0.64.0"\n  }\n}' }
      ]
    };

    return {
      name: `test-${type}-project`,
      type,
      files: structures[type],
      dependencies: type === 'web' ? ['react', 'typescript'] : 
                   type === 'api' ? ['express', 'typescript'] :
                   type === 'cli' ? ['commander', 'typescript'] :
                   type === 'library' ? ['typescript'] :
                   ['react-native', 'typescript']
    };
  }

  /**
   * Generate test scenarios for different use cases
   */
  public static generateTestScenarios(): Record<string, unknown> {
    return {
      // Happy path scenarios
      successful_validation: {
        input: this.generateSpec({ status: 'completed' }),
        expectedOutput: { isValid: true, issues: [], qualityScore: 95 }
      },
      
      successful_test_execution: {
        input: { acceptanceCriteria: ['Feature works correctly', 'No errors in console'] },
        expectedOutput: { passed: true, coverage: 85.5, failedTests: [] }
      },

      // Error scenarios  
      validation_failure: {
        input: this.generateSpec({ status: 'draft' }),
        expectedOutput: { isValid: false, issues: ['Missing implementation'], qualityScore: 45 }
      },
      
      test_failure: {
        input: { acceptanceCriteria: ['Feature works correctly'] },
        expectedOutput: { passed: false, coverage: 72.1, failedTests: ['Unit test failed'] }
      },

      // Edge cases
      empty_spec: {
        input: this.generateSpec({ tasks: [], acceptanceCriteria: [] }),
        expectedOutput: { isValid: false, issues: ['No tasks defined'], qualityScore: 20 }
      },
      
      large_spec: {
        input: this.generateSpec({ tasks: this.generateTasks(20, 50) }),
        expectedOutput: { isValid: true, issues: [], qualityScore: 80 }
      }
    };
  }

  /**
   * Generate realistic file content
   */
  public static generateFileContent(type: 'typescript' | 'javascript' | 'json' | 'markdown' | 'yaml'): string {
    const templates = {
      typescript: `
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class UserService {
  private users: User[] = [];

  public async createUser(userData: Partial<User>): Promise<User> {
    const user: User = {
      id: generateId(),
      email: userData.email || '',
      name: userData.name || '',
      createdAt: new Date()
    };
    
    this.users.push(user);
    return user;
  }

  public async findUser(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
      `.trim(),

      javascript: `
class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
}

module.exports = Calculator;
      `.trim(),

      json: JSON.stringify({
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package for mock data',
        scripts: {
          test: 'jest',
          build: 'tsc',
          start: 'node dist/index.js'
        },
        dependencies: {
          'typescript': '^4.5.0',
          'jest': '^27.0.0'
        }
      }, null, 2),

      markdown: `
# Test Documentation

This is a test markdown file for mock data generation.

## Features

- Feature 1: User authentication
- Feature 2: Real-time updates
- Feature 3: Data visualization

## Installation

\`\`\`bash
npm install test-package
\`\`\`

## Usage

\`\`\`typescript
import { TestClass } from 'test-package';

const instance = new TestClass();
instance.doSomething();
\`\`\`
      `.trim(),

      yaml: `
name: Test Workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      `.trim()
    };

    return templates[type];
  }
}

export default TestDataGenerator;