#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("palimpsest")
  .description(
    "Pull all AI conversations into one flat Obsidian vault with tags and backlinks"
  )
  .version("0.1.0");

program
  .command("ingest")
  .description("Ingest conversations from a source")
  .requiredOption(
    "--source <source>",
    "Source type: chatgpt, claude-web, claude-code, codex"
  )
  .option("--input <path>", "Input file or directory (required for some sources)")
  .option("--vault <path>", "Output vault directory", "./vault")
  .action(async (options) => {
    const { source, input, vault } = options;
    console.log(`Ingesting from ${source}...`);

    if (source === "chatgpt") {
      if (!input) {
        console.error("Error: --input is required for chatgpt source");
        process.exit(1);
      }
      const { ingestChatGPT } = await import("./ingest/chatgpt.js");
      await ingestChatGPT(input, vault);
    } else if (source === "claude-web") {
      if (!input) {
        console.error("Error: --input is required for claude-web source");
        process.exit(1);
      }
      const { ingestClaudeWeb } = await import("./ingest/claude-web.js");
      await ingestClaudeWeb(input, vault);
    } else if (source === "claude-code") {
      const { ingestClaudeCode } = await import("./ingest/claude-code.js");
      await ingestClaudeCode(vault, input);
    } else if (source === "codex") {
      const { ingestCodex } = await import("./ingest/codex.js");
      await ingestCodex(vault, input);
    } else {
      console.log(`Source "${source}" not yet implemented`);
    }
  });

program
  .command("tag")
  .description("Auto-tag conversations in vault")
  .option("--vault <path>", "Vault directory", "./vault")
  .action(async (options) => {
    const { tagVault } = await import("./tagger.js");
    await tagVault(options.vault);
  });

program
  .command("backlink")
  .description("Add backlinks between related conversations")
  .option("--vault <path>", "Vault directory", "./vault")
  .action(async (options) => {
    const { backlinkVault } = await import("./backlinker.js");
    await backlinkVault(options.vault);
  });

program
  .command("sync")
  .description("Run all ingesters, then tag and backlink")
  .option("--vault <path>", "Vault directory", "./vault")
  .option("--chatgpt <path>", "ChatGPT export ZIP or JSON file")
  .option("--claude-web <path>", "Claude.ai export JSON file")
  .action(async (options) => {
    const { vault } = options;
    const fs = await import("node:fs");
    
    fs.mkdirSync(vault, { recursive: true });
    
    console.log(`Syncing to ${vault}...`);
    let total = 0;

    if (options.chatgpt) {
      console.log("\n--- ChatGPT ---");
      const { ingestChatGPT } = await import("./ingest/chatgpt.js");
      total += await ingestChatGPT(options.chatgpt, vault);
    }

    if (options["claude-web"]) {
      console.log("\n--- Claude Web ---");
      const { ingestClaudeWeb } = await import("./ingest/claude-web.js");
      total += await ingestClaudeWeb(options["claude-web"], vault);
    }

    console.log("\n--- Claude Code ---");
    const { ingestClaudeCode } = await import("./ingest/claude-code.js");
    total += await ingestClaudeCode(vault);

    console.log("\n--- Codex ---");
    const { ingestCodex } = await import("./ingest/codex.js");
    total += await ingestCodex(vault);

    console.log("\n--- Backlinking ---");
    const { backlinkVault } = await import("./backlinker.js");
    await backlinkVault(vault);

    console.log(`\nSync complete! ${total} conversations written.`);
    console.log(`\nTo enable search, run:\n  qmd collection add ${vault} --name conversations && qmd embed`);
  });

program.parse();
