# Global Coding Standards

This file contains coding standards that apply to all code in this project.

## TypeScript Standards

- Use strict TypeScript mode (`strict: true`)
- No `any` types - use `unknown` or proper types
- All functions must have explicit return types
- Prefer interfaces over type aliases for object types
- Use ES6 imports, never `require()`

## Code Organization

- Maximum file size: 300 lines
- Maximum function complexity: 20 cyclomatic complexity
- One export per file (exceptions: utility modules)
- Barrel exports prohibited (for tree-shaking)

## Testing

- Minimum 80% code coverage
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/`
- Use TDD approach: tests first, then implementation

## Documentation

- JSDoc comments for all public APIs
- Include `@param`, `@returns`, `@throws` annotations
- Examples in JSDoc for complex functions
- Keep comments focused on "why", not "what"

## Security

- Never commit secrets or credentials
- Sanitize all user inputs
- Use parameterized queries for database access
- Validate all external data with JSON schema
- Follow OWASP Top 10 guidelines

## Performance

- Avoid premature optimization
- Profile before optimizing
- Target <100ms for UI operations
- Target <1s for data operations
- Use async/await for I/O operations
