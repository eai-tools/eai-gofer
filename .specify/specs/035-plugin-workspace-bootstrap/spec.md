---
id: 035-plugin-workspace-bootstrap
title: Plugin Workspace Bootstrap
status: validated
created: 2026-05-28
priority: high
classification: non-application platform tooling
---

# Feature Specification: Plugin Workspace Bootstrap

## Overview

Add plugin-side workspace preflight and bootstrap support so Claude, Codex,
Copilot, and Gemini can safely use Gofer in repos that have not yet been
initialized by the VS Code extension.

This feature must also reduce the duplicate-feeling Codex picker experience by
keeping Codex on the plain command surface plus an umbrella skill, instead of
showing both commands and the full stage skill tree as separate picker entries.

## User Stories

### US1: Plugin User Gets Quiet Repo Health Checks

As a plugin user, I want Gofer stage/helper commands to quietly verify the repo
scaffold before work begins so I only get interrupted when something is missing
or stale.

### US2: Plugin User Can Initialize Or Update A Repo

As a plugin user, I want one bootstrap helper that can create or update the
repo-owned Gofer scaffold from the installed bundle or public bundle so I can
use Gofer without opening VS Code first.

### US3: Codex User Sees One Clean Entry Surface

As a Codex user, I want to see the plain Gofer command entrypoints without
duplicate-looking namespaced stage skills so the picker is understandable.

## Functional Requirements

- FR-001: Add `gofer:check-workspace` as a read-only helper command.
- FR-002: Add `gofer:bootstrap-workspace` as a mutating helper command.
- FR-003: Add portable Node scripts for workspace checking and bootstrapping.
- FR-004: Preflight every stage/helper command except pure session controls and
  the two new workspace helpers.
- FR-005: If the repo is missing or stale, ask exactly: "This repo is missing or
  stale for Gofer. Initialize/update it now?"
- FR-006: If the user accepts, run bootstrap and resume the original command
  from the top.
- FR-007: The preflight must check the exact sentinel set defined in research.
- FR-008: The bootstrap must create/update the core `.specify/commands`,
  `.specify/templates`, `.specify/scripts/{bash,node,hooks,powershell}`,
  `.specify/specs`, `.specify/memory`, `.specify/.gofer-version`,
  `.specify/README.md`, and Gofer runtime `.gitignore` entries.
- FR-009: Host-specific repo-owned files must be created only when relevant:
  Claude (`AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`), Codex
  (`AGENTS.md`), Copilot (`.github/copilot-instructions.md`), Gemini (none).
- FR-010: Existing `AGENTS.md`, `CLAUDE.md`, and
  `.github/copilot-instructions.md` must not be overwritten by default.
- FR-011: Repo-local assistant mirrors remain optional behind an explicit
  `--include-mirrors` bootstrap flag.
- FR-012: Codex-facing manifests must use the umbrella skill surface so the
  picker no longer shows both plain commands and full per-stage skill entries.

## Non-Functional Requirements

- NFR-001: The workspace check path must be read-only.
- NFR-002: Bootstrap must preserve existing `.specify/specs/*` and
  `.specify/memory/constitution.md`.
- NFR-003: Generated surfaces must stay in parity across Claude, Copilot,
  Codex-skill, Gemini, and packaged plugin outputs.
- NFR-004: Codex canonical description budget must remain within the existing
  2048-byte cumulative limit.
- NFR-005: Public plugin packaging must continue to work for Claude, Codex,
  Copilot, Gemini, and VS Code release surfaces.

## Out Of Scope

- Reproducing VS Code-only UI features, status bars, or side panels.
- Making repo-local mirrors the default bootstrap output.
- Replacing `gofer.initialize` inside the VS Code extension.
