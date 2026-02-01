#!/usr/bin/env bash
set -euo pipefail

VAULT="${1:-./vault}"

if ! command -v qmd &>/dev/null; then
  echo "qmd not found. Install: https://github.com/qmd-project/qmd"
  exit 1
fi

VAULT_ABS="$(cd "$VAULT" && pwd)"

echo "Setting up qmd for $VAULT_ABS"

qmd collection add "$VAULT_ABS" --name conversations 2>/dev/null || \
  echo "Collection 'conversations' already exists, skipping."

qmd context add qmd://conversations "AI conversation history from ChatGPT, Claude Code, Claude Web, Codex" 2>/dev/null || \
  echo "Context already set, skipping."

echo "Generating embeddings (this may take a while on first run)..."
qmd embed

echo ""
echo "Done. Try:"
echo "  qmd search 'your query here'"
echo "  qmd query 'your query here'   # slower but smarter (hybrid + reranking)"
