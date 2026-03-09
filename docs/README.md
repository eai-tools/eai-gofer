<div class="hero-section">
  <h1>Gofer</h1>
  <p>Spec-driven development for AI. Let Claude Code and GitHub Copilot autonomously implement features from specifications.</p>
  <div class="hero-buttons">
    <a href="#/quickstart" class="hero-btn hero-btn-primary">Get Started</a>
    <a href="/gofer/releases.html" class="hero-btn hero-btn-secondary">Download Latest</a>
  </div>
</div>

## What is Gofer?

Gofer is a VS Code extension that enables AI assistants to autonomously
implement software features from specifications. It provides a structured
6-stage pipeline that guides AI through research, specification, planning, task
breakdown, implementation, and validation.

**One command to rule them all:**

```text
/0_business_scenario Add user authentication with OAuth2 and JWT
```

This single command automatically chains through all 6 pipeline stages,
producing production-ready code with full traceability from requirements to
implementation.

<div class="features">
  <div class="feature-card">
    <h3>6-Stage Pipeline</h3>
    <p>Research, Specify, Plan, Tasks, Implement, Validate. Each stage produces artifacts that feed the next, ensuring nothing is missed.</p>
  </div>
  <div class="feature-card">
    <h3>Works with Claude Code & Copilot</h3>
    <p>Identical commands work in both Claude Code and GitHub Copilot. Use the same pipeline regardless of your AI assistant.</p>
  </div>
  <div class="feature-card">
    <h3>MCP-Native</h3>
    <p>Exposes 6 MCP tools that AI assistants call directly through VS Code's native Model Context Protocol support.</p>
  </div>
  <div class="feature-card">
    <h3>Multi-Agent Architecture</h3>
    <p>Parallel research agents explore your codebase simultaneously. Optional LLM Council mode uses multiple AI providers for consensus.</p>
  </div>
  <div class="feature-card">
    <h3>Quality Validation</h3>
    <p>10-category engineering rubric scored out of 100 points. Six specialist validation agents run in parallel to catch issues.</p>
  </div>
  <div class="feature-card">
    <h3>Session Management</h3>
    <p>Save and resume work across sessions. Context health monitoring prevents accuracy degradation from large context windows.</p>
  </div>
</div>

## The Pipeline

```text
/0_business_scenario                          (entry point)
    |
    v
/1_gofer_research    --> research.md          (codebase exploration)
    |
    v
/2_gofer_specify     --> spec.md              (feature specification)
    |
    v
/3_gofer_plan        --> plan.md              (technical architecture)
    |
    v
/4_gofer_tasks       --> tasks.md             (task breakdown)
    |
    v
/5_gofer_implement   --> source code          (implementation)
    |
    v
/6_gofer_validate    --> validation-report.md  (quality verification)
```

[Learn more about the pipeline](pipeline/README.md)

<div class="release-card" id="latestRelease">
  <h3>Latest Release</h3>
  <p>Loading...</p>
</div>

---

_Enterprise AI Pty Ltd. All rights reserved._
