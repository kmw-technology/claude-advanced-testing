import type { AgentConfig, AgentTask, AgentResult } from "./types.js";
import { OpenAIBackend } from "./openai-backend.js";
import { ClaudeCodeBackend } from "./claude-code-backend.js";
import { endAllSessions } from "../services/session-manager.js";
import { closeBrowser } from "../services/browser-manager.js";

/**
 * Run an autonomous testing agent with the specified backend.
 * Ensures browser sessions are cleaned up regardless of outcome.
 */
export async function runAgent(
  task: AgentTask,
  config: AgentConfig
): Promise<AgentResult> {
  const start = Date.now();

  let result: AgentResult;

  try {
    if (config.backend === "openai") {
      const backend = new OpenAIBackend(config);
      result = await backend.runTask(task, config);
    } else {
      const backend = new ClaudeCodeBackend(config);
      result = await backend.runTask(task, config);
    }
  } finally {
    // Clean up any browser sessions the agent may have opened
    // (only relevant for OpenAI backend which calls tools directly)
    if (config.backend === "openai") {
      try {
        await endAllSessions();
        await closeBrowser();
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  result.totalDurationMs = Date.now() - start;
  return result;
}

/**
 * Format an AgentResult for human-readable output.
 */
export function formatAgentResult(result: AgentResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(`  Agent Report (${result.backend})`);
  lines.push("=".repeat(60));
  lines.push("");

  lines.push(`Status: ${result.success ? "SUCCESS" : "FAILED"}`);
  lines.push(`Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push(`Tool calls: ${result.totalSteps}`);

  if (result.tokenUsage) {
    lines.push(
      `Tokens: ${result.tokenUsage.totalTokens} (${result.tokenUsage.promptTokens} prompt + ${result.tokenUsage.completionTokens} completion)`
    );
  }

  if (result.error) {
    lines.push(`\nError: ${result.error}`);
  }

  if (result.steps.length > 0) {
    lines.push("\n--- Tool Call Log ---");
    for (const step of result.steps) {
      lines.push(
        `  #${step.stepNumber} ${step.tool} (${step.durationMs}ms)`
      );
    }
  }

  if (result.finalAnswer) {
    lines.push("\n--- Final Report ---");
    lines.push(result.finalAnswer);
  }

  lines.push("");
  lines.push("=".repeat(60));

  return lines.join("\n");
}
