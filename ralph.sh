#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS=${1:-15}
ITERATION=0
DONE_MARKER="RALPH_STATUS:done"
LOG_FILE="ralph.log"
# Supported engines (set RALPH_ENGINE):
#   gemini  — gemini CLI with --yolo (default)
#   opencode — opencode run (free Kimi model)
MODEL="${RALPH_MODEL:-gemini-2.5-pro}"
ENGINE="${RALPH_ENGINE:-gemini}"

PROMPT='You are building the "palimpsest" project. Read PLAN.md for full context.
The current focus is the "Vault Viewer — Waku App" section (stories 15-20).

Rules:
- Work on the highest-priority incomplete story (unchecked [ ] items in PLAN.md).
- After completing a story, mark it [x] in PLAN.md.
- Read `app/WAKU-REFERENCE.md` for Waku API patterns before writing any Waku code.
- The vault is at `./vault/` and distilled output at `./distilled/` (symlinked into app/private/).
- Search uses `qmd search <query>` CLI (already installed and indexed).
- Run `cd app && npx waku dev` to verify your code compiles. Kill it after checking.
- Commit your progress with a descriptive message after each completed story.
- If ALL stories are complete, output exactly on its own line: RALPH_STATUS:done
- If you cannot complete a story, document what blocks it in PLAN.md and move to the next.
- Keep code simple. Use server components for data access, client components only for interactivity.
- Use Tailwind v4 for styling. Dark theme preferred. Monospace font for code.
- Do NOT deploy anything. Do NOT push to remote.'

echo "=== Palimpsest Ralph Loop ===" | tee "$LOG_FILE"
echo "Max iterations: $MAX_ITERATIONS" | tee -a "$LOG_FILE"
echo "Model: $MODEL" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "--- Iteration $ITERATION/$MAX_ITERATIONS ($(date '+%H:%M:%S')) ---" | tee -a "$LOG_FILE"

    # Run the chosen engine
    case "$ENGINE" in
      gemini)
        OUTPUT=$(gemini -m "$MODEL" --yolo "$PROMPT" 2>&1) || true
        ;;
      opencode)
        OUTPUT=$(opencode run "$PROMPT" 2>&1) || true
        ;;
      *)
        echo "Unknown engine: $ENGINE" >&2; exit 1
        ;;
    esac

    echo "$OUTPUT" >> "$LOG_FILE"
    echo "$OUTPUT" | tail -20
    echo ""

    # Git checkpoint
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        git add -A
        git commit -m "ralph: checkpoint iteration $ITERATION" --no-verify 2>/dev/null || true
    else
        echo "[ralph] No uncommitted changes." | tee -a "$LOG_FILE"
    fi

    # Check completion
    if echo "$OUTPUT" | grep -q "$DONE_MARKER"; then
        echo "=== Ralph complete after $ITERATION iterations ===" | tee -a "$LOG_FILE"
        exit 0
    fi

    echo "[ralph] Not done yet. Continuing..." | tee -a "$LOG_FILE"
    echo ""
done

echo "=== Ralph hit max iterations ($MAX_ITERATIONS) ===" | tee -a "$LOG_FILE"
exit 1
