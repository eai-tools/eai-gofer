# Dagger TypeScript Quick Reference for SpecGofer

**Fast lookup guide for common Dagger patterns**

---

## Installation & Setup

```bash
# Create new Dagger module
dagger init --name=test-orchestration --sdk=typescript

# Install SDK
npm install @dagger.io/dagger

# Update package.json for ES modules
npm pkg set type=module

# Update tsconfig.json
# Set "module": "NodeNext"
```

---

## Core Container Operations

### Build Container with Cache

```typescript
const container = dag
  .container()
  .from('node:21')
  .withDirectory('/src', source)
  .withWorkdir('/src')
  .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache-node-21'))
  .withExec(['npm', 'ci']);
```

### Run Command and Capture Output

```typescript
// Get stdout
const output: string = await container
  .withExec(['npm', 'run', 'test'])
  .stdout();

// Get stderr
const errors: string = await container
  .withExec(['npm', 'run', 'test'])
  .stderr();

// Get exit code
const exitCode: number = await container
  .withExec(['npm', 'run', 'test'])
  .exitCode();
```

### Chain Multiple Commands

```typescript
const result = container
  .withExec(['npm', 'ci'])
  .withExec(['npm', 'run', 'compile'])
  .withExec(['npm', 'run', 'test']);
```

---

## Caching Patterns

### NPM Dependencies Cache

```typescript
.withMountedCache("/root/.npm", dag.cacheVolume("npm-cache-node-21"))
.withExec(["npm", "ci"])
```

### Yarn Cache

```typescript
.withMountedCache("/root/.yarn", dag.cacheVolume("yarn-cache"))
.withExec(["yarn", "install"])
```

### pnpm Cache

```typescript
.withMountedCache("/root/.pnpm-store", dag.cacheVolume("pnpm-cache"))
.withExec(["pnpm", "install"])
```

---

## File & Directory Operations

### Mount Directory (Read-Only)

```typescript
.withMountedDirectory("/src", source)
```

### Copy Directory (Persistent)

```typescript
.withDirectory("/src", source)
```

### Filter Directory Contents

```typescript
dag
  .container()
  .from('node:21')
  .withDirectory('/src', source, {
    include: ['package*.json', 'src/**', 'tsconfig.json'],
    exclude: ['node_modules', '.git'],
  });
```

### Return Directory

```typescript
@func()
async getDirectory(source: Directory): Promise<Directory> {
  const container = dag.container()
    .from("node:21")
    .withDirectory("/src", source)
    .withWorkdir("/src")
    .withExec(["npm", "ci"])

  return container.directory("/src")
}
```

### Return File

```typescript
@func()
async getFile(source: Directory): Promise<File> {
  const container = dag.container()
    .from("node:21")
    .withDirectory("/src", source)
    .withWorkdir("/src")
    .withExec(["npm", "ci"])
    .withExec(["npm", "run", "build"])

  return container.file("/src/dist/index.js")
}
```

---

## Test Execution Patterns

### Run Unit Tests

```typescript
@func()
async unitTests(source: Directory): Promise<string> {
  return dag
    .container()
    .from("node:21")
    .withDirectory("/src", source)
    .withWorkdir("/src")
    .withMountedCache("/root/.npm", dag.cacheVolume("npm-cache"))
    .withExec(["npm", "ci"])
    .withExec([
      "npm",
      "run",
      "test:unit",
      "--",
      "--reporter=json",
      "--outputFile=/tmp/results.json"
    ])
    .stdout()
}
```

### Parallel Test Execution

```typescript
@func()
async allTests(source: Directory): Promise<void> {
  const unit = this.unitTests(source)
  const integration = this.integrationTests(source)
  const lint = this.lintTests(source)

  // Run all in parallel
  await Promise.all([
    unit.then(() => {}),
    integration.then(() => {}),
    lint.then(() => {})
  ])
}
```

### Handle Failing Tests

```typescript
@func()
async robustTests(source: Directory): Promise<Directory> {
  const container = dag
    .container()
    .from("node:21")
    .withDirectory("/src", source)
    .withWorkdir("/src")
    .withMountedCache("/root/.npm", dag.cacheVolume("npm-cache"))
    .withExec(["npm", "ci"])
    .withExec(["mkdir", "-p", "/tmp/results"])

  // Run test and capture result, don't fail
  try {
    await container
      .withExec([
        "sh",
        "-c",
        "npm run test > /tmp/results/test.log 2>&1"
      ])
      .stdout()
  } catch {
    // Tests failed, but we continue to export logs
  }

  return container.directory("/tmp/results")
}
```

---

## Artifact Collection

### Export Directory to Host

```bash
dagger call myFunction export --path=./output-dir
```

### Export File to Host

```bash
dagger call getFile export --path=./output.json
```

### TypeScript: Return for Export

```typescript
@func()
async artifacts(source: Directory): Promise<Directory> {
  const container = /* ... */
  return container.directory("/tmp/results")
}
```

---

## Common Command Patterns

### Shell Commands

```typescript
.withExec(["sh", "-c", "command here"])
```

### Redirect Output

```typescript
.withExec(["sh", "-c", "npm test > output.log 2>&1"])
```

### Create Directory

```typescript
.withExec(["mkdir", "-p", "/tmp/results"])
```

### Copy Files

```typescript
.withExec(["cp", "-r", "/src/dist", "/tmp/dist"])
```

### Conditional Execution

```typescript
.withExec(["sh", "-c", "test -f file.txt && echo 'exists' || echo 'missing'"])
```

---

## Logging and Debugging

### Capture Full Output

```typescript
const output = await container.withExec(['npm', 'test']).stdout();

console.log(output);
```

### Debug Execution

```bash
# Use plain log format for detailed output
dagger call myFunc --source=. --log-format plain
```

### Inspect Container State

```typescript
const text = await container.withExec(['ls', '-la']).stdout();

const vars = await container.withExec(['env']).stdout();
```

---

## Function Composition

### Basic Function

```typescript
import { dag, object, func } from '@dagger.io/dagger';

@object()
class MyModule {
  @func()
  hello(): string {
    return 'Hello, World!';
  }
}
```

### Function with Arguments

```typescript
@func()
greet(name: string, greeting: string = "Hello"): string {
  return `${greeting}, ${name}!`
}
```

### Function Returning Container

```typescript
@func()
buildEnv(source: Directory): Container {
  return dag
    .container()
    .from("node:21")
    .withDirectory("/src", source)
}
```

### Function Returning Directory

```typescript
@func()
async artifacts(source: Directory): Promise<Directory> {
  const container = this.buildEnv(source)
  return container.directory("/tmp/results")
}
```

### Function Returning File

```typescript
@func()
async output(source: Directory): Promise<File> {
  const container = this.buildEnv(source)
  return container.file("/tmp/output.json")
}
```

---

## CLI Usage

### List Available Functions

```bash
dagger functions
```

### Call Function with Arguments

```bash
dagger call functionName --arg1=value1 --arg2=value2
```

### Call with Directory

```bash
dagger call process --source=.
```

### Interactive Call

```bash
dagger call myFunc --source=. --interactive
```

---

## Performance Tips

| Task               | Optimization                                 |
| ------------------ | -------------------------------------------- |
| **Slow deps**      | Use `withMountedCache()` for `/root/.npm`    |
| **Large uploads**  | Use `include` filter on directory            |
| **Repeated steps** | Return from function for reuse               |
| **Parallel tests** | Use `Promise.all()` for concurrent execution |
| **First run slow** | Layer caching helps 2nd+ runs automatically  |

---

## Common Issues & Solutions

| Issue                     | Solution                                       |
| ------------------------- | ---------------------------------------------- |
| **Cache not working**     | Verify cache volume name matches across calls  |
| **Files not exported**    | Create directory/file before potential errors  |
| **Slow first run**        | Normal - layer caching helps 2nd run           |
| **Permission denied**     | Use container entry point, not shell directly  |
| **Node version mismatch** | Use consistent `from()` image in all functions |
| **Tests timeout**         | Increase default timeout with `--timeout`      |

---

## Complete Minimal Example

```typescript
import { dag, object, func, Directory, Container } from '@dagger.io/dagger';

@object()
class TestModule {
  @func()
  build(source: Directory): Container {
    return dag
      .container()
      .from('node:21')
      .withDirectory('/src', source)
      .withWorkdir('/src')
      .withMountedCache('/root/.npm', dag.cacheVolume('npm-cache'))
      .withExec(['npm', 'ci']);
  }

  @func()
  test(source: Directory): string {
    return this.build(source).withExec(['npm', 'run', 'test']).stdout();
  }

  @func()
  lint(source: Directory): string {
    return this.build(source).withExec(['npm', 'run', 'lint']).stdout();
  }
}
```

### Usage:

```bash
# Initialize
dagger init --name=tests --sdk=typescript

# Run tests
dagger call test --source=.

# Run linting
dagger call lint --source=.
```

---

## Links

- [Dagger Docs](https://docs.dagger.io)
- [TypeScript SDK Ref](https://docs.dagger.io/reference/typescript/)
- [Module Tests](https://docs.dagger.io/api/module-tests/)
- [Cache Volumes](https://docs.dagger.io/manuals/developer/cache-volumes/)
