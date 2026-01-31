#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS=${1:-15}
ITERATION=0
DONE_MARKER="RALPH_STATUS:done"
LOG_FILE="ralph.log"

PROMPT='You are building the "palimpsest" project. Read PLAN.md for full context.

Rules:
- Work on the highest-priority incomplete story (unchecked [ ] items in PLAN.md).
- After completing a story, mark it [x] in PLAN.md.
- Run `npx tsx src/cli.ts --help` to verify your code compiles. Run any tests if they exist.
- Commit your progress with a descriptive message after each completed story.
- If ALL stories are complete, output exactly on its own line: RALPH_STATUS:done
- If you cannot complete a story, document what blocks it in PLAN.md and move to the next.
- Keep code simple. Use tsx for running TypeScript directly. Use commander for CLI.
- Do NOT deploy anything. Do NOT push to remote.'

echo "=== Palimpsest Ralph Loop ===" | tee "$LOG_FILE"
echo "Max iterations: $MAX_ITERATIONS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "--- Iteration $ITERATION/$MAX_ITERATIONS ($(date '+%H:%M:%S')) ---" | tee -a "$LOG_FILE"

    # Run amp in execute mode, non-interactive
    OUTPUT=$(amp --dangerously-allow-all -x "$PROMPT" 2>&1) || true

    echo "$OUTPUT" >> "$LOG_FILE"
    echo "$OUTPUT" | tail -20
    echo ""

    # Git checkpoint (amp may have already committed, but ensure nothing is left)
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
