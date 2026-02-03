#!/usr/bin/env bash
set -euo pipefail

VAULT="${1:-./vault}"
OUT="${2:-./distilled}"
MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"

mkdir -p "$OUT/summaries"

# --- Prompts ---

read -r -d '' SUMMARY_PROMPT <<'EOF' || true
You are distilling a batch of AI conversation logs from a developer's vault.

For this time period, produce a structured summary:

## Period Overview
1-2 sentences: what was the developer primarily working on?

## Key Activities
Bulleted list of distinct projects/tasks/features worked on. Group related conversations.

## Decisions & Outcomes
What was decided? What approach was chosen and why? What worked, what didn't?

## Learnings & Insights
Technical insights, patterns discovered, gotchas encountered, tools evaluated.

## Notable Conversations
List 3-5 most significant conversations by filename with a one-line description of why they matter.

Be concise. Use the conversation content, not just titles. Extract substance.
EOF

read -r -d '' THEMES_PROMPT <<'EOF' || true
You are analyzing period summaries from a developer's AI conversation vault spanning several months.

Produce a thematic analysis:

## Recurring Themes
What topics, tools, patterns keep coming up across periods? Group into major themes.

## Evolution Over Time
How did the developer's focus shift? What was picked up, what was dropped?

## Tool & Technology Landscape
What programming languages, frameworks, tools, services appear most? Rate of adoption/abandonment.

## Working Patterns
How does this developer use AI assistants? What kinds of tasks do they delegate? What's their style?

## Key Projects
Identify the major projects/codebases worked on. Brief description of each and their arc.

Be analytical, not just descriptive. Look for patterns across the summaries.
EOF

read -r -d '' KNOWLEDGE_PROMPT <<'EOF' || true
You are creating a distilled knowledge base from a developer's AI conversation history.

From the period summaries and thematic analysis, extract:

## Technical Decisions Log
| Decision | Context | Chosen Approach | Rationale |
|----------|---------|-----------------|-----------|
(fill in significant technical decisions)

## Lessons Learned
Numbered list of concrete, reusable technical insights. Things like "X doesn't work well with Y because Z" or "When doing X, always Y first."

## Useful Patterns & Snippets
Code patterns, configurations, or approaches that proved useful and are worth remembering.

## Anti-patterns & Pitfalls
Things that were tried and failed, or common mistakes encountered.

## Open Questions & Future Work
Threads left unresolved, ideas mentioned but not pursued, potential improvements noted.

Focus on actionable, referenceable knowledge. Skip anything too project-specific to be reusable.
EOF

read -r -d '' EXEC_PROMPT <<'EOF' || true
Create a concise executive summary (1-2 pages) of this developer's AI-assisted work over the past months.

Include:
- What they built
- How they work with AI
- Their main technical focus areas
- Top 5 insights worth remembering

Write it in first person, as if the developer is writing a retrospective for themselves.
Keep it crisp and useful as a quick reference.
EOF

# --- Helpers ---

concat_files() {
  local files=("$@")
  for f in "${files[@]}"; do
    echo "---"
    echo "# $(basename "$f" .md)"
    echo ""
    cat "$f"
    echo ""
  done
}

summarize_period() {
  local period="$1"
  local outfile="$OUT/summaries/${period}.md"
  shift
  local files=("$@")

  if [[ -s "$outfile" ]]; then
    echo "  [skip] $period (already exists)"
    return
  fi

  local count=${#files[@]}
  local tmpfile="$outfile.tmp"
  echo "  [summarize] $period ($count conversations)"

  concat_files "${files[@]}" | gemini -m "$MODEL" "$SUMMARY_PROMPT" > "$tmpfile" && mv "$tmpfile" "$outfile"
}

# --- Phase 1: Period Summaries ---

echo "=== Phase 1: Period Summaries ==="

# Pre-January months (small enough for monthly batches)
for month in 2025-09 2025-10 2025-11 2025-12; do
  files=()
  while IFS= read -r f; do
    files+=("$f")
  done < <(ls "$VAULT"/${month}-* 2>/dev/null || true)
  if [[ ${#files[@]} -gt 0 ]]; then
    summarize_period "$month" "${files[@]}"
  fi
done

# January 2026: split by week
for week_start in 01 06 13 20 27; do
  case $week_start in
    01) week_end=05; label="2026-01-w1" ;;
    06) week_end=12; label="2026-01-w2" ;;
    13) week_end=19; label="2026-01-w3" ;;
    20) week_end=26; label="2026-01-w4" ;;
    27) week_end=31; label="2026-01-w5" ;;
  esac
  files=()
  for day in $(seq -w "$week_start" "$week_end"); do
    while IFS= read -r f; do
      files+=("$f")
    done < <(ls "$VAULT"/2026-01-${day}_* 2>/dev/null || true)
  done
  if [[ ${#files[@]} -gt 0 ]]; then
    summarize_period "$label" "${files[@]}"
  fi
done

# February 2026
files=()
while IFS= read -r f; do
  files+=("$f")
done < <(ls "$VAULT"/2026-02-* 2>/dev/null || true)
if [[ ${#files[@]} -gt 0 ]]; then
  summarize_period "2026-02" "${files[@]}"
fi

echo ""

# --- Phase 2: Themes ---

echo "=== Phase 2: Theme Extraction ==="

if [[ ! -s "$OUT/themes.md" ]]; then
  cat "$OUT/summaries"/*.md | gemini -m "$MODEL" "$THEMES_PROMPT" > "$OUT/themes.md.tmp" && mv "$OUT/themes.md.tmp" "$OUT/themes.md"
  echo "  [done] themes.md"
else
  echo "  [skip] themes.md (already exists)"
fi

echo ""

# --- Phase 3: Knowledge Base ---

echo "=== Phase 3: Knowledge Extraction ==="

if [[ ! -s "$OUT/knowledge.md" ]]; then
  cat "$OUT/summaries"/*.md "$OUT/themes.md" | gemini -m "$MODEL" "$KNOWLEDGE_PROMPT" > "$OUT/knowledge.md.tmp" && mv "$OUT/knowledge.md.tmp" "$OUT/knowledge.md"
  echo "  [done] knowledge.md"
else
  echo "  [skip] knowledge.md (already exists)"
fi

echo ""

# --- Phase 4: Executive Summary ---

echo "=== Phase 4: Executive Summary ==="

if [[ ! -s "$OUT/SUMMARY.md" ]]; then
  cat "$OUT/themes.md" "$OUT/knowledge.md" | gemini -m "$MODEL" "$EXEC_PROMPT" > "$OUT/SUMMARY.md.tmp" && mv "$OUT/SUMMARY.md.tmp" "$OUT/SUMMARY.md"
  echo "  [done] SUMMARY.md"
else
  echo "  [skip] SUMMARY.md (already exists)"
fi

echo ""
echo "=== Done ==="
echo "Output in $OUT/"
ls -la "$OUT/" "$OUT/summaries/"
