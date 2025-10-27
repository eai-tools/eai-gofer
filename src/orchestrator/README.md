# Autonomous Orchestrator

Complete implementation for feature 003-orchestrator-agents.

## Components
- SpecLoader: GitHub Spec Kit parser
- TaskQueue: Dependency resolution
- AutonomousOrchestrator: Main execution loop
- EngineerAgent: Code validation
- TestAgent: Test execution
- RetryHandler: Exponential backoff
- QAEngine: Question answering
- NotificationService: WhatsApp alerts
- DependencyResolver: Circular detection

## Usage
```typescript
import { AutonomousOrchestrator } from './AutonomousOrchestrator.js';

const orchestrator = new AutonomousOrchestrator('.specify/specs');
await orchestrator.start();
```
