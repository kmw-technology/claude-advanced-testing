#!/usr/bin/env node

import { runAgent, formatAgentResult } from "./agent/runner.js";
import { runAppSnapshot, formatSnapshotResult } from "./agent/snapshot-runner.js";
import type { AgentConfig, AgentTask, TaskPreset } from "./agent/types.js";

const VALID_PRESETS = ["quick", "deep", "security", "accessibility", "performance", "market-ready"];

function parseArgs(argv: string[]): {
  backend: "openai" | "claude-code";
  task: string;
  url?: string;
  model?: string;
  preset?: TaskPreset;
  language?: string;
  personaName?: string;
  personaRole?: string;
  personaGoals?: string[];
  maxSteps?: number;
  verbose?: boolean;
  timeout?: number;
  tools?: string[];
  help?: boolean;
  snapshot?: boolean;
  personas?: number;
  llmBackend?: "openai" | "claude-code";
} {
  const result: ReturnType<typeof parseArgs> = {
    backend: "openai",
    task: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--backend":
      case "-b":
        if (next === "openai" || next === "claude-code") {
          result.backend = next;
        } else {
          console.error(`Invalid backend: ${next}. Use "openai" or "claude-code".`);
          process.exit(1);
        }
        i++;
        break;
      case "--task":
      case "-t":
        result.task = next ?? "";
        i++;
        break;
      case "--url":
      case "-u":
        result.url = next;
        i++;
        break;
      case "--model":
      case "-m":
        result.model = next;
        i++;
        break;
      case "--preset":
      case "-p":
        if (next && VALID_PRESETS.includes(next)) {
          result.preset = next as TaskPreset;
        } else {
          console.error(`Invalid preset: ${next}. Use: ${VALID_PRESETS.join(", ")}`);
          process.exit(1);
        }
        i++;
        break;
      case "--lang":
        result.language = next;
        i++;
        break;
      case "--persona-name":
        result.personaName = next;
        i++;
        break;
      case "--persona-role":
        result.personaRole = next;
        i++;
        break;
      case "--persona-goals":
        result.personaGoals = next?.split(",").map((s) => s.trim());
        i++;
        break;
      case "--max-steps":
        result.maxSteps = parseInt(next ?? "50", 10);
        i++;
        break;
      case "--timeout":
        result.timeout = parseInt(next ?? "300000", 10);
        i++;
        break;
      case "--tools":
        result.tools = next?.split(",").map((s) => s.trim());
        i++;
        break;
      case "--verbose":
      case "-v":
        result.verbose = true;
        break;
      case "--snapshot":
        result.snapshot = true;
        break;
      case "--personas":
        result.personas = parseInt(next ?? "4", 10);
        i++;
        break;
      case "--llm-backend":
        if (next === "openai" || next === "claude-code") {
          result.llmBackend = next;
        } else {
          console.error(`Invalid LLM backend: ${next}. Use "openai" or "claude-code".`);
          process.exit(1);
        }
        i++;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
claude-advanced-testing Agent CLI v2.0

Usage:
  node dist/agent-cli.js --url <url> [options]           Full Audit (default)
  node dist/agent-cli.js --task <task> [options]          Custom task

Required (one of):
  --url, -u <url>           Target URL — runs Full Audit by default
  --task, -t <text>         Custom testing task (skips Full Audit)

General:
  --backend, -b <backend>   "openai" or "claude-code" (default: openai)

Presets:
  --preset, -p <preset>     Testing strategy preset:
                              quick         — Single-page scan (screenshot, a11y, perf, seo)
                              deep          — Multi-page audit with interactive testing
                              security      — Security-focused (forms, auth, headers)
                              accessibility — WCAG compliance deep-dive
                              performance   — Core Web Vitals analysis
                              market-ready  — Product-sense evaluation (customer experience, usability)

Options:
  --model, -m <model>       OpenAI model (default: gpt-5-mini)
  --lang <code>             Report language (e.g. "de", "en", "fr")
  --max-steps <n>           Max tool call iterations (default: 50)
  --timeout <ms>            Total timeout in ms (default: 300000)
  --tools <list>            Comma-separated tool subset
  --verbose, -v             Log each step to stderr
  --persona-name <name>     Persona name for persona-based testing
  --persona-role <role>     Persona role (e.g. "first-time visitor")
  --persona-goals <list>    Comma-separated persona goals
  --snapshot                Explicitly force Full Audit mode (default when only --url is given)
  --personas <n>            Number of personas for Full Audit (default: 4)
  --llm-backend <backend>   LLM backend for evaluation phases:
                              "openai" (default) or "claude-code".
                              Exploration always uses --backend; this controls
                              persona generation, evaluation, and aggregation.
  --help, -h                Show this help

Examples:
  # Full Audit (default) — just provide a URL
  node dist/agent-cli.js -u https://example.com

  # Full Audit with 6 personas, verbose output
  node dist/agent-cli.js -u https://example.com --personas 6 -v

  # Full Audit in German, explore with OpenAI, evaluate with Claude Code
  node dist/agent-cli.js -u https://example.com --lang de --llm-backend claude-code

  # Quick preset (skip Full Audit)
  node dist/agent-cli.js --preset quick -t "Quick scan" -u https://example.com

  # Deep multi-page audit preset
  node dist/agent-cli.js -b claude-code --preset deep -t "Deep audit" -u https://example.com

  # Security check
  node dist/agent-cli.js --preset security -t "Check login form security" -u https://app.example.com

  # Custom task
  node dist/agent-cli.js -b claude-code -t "Test the signup flow" -u https://app.example.com \\
    --persona-name "Maria" --persona-role "elderly first-time user" \\
    --persona-goals "create account,understand pricing"

Environment:
  OPENAI_API_KEY            Required for --backend openai or --llm-backend openai
  claude CLI                Must be installed for --backend claude-code or --llm-backend claude-code
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Full Audit (snapshot) mode:
  // - Explicit --snapshot flag, OR
  // - URL provided without --preset and without --task (default mode)
  const isFullAudit = args.snapshot || (args.url && !args.preset && !args.task);

  if (isFullAudit) {
    if (!args.url) {
      console.error("Error: --url is required for full audit mode. Use --help for usage.");
      process.exit(1);
    }

    const explore = args.backend;
    const llm = args.llmBackend ?? args.backend;
    console.error(`\nFull Audit starting (${args.personas ?? 4} personas, explore: ${explore}, LLM: ${llm})...\n`);

    try {
      const result = await runAppSnapshot({
        url: args.url,
        personaCount: args.personas,
        language: args.language,
        llmBackend: llm,
        agentConfig: {
          backend: explore,
          openaiModel: args.model,
          maxSteps: args.maxSteps,
          verbose: args.verbose,
          timeout: args.timeout ?? 600000,
        },
      });
      console.log(formatSnapshotResult(result));
      process.exit(0);
    } catch (err) {
      console.error(`\nFatal error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }

  if (!args.task) {
    console.error("Error: --task is required (or use --url for a full audit). Use --help for usage.");
    process.exit(1);
  }

  // Build config
  const config: AgentConfig = {
    backend: args.backend,
    openaiModel: args.model,
    maxSteps: args.maxSteps,
    verbose: args.verbose,
    timeout: args.timeout,
  };

  // Build task
  const task: AgentTask = {
    instruction: args.task,
    url: args.url,
    preset: args.preset,
    language: args.language,
    enabledTools: args.tools,
  };

  if (args.personaName) {
    task.persona = {
      name: args.personaName,
      role: args.personaRole ?? "user",
      goals: args.personaGoals ?? [],
    };
  }

  console.error(`\nAgent starting (backend: ${config.backend}${task.preset ? `, preset: ${task.preset}` : ""})...\n`);

  try {
    const result = await runAgent(task, config);
    console.log(formatAgentResult(result));
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error(
      `\nFatal error: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}

main();
