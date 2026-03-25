import OpenAI from "openai";
import type { AgentConfig, AgentTask, AgentStep, AgentResult } from "./types.js";
import { getToolDefinitions, toOpenAITools, executeToolCall } from "./tool-registry.js";
import { buildSystemPrompt } from "./prompts.js";

// Simple hash for tool call caching
function hashToolCall(name: string, args: Record<string, unknown>): string {
  return `${name}::${JSON.stringify(args, Object.keys(args).sort())}`;
}


export class OpenAIBackend {
  private client: OpenAI;
  private model: string;

  constructor(config: AgentConfig) {
    const apiKey = config.openaiApiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY env var or pass --openai-api-key."
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = config.openaiModel ?? "gpt-5-mini";
  }

  async runTask(task: AgentTask, config: AgentConfig): Promise<AgentResult> {
    const maxSteps = config.maxSteps ?? 50;
    const verbose = config.verbose ?? false;

    const definitions = getToolDefinitions(task.enabledTools);
    const tools = toOpenAITools(definitions);

    const systemPrompt = buildSystemPrompt(task);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: task.instruction },
    ];

    const steps: AgentStep[] = [];
    let promptTokens = 0;
    let completionTokens = 0;

    // Tool call cache: avoid duplicate calls
    const toolCallCache = new Map<string, string>();

    const startTime = Date.now();

    for (let iteration = 0; iteration < maxSteps; iteration++) {
      // Check timeout
      if (config.timeout && Date.now() - startTime > config.timeout) {
        return this.buildResult(false, steps, promptTokens, completionTokens, startTime, `Timeout after ${config.timeout}ms`);
      }

      if (verbose) {
        console.error(`[agent] Step ${iteration + 1}/${maxSteps} — ${this.model} (${messages.length} msgs, ~${this.estimateTokens(messages)} tokens)`);
      }

      let response: OpenAI.Chat.Completions.ChatCompletion;
      try {
        response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          tools,
        });
      } catch (err) {
        return this.buildResult(false, steps, promptTokens, completionTokens, startTime,
          `OpenAI API error: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Track tokens
      promptTokens += response.usage?.prompt_tokens ?? 0;
      completionTokens += response.usage?.completion_tokens ?? 0;

      const choice = response.choices[0];
      if (!choice) {
        return this.buildResult(false, steps, promptTokens, completionTokens, startTime, "No response from OpenAI");
      }

      // Add assistant message to history
      messages.push(choice.message);

      // Snapshot: record agent reasoning
      if (config.snapshotCollector && choice.message.content) {
        config.snapshotCollector.recordObservation(iteration, choice.message.content);
      }

      // No tool calls — agent is done
      if (
        choice.finish_reason === "stop" ||
        !choice.message.tool_calls ||
        choice.message.tool_calls.length === 0
      ) {
        if (verbose) {
          console.error(`[agent] Done after ${steps.length} tool calls. Tokens: ${promptTokens + completionTokens}`);
        }
        return this.buildResult(true, steps, promptTokens, completionTokens, startTime, undefined, choice.message.content ?? "");
      }

      // Execute tool calls (only function-type)
      const functionCalls = choice.message.tool_calls.filter(
        (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
          tc.type === "function"
      );

      for (const toolCall of functionCalls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (parseErr) {
          const errorMsg = `Failed to parse arguments for ${toolName}: ${parseErr instanceof Error ? parseErr.message : "invalid JSON"}`;
          if (verbose) console.error(`[agent]   ERROR: ${errorMsg}`);
          messages.push({ role: "tool" as const, tool_call_id: toolCall.id, content: errorMsg });
          continue;
        }

        // Only cache stateless tools — session-dependent tools return different
        // results as the page state changes (needed for verification)
        const statelessTools = new Set(["test_website", "explore_app", "run_test"]);
        const isCacheable = statelessTools.has(toolName);

        // Check cache (only for stateless tools)
        if (isCacheable) {
          const cacheKey = hashToolCall(toolName, args);
          const cached = toolCallCache.get(cacheKey);
          if (cached) {
            if (verbose) console.error(`[agent]   CACHED: ${toolName}`);
            messages.push({ role: "tool" as const, tool_call_id: toolCall.id, content: `[Cached result — identical call was already made]\n${cached}` });
            continue;
          }
        }

        if (verbose) {
          console.error(`[agent]   Tool: ${toolName}(${JSON.stringify(args).slice(0, 200)})`);
        }

        const callStart = Date.now();
        const result = await executeToolCall(toolName, args);
        const callDuration = Date.now() - callStart;

        // Snapshot: record full output + screenshots BEFORE truncation
        if (config.snapshotCollector) {
          config.snapshotCollector.recordToolCall(
            steps.length + 1, toolName, args, result, callDuration
          );
        }

        // Truncate output intelligently
        const output = this.truncateOutput(result.text, toolName);

        steps.push({
          stepNumber: steps.length + 1,
          tool: toolName,
          input: args,
          output,
          durationMs: callDuration,
          timestamp: Date.now(),
        });

        // Cache the result (only for stateless tools)
        if (isCacheable) {
          toolCallCache.set(hashToolCall(toolName, args), output);
        }

        if (verbose) {
          console.error(`[agent]   → ${callDuration}ms, ${result.text.length}→${output.length} chars`);
        }

        messages.push({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: output,
        });
      }
    }

    return this.buildResult(false, steps, promptTokens, completionTokens, startTime, `Max steps (${maxSteps}) reached without completion`);
  }

  /**
   * Truncate tool output based on tool type.
   * Different tools have different value densities.
   */
  private truncateOutput(text: string, toolName: string): string {
    const limits: Record<string, number> = {
      test_website: 6000, // high value — audit results
      explore_app: 4000, // moderate — page list
      read_page: 4000, // high — page content needed for verification
      interact: 3000, // high — form state, notifications, elements needed for verification
      session: 500, // very low — session ID
      run_test: 4000, // high — test results
      persona_test: 4000, // high — persona report
    };

    const limit = limits[toolName] ?? 3000;

    if (text.length <= limit) return text;

    // Smart truncation: keep beginning (structure) and end (summary)
    const headSize = Math.floor(limit * 0.7);
    const tailSize = Math.floor(limit * 0.25);
    const head = text.slice(0, headSize);
    const tail = text.slice(-tailSize);
    return `${head}\n\n[... ${text.length - headSize - tailSize} chars truncated ...]\n\n${tail}`;
  }

  /**
   * Rough token estimate for monitoring.
   */
  private estimateTokens(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): number {
    let chars = 0;
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        chars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if ("text" in part) chars += part.text.length;
        }
      }
    }
    return Math.ceil(chars / 4); // ~4 chars per token rough estimate
  }

  private buildResult(
    success: boolean,
    steps: AgentStep[],
    promptTokens: number,
    completionTokens: number,
    startTime: number,
    error?: string,
    finalAnswer?: string
  ): AgentResult {
    return {
      success,
      backend: "openai",
      steps,
      totalSteps: steps.length,
      totalDurationMs: Date.now() - startTime,
      finalAnswer: finalAnswer ?? "",
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      error,
    };
  }
}
