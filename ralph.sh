#!/usr/bin/env bash
set -euo pipefail

MAX_ITERATIONS=${1:-15}
ITERATION=0
DONE_MARKER="RALPH_STATUS:done"

PROMPT=$(cat <<'PROMPT_EOF'
You are building the "palimpsest" project. Read PLAN.md for full context.

Rules:
- Work on the highest-priority incomplete story (unchecked [ ] items).
- After completing a story, mark it [x] in PLAN.md.
- Run `npx tsx` to verify your code compiles. Run any tests if they exist.
- Commit your progress after each completed story.
- If ALL stories are complete, output exactly: RALPH_STATUS:done
- If you can't complete a story, document what's blocking in PLAN.md and move to the next.
- Keep code simple. Use tsx for running TypeScript directly.
- Do NOT deploy anything.
PROMPT_EOF
)

echo "=== Palimpsest Ralph Loop ==="
echo "Max iterations: $MAX_ITERATIONS"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "--- Iteration $ITERATION/$MAX_ITERATIONS ($(date '+%H:%M:%S')) ---"

    # Run amp with the prompt, capture output
    OUTPUT=$(amp --yes --print "$PROMPT" 2>&1) || true

    echo "$OUTPUT" | tail -5
    echo ""

    # Git checkpoint
    if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
        echo "[ralph] No changes to checkpoint."
    else
        git add -A
        git commit -m "ralph: iteration $ITERATION" --no-verify 2>/dev/null || true
    fi

    # Check completion
    if echo "$OUTPUT" | grep -q "$DONE_MARKER"; then
        echo "=== Ralph complete after $ITERATION iterations ==="
        exit 0
    fi

    echo "[ralph] Not done yet. Continuing..."
    echo ""
done

echo "=== Ralph hit max iterations ($MAX_ITERATIONS) ==="
exit 1
