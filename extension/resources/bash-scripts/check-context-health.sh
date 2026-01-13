#!/usr/bin/env bash
# check-context-health.sh - Estimate context window usage and warn at thresholds
#
# Usage: ./check-context-health.sh [OPTIONS]
#
# Options:
#   --json              Output in JSON format
#   --threshold N       Set warning threshold percentage (default: 50)
#   --limit N           Set context limit in tokens (default: 200000)
#   --help              Show this help message
#
# Context Estimation:
#   - Characters / 4 = approximate tokens (conservative estimate)
#   - Counts: spec.md, plan.md, tasks.md, contracts/, research.md
#   - Also counts recently modified source files
#
# Part of the SpecGofer context management system (Gap 1).

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
JSON_OUTPUT=false
WARNING_THRESHOLD=50  # Warn at 50%
CRITICAL_THRESHOLD=70 # Critical at 70%
CONTEXT_LIMIT=200000  # Default Claude context (200K tokens)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --threshold)
            WARNING_THRESHOLD="$2"
            shift 2
            ;;
        --limit)
            CONTEXT_LIMIT="$2"
            shift 2
            ;;
        --help)
            head -20 "$0" | grep "^#" | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Get repository info
REPO_ROOT=$(get_repo_root)
eval "$(get_feature_paths)"

# Token estimation: characters / 4 (conservative)
estimate_tokens() {
    local chars="$1"
    echo $((chars / 4))
}

# Get file size in characters
get_file_chars() {
    local file="$1"
    if [[ -f "$file" ]]; then
        wc -c < "$file" | tr -d ' '
    else
        echo 0
    fi
}

# Get directory size in characters
get_dir_chars() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        find "$dir" -type f -name "*.md" -o -name "*.yaml" -o -name "*.json" 2>/dev/null | \
            xargs cat 2>/dev/null | wc -c | tr -d ' '
    else
        echo 0
    fi
}

# Calculate spec artifacts size
calculate_spec_context() {
    local total=0

    # Feature specification artifacts
    local spec_chars=$(get_file_chars "$FEATURE_SPEC")
    local plan_chars=$(get_file_chars "$IMPL_PLAN")
    local tasks_chars=$(get_file_chars "$TASKS")
    local research_chars=$(get_file_chars "$RESEARCH")
    local data_model_chars=$(get_file_chars "$DATA_MODEL")
    local quickstart_chars=$(get_file_chars "$QUICKSTART")
    local contracts_chars=$(get_dir_chars "$CONTRACTS_DIR")

    total=$((spec_chars + plan_chars + tasks_chars + research_chars + data_model_chars + quickstart_chars + contracts_chars))

    echo "$total"
}

# Calculate recently modified source files
calculate_source_context() {
    local total=0

    # Get recently modified source files (last 24 hours or last 10 commits)
    if has_git; then
        # Files modified in last 10 commits
        local recent_files=$(git diff --name-only HEAD~10 HEAD 2>/dev/null || echo "")

        for file in $recent_files; do
            if [[ -f "$REPO_ROOT/$file" ]]; then
                local chars=$(get_file_chars "$REPO_ROOT/$file")
                total=$((total + chars))
            fi
        done
    fi

    echo "$total"
}

# Calculate CLAUDE.md and agent files
calculate_system_context() {
    local total=0

    # CLAUDE.md
    if [[ -f "$REPO_ROOT/CLAUDE.md" ]]; then
        total=$((total + $(get_file_chars "$REPO_ROOT/CLAUDE.md")))
    fi

    # AGENTS.md
    if [[ -f "$REPO_ROOT/AGENTS.md" ]]; then
        total=$((total + $(get_file_chars "$REPO_ROOT/AGENTS.md")))
    fi

    echo "$total"
}

# Main calculation
main() {
    # Calculate sizes
    local spec_chars=$(calculate_spec_context)
    local source_chars=$(calculate_source_context)
    local system_chars=$(calculate_system_context)
    local total_chars=$((spec_chars + source_chars + system_chars))

    # Estimate tokens
    local spec_tokens=$(estimate_tokens $spec_chars)
    local source_tokens=$(estimate_tokens $source_chars)
    local system_tokens=$(estimate_tokens $system_chars)
    local total_tokens=$(estimate_tokens $total_chars)

    # Calculate percentages
    local usage_percent=$((total_tokens * 100 / CONTEXT_LIMIT))
    local warning_threshold_tokens=$((CONTEXT_LIMIT * WARNING_THRESHOLD / 100))
    local critical_threshold_tokens=$((CONTEXT_LIMIT * CRITICAL_THRESHOLD / 100))

    # Determine status
    local status="healthy"
    local recommendation=""

    if [[ $total_tokens -gt $critical_threshold_tokens ]]; then
        status="critical"
        recommendation="Start new session with handoff summary. Context is at risk of overflow."
    elif [[ $total_tokens -gt $warning_threshold_tokens ]]; then
        status="warning"
        recommendation="Consider running /compact before continuing. Save important decisions to session-handoff.md."
    else
        recommendation="Context is healthy. Continue working normally."
    fi

    # Output
    if $JSON_OUTPUT; then
        cat <<EOF
{
  "status": "$status",
  "totalTokens": $total_tokens,
  "contextLimit": $CONTEXT_LIMIT,
  "usagePercent": $usage_percent,
  "breakdown": {
    "specArtifacts": $spec_tokens,
    "sourceFiles": $source_tokens,
    "systemFiles": $system_tokens
  },
  "thresholds": {
    "warning": $WARNING_THRESHOLD,
    "critical": $CRITICAL_THRESHOLD
  },
  "recommendation": "$recommendation"
}
EOF
    else
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "  Context Health Check"
        echo "═══════════════════════════════════════════════════════════"
        echo ""

        # Status indicator
        case $status in
            healthy)
                echo -e "  Status: ${GREEN}HEALTHY${NC}"
                ;;
            warning)
                echo -e "  Status: ${YELLOW}WARNING${NC}"
                ;;
            critical)
                echo -e "  Status: ${RED}CRITICAL${NC}"
                ;;
        esac

        echo ""
        echo "  Context Usage: $total_tokens / $CONTEXT_LIMIT tokens ($usage_percent%)"
        echo ""

        # Progress bar
        local bar_width=40
        local filled=$((usage_percent * bar_width / 100))
        local empty=$((bar_width - filled))

        printf "  ["
        if [[ $status == "critical" ]]; then
            printf "${RED}"
        elif [[ $status == "warning" ]]; then
            printf "${YELLOW}"
        else
            printf "${GREEN}"
        fi

        for ((i=0; i<filled; i++)); do printf "█"; done
        printf "${NC}"
        for ((i=0; i<empty; i++)); do printf "░"; done
        printf "] %d%%\n" $usage_percent

        echo ""
        echo "  Breakdown:"
        echo "    Spec artifacts:  $(printf "%6d" $spec_tokens) tokens"
        echo "    Source files:    $(printf "%6d" $source_tokens) tokens"
        echo "    System files:    $(printf "%6d" $system_tokens) tokens"
        echo "    ─────────────────────────────"
        echo "    Total:           $(printf "%6d" $total_tokens) tokens"
        echo ""

        # Thresholds
        echo "  Thresholds:"
        echo -e "    ${YELLOW}Warning${NC}:  ${warning_threshold_tokens} tokens (${WARNING_THRESHOLD}%)"
        echo -e "    ${RED}Critical${NC}: ${critical_threshold_tokens} tokens (${CRITICAL_THRESHOLD}%)"
        echo ""

        echo "  Recommendation:"
        echo "    $recommendation"
        echo ""

        if [[ $status == "warning" ]] || [[ $status == "critical" ]]; then
            echo "  Actions to take:"
            echo "    1. Run /compact to reduce context"
            echo "    2. Or save state to {FEATURE_DIR}/session-handoff.md"
            echo "    3. Start a new session with the handoff summary"
            echo ""
        fi

        echo "═══════════════════════════════════════════════════════════"
    fi

    # Exit code based on status
    case $status in
        healthy)
            exit 0
            ;;
        warning)
            exit 0  # Warning is not a failure
            ;;
        critical)
            exit 1  # Critical exits with error
            ;;
    esac
}

main
