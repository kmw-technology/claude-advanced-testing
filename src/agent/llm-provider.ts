import OpenAI from "openai";
import { spawn } from "child_process";

/**
 * Abstract LLM provider for text-in/text-out calls.
 * Used by the snapshot pipeline for persona generation, evaluation, and aggregation.
 * Separate from the agent backends (which handle tool loops).
 */
export interface LLMProvider {
  call(prompt: string): Promise<string>;
  readonly name: string;
}

export interface LLMProviderConfig {
  backend: "openai" | "claude-code";
  verbose?: boolean;

  // OpenAI-specific
  openaiApiKey?: string;
  openaiModel?: string;

  // Claude Code-specific
  claudeCodePath?: string;
  timeout?: number; // per-call timeout (default: 180000)
}

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  if (config.backend === "claude-code") {
    return new ClaudeCodeLLMProvider(config);
  }
  return new OpenAILLMProvider(config);
}

// --- OpenAI ---

class OpenAILLMProvider implements LLMProvider {
  readonly name: string;
  private client: OpenAI;
  private model: string;
  private verbose: boolean;

  constructor(config: LLMProviderConfig) {
    const apiKey = config.openaiApiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key required for LLM calls. Set OPENAI_API_KEY."
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = config.openaiModel ?? "gpt-5-mini";
    this.name = `OpenAI (${this.model})`;
    this.verbose = config.verbose ?? false;
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content ?? "";
      if (this.verbose) {
        const tokens = response.usage?.total_tokens ?? 0;
        console.error(`[snapshot]   LLM call (${this.name}): ${tokens} tokens`);
      }
      return content;
    } catch (err) {
      throw new Error(
        `OpenAI LLM call failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

// --- Claude Code CLI ---

class ClaudeCodeLLMProvider implements LLMProvider {
  readonly name = "Claude Code";
  private claudePath: string;
  private verbose: boolean;
  private timeout: number;

  constructor(config: LLMProviderConfig) {
    this.claudePath = config.claudeCodePath ?? "claude";
    this.verbose = config.verbose ?? false;
    this.timeout = config.timeout ?? 180000;
  }

  async call(prompt: string): Promise<string> {
    // Claude Code has no response_format — reinforce JSON output in prompt
    const fullPrompt =
      prompt +
      "\n\nCRITICAL: Your entire response must be a single valid JSON object. No markdown fences, no explanation, no text before or after — ONLY the JSON.";

    return new Promise<string>((resolve, reject) => {
      let settled = false;

      const child = spawn(
        this.claudePath,
        ["-p", fullPrompt, "--output-format", "json", "--no-session-persistence"],
        {
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env },
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        if (this.verbose) {
          process.stderr.write(chunk);
        }
      });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 5000);
        reject(
          new Error(
            `Claude Code LLM call timed out after ${this.timeout / 1000}s`
          )
        );
      }, this.timeout);

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(
          new Error(
            `Failed to spawn Claude Code: ${err.message}. Is the 'claude' CLI installed?`
          )
        );
      });

      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (code !== 0) {
          reject(
            new Error(
              `Claude Code exited with code ${code}: ${stderr.slice(0, 500)}`
            )
          );
          return;
        }

        // Claude Code --output-format json wraps output as { "result": "..." }
        let resultText = stdout.trim();
        try {
          const parsed = JSON.parse(resultText);
          if (parsed.result) {
            resultText = parsed.result;
          }
        } catch {
          // Not a JSON wrapper — use raw output
        }

        if (this.verbose) {
          console.error(
            `[snapshot]   LLM call (Claude Code): ${resultText.length} chars`
          );
        }

        resolve(resultText);
      });
    });
  }
}
