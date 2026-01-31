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
    } else {
      console.log(`Source "${source}" not yet implemented`);
    }
  });

program
  .command("tag")
  .description("Auto-tag conversations in vault")
  .option("--vault <path>", "Vault directory", "./vault")
  .action((options) => {
    console.log(`Tagging conversations in ${options.vault}...`);
    console.log("Not yet implemented");
  });

program
  .command("backlink")
  .description("Add backlinks between related conversations")
  .option("--vault <path>", "Vault directory", "./vault")
  .action((options) => {
    console.log(`Adding backlinks in ${options.vault}...`);
    console.log("Not yet implemented");
  });

program
  .command("sync")
  .description("Run all ingesters, then tag and backlink")
  .option("--vault <path>", "Vault directory", "./vault")
  .action((options) => {
    console.log(`Syncing to ${options.vault}...`);
    console.log("Not yet implemented");
  });

program.parse();
