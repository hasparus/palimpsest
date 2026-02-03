#!/usr/bin/env bash
set -euo pipefail

# Interactive distillation using amp + qmd MCP
# amp can search the vault via qmd, then synthesize findings
#
# Usage:
#   ./distill-with-amp.sh                  # full pipeline
#   ./distill-with-amp.sh "topic query"    # explore a specific topic

OUT="${2:-./distilled}"
mkdir -p "$OUT"

if [[ "${1:-}" != "" ]]; then
  # Single topic deep-dive
  echo "=== Deep dive: $1 ==="
  amp -x "Using the qmd MCP tools, search my conversation vault for: $1

Search broadly, read the most relevant conversations, then produce:
1. A timeline of how this topic evolved
2. Key decisions made
3. Current state / latest thinking
4. Unresolved questions

Be thorough — search multiple related terms." | tee "$OUT/topic-$(echo "$1" | tr ' ' '-').md"
  exit 0
fi

# Full pipeline: use amp to identify themes, then deep-dive each
echo "=== Step 1: Identify major themes via vault search ==="
THEMES=$(amp -x "Using qmd MCP tools, search my conversation vault with varied queries to identify the 8-10 most important recurring themes or projects. Try searches like: 'typescript', 'react', 'debugging', 'architecture', 'testing', 'deployment', 'performance', 'refactoring', etc.

Return ONLY a numbered list of theme names, one per line. No explanations.")

echo "$THEMES"
echo ""
echo "$THEMES" > "$OUT/amp-themes-raw.txt"

echo "=== Step 2: Deep-dive each theme ==="
echo "$THEMES" | grep -E '^[0-9]+\.' | sed 's/^[0-9]*\. *//' | while read -r theme; do
  slug=$(echo "$theme" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
  outfile="$OUT/amp-theme-${slug}.md"
  if [[ -f "$outfile" ]]; then
    echo "  [skip] $theme"
    continue
  fi
  echo "  [explore] $theme"
  amp -x "Using qmd MCP tools, search for conversations about: $theme

Read the most relevant ones. Then produce a focused summary:
## $theme
- What happened (chronological)
- Key decisions
- Learnings
- Open threads" > "$outfile"
done

echo "=== Step 3: Synthesize ==="
if [[ ! -f "$OUT/amp-synthesis.md" ]]; then
  cat "$OUT"/amp-theme-*.md | amp -x "Synthesize these theme summaries into a coherent narrative of what this developer has been working on and learning. Structure it as a retrospective." > "$OUT/amp-synthesis.md"
fi

echo "=== Done ==="
echo "Output in $OUT/"
