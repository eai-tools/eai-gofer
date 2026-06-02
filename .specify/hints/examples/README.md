# Example Hint Files

This directory contains example hint templates for common patterns. Use these as
starting points for creating your own contextual guidance.

## Available Examples

### General Patterns

- **[testing-pattern.yaml](./testing-pattern.yaml)** - Testing best practices
  with TDD, Vitest, and mocking
- **[error-handling.yaml](./error-handling.yaml)** - Error handling patterns
  with custom errors and logging
- **[typescript-patterns.yaml](./typescript-patterns.yaml)** - TypeScript best
  practices and type system usage
- **[logging-pattern.yaml](./logging-pattern.yaml)** - Structured logging with
  EAI Gofer Logger

## How to Use

1. **Copy example to appropriate directory**:

   ```bash
   # For general hints
   cp .specify/hints/examples/testing-pattern.yaml .specify/hints/general/

   # For spec-specific hints
   cp .specify/hints/examples/error-handling.yaml .specify/hints/spec-specific/001-my-feature/
   ```

2. **Customize the context**:
   - Set `applies_to` to target specific specs
   - Add `task_pattern` to match task IDs (regex supported)
   - Adjust `priority` (1-5 for general, 6-10 for specific)

3. **Update the guidance**:
   - Write actionable guidance (markdown supported)
   - Include code examples
   - Link to resources

4. **Reload hints in EAI Gofer**:
   ```
   Cmd+Shift+P → Gofer: Reload Hints
   ```

## Hint File Structure

```yaml
context:
  applies_to: ['*'] # Spec IDs or '*' for all
  task_pattern: 'T[0-9]+' # Optional: Regex for task IDs
  phases: ['implementation'] # Optional: Phases
  priority: 5 # 1-10 (higher = more important)

guidance: |
  Your guidance text here (markdown supported)

examples:
  - |
    // Code example 1
  - |
    // Code example 2

resources:
  - title: 'Resource Title'
    url: 'https://example.com'

metadata:
  author: 'Your Name'
  created: '2025-11-01'
  version: '1.0.0'
```

## Best Practices

- **Keep hints focused**: One concept per file
- **Use priority wisely**: General=1-5, Specific=6-10
- **Provide examples**: Code is clearer than prose
- **Link resources**: Help users learn more
- **Version control**: Commit hints to git
- **Update regularly**: Keep hints current with learnings

## More Information

See
[Memory & Learning System Documentation](../../../docs/memory-learning-system.md)
for complete usage guide.
