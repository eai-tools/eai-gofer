# Quick Start: Dagger Test Orchestration

**Feature**: Dagger Test Orchestration for SpecGofer **Version**: 1.0.0 **Time
to First Test**: ~10 minutes

## Prerequisites

Before starting, ensure you have:

- Node.js 20.x or later
- Docker Desktop or compatible container runtime
- Dagger CLI (will be installed if missing)
- Git repository with SpecGofer project

## Installation

### Step 1: Install Dependencies

```bash
# From the SpecGofer root directory
cd test-infrastructure/dagger
npm install

# Install Dagger CLI globally (if not already installed)
npm install -g @dagger.io/dagger
```

### Step 2: Verify Installation

```bash
# Check Dagger is working
dagger version

# Check Docker is running
docker version

# Run installation test
npm run test:install
```

## Running Your First Test

### Local Development

#### Quick Test (5 minutes)

Run a subset of tests to verify setup:

```bash
# Run unit tests only
npm run test:unit

# Run specific test suite
npm run test:suite -- extension-commands

# Run with visible progress
npm run test:unit -- --progress
```

#### Full Regression Test (20 minutes)

Run the complete test suite:

```bash
# Run all tests with default configuration
npm run test:regression

# Run with custom parameters
npm run test:regression -- \
  --parallel \
  --max-concurrency 10 \
  --branch main
```

#### VSCode Extension Tests

Test the extension in a containerized VSCode:

```bash
# Run extension tests with Xvfb
npm run test:extension

# Run specific extension test file
npm run test:extension -- --test "**/commands.test.js"

# Run with debugging output
npm run test:extension -- --verbose
```

### CI/CD Integration

#### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Dagger Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: |
          cd test-infrastructure/dagger
          npm ci

      - name: Run Dagger Tests
        run: |
          cd test-infrastructure/dagger
          npm run test:ci
        env:
          DAGGER_CLOUD_TOKEN: ${{ secrets.DAGGER_CLOUD_TOKEN }}
```

#### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
test:dagger:
  image: node:20
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  script:
    - cd test-infrastructure/dagger
    - npm ci
    - npm run test:ci
```

#### Local CI Simulation

Test CI behavior locally:

```bash
# Simulate CI environment
npm run test:ci:local

# With specific pipeline
npm run test:ci:local -- --pipeline regression
```

## AI Agent Usage

### Using Claude with MCP

The test suite exposes MCP tools for Claude:

```typescript
// Claude can use these tools automatically
await specgofer_run_tests({
  pipeline: 'regression',
  branch: 'feature-branch',
  parallel: true,
});

// Get results
const results = await specgofer_get_test_results({
  executionId: 'uuid-here',
});
```

### Programmatic API

For custom AI agents:

```typescript
import { DaggerTestClient } from './test-infrastructure/dagger';

const client = new DaggerTestClient();

// Start test execution
const execution = await client.executePipeline('regression', {
  branch: 'main',
  testFilter: '**/*.test.ts',
  parallel: true,
});

// Stream progress
const stream = client.streamProgress(execution.id);
stream.on('progress', (data) => {
  console.log(`Progress: ${data.percentage}%`);
});

// Get results when complete
const results = await client.getResults(execution.id);
console.log(`Tests passed: ${results.summary.passed}/${results.summary.total}`);
```

### CLI for AI Agents

AI agents can use the CLI interface:

```bash
# Execute with JSON output
npx specgofer-test run --json --pipeline regression

# Parse results
npx specgofer-test results <execution-id> --format json

# Stream progress
npx specgofer-test stream <execution-id>
```

## Common Scenarios

### Testing a Feature Branch

```bash
# Switch to feature branch
git checkout feature/my-feature

# Run tests against this branch
npm run test:regression -- --branch feature/my-feature

# Run only affected tests
npm run test:affected
```

### Testing After Code Changes

```bash
# Run tests affected by recent changes
npm run test:affected -- --since main

# Run tests for specific components
npm run test:component -- extension
npm run test:component -- language-server
```

### Debugging Failed Tests

```bash
# Run single test with debugging
npm run test:debug -- path/to/test.spec.ts

# Access container for failed test
npm run test:shell -- <execution-id>

# View logs for failed test
npm run test:logs -- <execution-id>
```

### Performance Testing

```bash
# Run with performance profiling
npm run test:performance

# Generate performance report
npm run test:regression -- --profile --report performance.html
```

## Configuration

### Basic Configuration

Create `dagger.config.json`:

```json
{
  "defaultPipeline": "regression",
  "parallel": true,
  "maxConcurrency": 5,
  "cache": {
    "enabled": true,
    "volumes": ["node_modules", ".npm"]
  },
  "artifacts": {
    "path": "./test-artifacts",
    "retain": 7
  }
}
```

### Environment Variables

```bash
# Dagger Cloud (optional, for distributed caching)
export DAGGER_CLOUD_TOKEN=your-token-here

# Test configuration
export TEST_PARALLEL=true
export TEST_TIMEOUT=1200
export TEST_RETRY_COUNT=3

# VSCode testing
export VSCODE_VERSION=stable
export VSCODE_DISPLAY=:99
```

### Pipeline Customization

Create custom pipeline in `pipelines/custom.ts`:

```typescript
import { Container, Pipeline } from '@dagger.io/dagger';

export function customPipeline(): Pipeline {
  return dag
    .pipeline('custom')
    .withStage('setup', setupContainer)
    .withStage('test', testContainer)
    .withStage('report', reportContainer);
}
```

## Troubleshooting

### Common Issues

#### Docker not running

```bash
# Start Docker Desktop or
sudo systemctl start docker

# Verify
docker ps
```

#### Xvfb issues in containers

```bash
# Manually start Xvfb
Xvfb :99 -screen 0 1024x768x24 &
export DISPLAY=:99

# Or use xvfb-run
xvfb-run -a npm test
```

#### Cache issues

```bash
# Clear Dagger cache
dagger cache prune

# Clear specific cache
npm run test:clear-cache
```

#### Timeout issues

```bash
# Increase timeout
npm run test:regression -- --timeout 3600

# Or set in config
export TEST_TIMEOUT=3600
```

### Getting Help

```bash
# Show available commands
npm run test:help

# Show pipeline configuration
npm run test:info -- --pipeline regression

# Generate diagnostic report
npm run test:diagnose
```

## Performance Tips

### Speed Up Tests

1. **Enable caching** (60-80% faster):

   ```bash
   npm run test:regression -- --cache
   ```

2. **Use Dagger Cloud** (2-10x faster):

   ```bash
   export DAGGER_CLOUD_TOKEN=your-token
   npm run test:regression
   ```

3. **Run in parallel** (40% faster):

   ```bash
   npm run test:regression -- --parallel --max-concurrency 10
   ```

4. **Filter tests**:

   ```bash
   # Run only critical tests
   npm run test:regression -- --tag critical

   # Skip slow tests
   npm run test:regression -- --skip-slow
   ```

### Monitoring

View real-time metrics:

```bash
# Start monitoring dashboard
npm run test:monitor

# View in browser
open http://localhost:3001
```

## Next Steps

1. **Customize pipelines**: See `test-infrastructure/dagger/pipelines/`
2. **Add test data**: Place in `.specify/test-data/`
3. **Configure CI/CD**: Use provided workflow templates
4. **Enable notifications**: Configure in `dagger.config.json`
5. **Set up Dagger Cloud**: For distributed caching and faster builds

## Resources

- [Dagger Documentation](https://docs.dagger.io)
- [VSCode Test API](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [SpecGofer Testing Guide](./docs/TESTING_GUIDE.md)
- [AI Agent Integration](./contracts/ai-agent-api.openapi.yaml)

## Support

For issues or questions:

- Create an issue in the SpecGofer repository
- Check the [FAQ](./docs/FAQ.md)
- Review test logs in `./test-artifacts/`
