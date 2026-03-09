#!/bin/bash

# Generate PR Description using Codex or Claude CLI
# Usage:
#   ./generate-pr-description.sh
#   ./generate-pr-description.sh main
#   ./generate-pr-description.sh --base main --provider codex

set -euo pipefail

usage() {
  cat <<'USAGE'
Generate PR description from git metadata.

Usage:
  ./generate-pr-description.sh [base_branch]
  ./generate-pr-description.sh [base_branch] [provider]
  ./generate-pr-description.sh --base <branch> --provider <auto|codex|claude>

Options:
  -b, --base       Base branch to compare against (default: main)
  -p, --provider   AI provider: auto | codex | claude (default: auto)
  -h, --help       Show this help

Environment:
  PR_DESC_PROVIDER   Default provider override (auto|codex|claude)
USAGE
}

BASE_BRANCH="main"
PROVIDER="${PR_DESC_PROVIDER:-auto}"
POSITIONAL_BASE_SET=0
POSITIONAL_PROVIDER_SET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--base)
      BASE_BRANCH="${2:-}"
      if [[ -z "$BASE_BRANCH" ]]; then
        echo "Error: --base requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    -p|--provider)
      PROVIDER="${2:-}"
      if [[ -z "$PROVIDER" ]]; then
        echo "Error: --provider requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Error: Unknown option '$1'" >&2
      usage
      exit 1
      ;;
    *)
      if [[ "$POSITIONAL_BASE_SET" -eq 0 ]]; then
        BASE_BRANCH="$1"
        POSITIONAL_BASE_SET=1
      elif [[ "$POSITIONAL_PROVIDER_SET" -eq 0 ]] && [[ "$PROVIDER" == "auto" ]]; then
        PROVIDER="$1"
        POSITIONAL_PROVIDER_SET=1
      else
        echo "Error: Unexpected argument '$1'" >&2
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

# Get current branch
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

echo "Comparing against: $BASE_BRANCH"
echo "Provider: $PROVIDER"

# Check if we have commits ahead of base
COMMITS_AHEAD=$(git rev-list --count "$BASE_BRANCH".."$BRANCH" 2>/dev/null || echo "0")
if [ "$COMMITS_AHEAD" = "0" ]; then
  echo "Error: No commits ahead of $BASE_BRANCH"
  exit 1
fi
echo "Commits ahead: $COMMITS_AHEAD"
echo ""

# Get diff (limited to 50KB)
RAW_DIFF="$(git diff "$BASE_BRANCH"..."$BRANCH")"
DIFF="${RAW_DIFF:0:50000}"

# Get commit messages (limited to 50 entries)
COMMITS="$(git log -n 50 "$BASE_BRANCH".."$BRANCH" --pretty=format:"%s")"

# Get changed files
FILES=$(git diff "$BASE_BRANCH"..."$BRANCH" --name-only)

# Build the prompt
PROMPT="Based on this git info, fill out the PR template below. Be concise and factual. Extract ticket from branch name if possible (e.g., feat/JIRA-123 -> JIRA-123). Output ONLY the filled template.

WORKING DIRECTORY: $(pwd)
IMPORTANT:
- Use only the git metadata provided below.
- Do not assume any file path outside this repository.

BRANCH: $BRANCH

COMMITS:
$COMMITS

FILES CHANGED:
$FILES

DIFF:
$DIFF

TEMPLATE TO FILL:
## 1. Summary

**Related ticket(s)**
_e.g. JIRA-123, GITHUB-45. Write \"N/A\" only if there truly is no ticket._
-

**What is being delivered for these ticket(s)? (1–3 bullets)**
-

---

## 2. Scope

**Included in this PR**
-

**Not included (out of scope / future work)**
-

---

## 3. Approach & Decisions

**High-level approach (1–3 bullets)**
-

**Key decisions & trade-offs (if any)**
- Decision:
- Why this choice:
- Trade-offs / alternatives:

---

## 4. Impact & Risks

**Impact**
- User / business impact:
- System impact (performance, security, data, integrations):

**Risks / edge cases to be aware of**
-

---

## 5. Testing

**How was this tested?**
- [ ] Unit tests
- [ ] Integration / API tests
- [ ] Manual testing
- [ ] Not tested (explain why):

Details (test cases / scenarios):
-

---

## 6. Notes for Reviewers (optional)

Anything you want reviewers to focus on or skip:
-"

run_with_claude() {
  # Disable tools for this summarization-only task to avoid path/tool side effects.
  echo "$PROMPT" | claude -p --output-format text --tools ""
}

run_with_codex() {
  local output_file stderr_file
  output_file="$(mktemp -t pr_desc_codex_output.XXXXXX)"
  stderr_file="$(mktemp -t pr_desc_codex_stderr.XXXXXX)"

  if ! echo "$PROMPT" | codex exec - --cd "$(pwd)" -o "$output_file" > /dev/null 2> "$stderr_file"; then
    cat "$stderr_file" >&2
    rm -f "$output_file" "$stderr_file"
    return 1
  fi

  if [[ ! -s "$output_file" ]]; then
    cat "$stderr_file" >&2
    rm -f "$output_file" "$stderr_file"
    return 1
  fi

  cat "$output_file"
  rm -f "$output_file" "$stderr_file"
}

resolve_provider() {
  case "$PROVIDER" in
    auto)
      if command -v codex >/dev/null 2>&1; then
        echo "codex"
      elif command -v claude >/dev/null 2>&1; then
        echo "claude"
      else
        echo "none"
      fi
      ;;
    codex|claude)
      echo "$PROVIDER"
      ;;
    *)
      echo "invalid"
      ;;
  esac
}

ACTIVE_PROVIDER="$(resolve_provider)"

if [[ "$ACTIVE_PROVIDER" == "invalid" ]]; then
  echo "Error: Invalid provider '$PROVIDER'. Use: auto | codex | claude" >&2
  exit 1
fi

if [[ "$ACTIVE_PROVIDER" == "none" ]]; then
  echo "Error: Neither 'codex' nor 'claude' CLI is available in PATH." >&2
  exit 1
fi

if [[ "$ACTIVE_PROVIDER" == "codex" ]] && ! command -v codex >/dev/null 2>&1; then
  echo "Error: Provider 'codex' requested but codex CLI not found." >&2
  exit 1
fi

if [[ "$ACTIVE_PROVIDER" == "claude" ]] && ! command -v claude >/dev/null 2>&1; then
  echo "Error: Provider 'claude' requested but claude CLI not found." >&2
  exit 1
fi

DESCRIPTION=""
if [[ "$ACTIVE_PROVIDER" == "codex" ]]; then
  echo "Generating PR description with Codex..."
  echo ""
  echo "=========================================="
  echo ""
  if ! DESCRIPTION="$(run_with_codex)"; then
    if [[ "$PROVIDER" == "auto" ]] && command -v claude >/dev/null 2>&1; then
      echo ""
      echo "Codex failed, falling back to Claude..."
      echo ""
      echo "=========================================="
      echo ""
      DESCRIPTION="$(run_with_claude)"
    else
      echo "Error: Failed to generate PR description with Codex." >&2
      exit 1
    fi
  fi
else
  echo "Generating PR description with Claude..."
  echo ""
  echo "=========================================="
  echo ""
  if ! DESCRIPTION="$(run_with_claude)"; then
    if [[ "$PROVIDER" == "auto" ]] && command -v codex >/dev/null 2>&1; then
      echo ""
      echo "Claude failed, falling back to Codex..."
      echo ""
      echo "=========================================="
      echo ""
      DESCRIPTION="$(run_with_codex)"
    else
      echo "Error: Failed to generate PR description with Claude." >&2
      exit 1
    fi
  fi
fi

echo "$DESCRIPTION"
echo ""
echo "=========================================="

# Copy to clipboard if pbcopy is available (macOS)
if command -v pbcopy &> /dev/null; then
  echo "$DESCRIPTION" | pbcopy
  echo "Copied to clipboard!"
fi
