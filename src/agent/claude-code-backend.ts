import { spawn } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import type { AgentConfig, AgentTask, AgentResult } from "./types.js";
import { buildClaudeCodePrompt } from "./prompts.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export class ClaudeCodeBackend {
  private claudePath: string;

  constructor(config: AgentConfig) {
    this.claudePath = config.claudeCodePath ?? "claude";
  }

  async runTask(task: AgentTask, config: AgentConfig): Promise<AgentResult> {
    const timeout = config.timeout ?? 300000;
    const verbose = config.verbose ?? false;
    const startTime = Date.now();

    // 1. Write temporary MCP config
    const serverPath = resolve(__dirname, "../../dist/index.js");
    const mcpConfig = {
      mcpServers: {
        testing: {
          command: "node",
          args: [serverPath],
        },
      },
    };

    const configPath = join(tmpdir(), `mcp-agent-${Date.now()}.json`);
    writeFileSync(configPath, JSON.stringify(mcpConfig));

    if (verbose) {
      console.error(`[agent] MCP config written to ${configPath}`);
      console.error(`[agent] MCP server: node ${serverPath}`);
    }

    // 2. Build prompt
    const prompt = buildClaudeCodePrompt(task);

    if (verbose) {
      console.error(`[agent] Spawning Claude Code: ${this.claudePath}`);
      console.error(`[agent] Prompt length: ${prompt.length} chars`);
    }

    // 3. Spawn Claude Code
    //    --allowedTools: grant MCP tool permissions so Claude Code doesn't prompt
    //    --permission-mode default: no extra permissions beyond allowedTools
    //    --no-session-persistence: don't save this agent run to session history
    const child = spawn(this.claudePath, [
      "--mcp-config",
      configPath,
      "-p",
      prompt,
      "--output-format",
      "json",
      "--allowedTools",
      "mcp__testing__test_website",
      "mcp__testing__session",
      "mcp__testing__interact",
      "mcp__testing__read_page",
      "mcp__testing__explore_app",
      "mcp__testing__run_test",
      "mcp__testing__persona_test",
      "--no-session-persistence",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    // 4. Collect output
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      if (verbose) {
        process.stderr.write(chunk);
      }
    });

    // 5. Wait for completion with timeout
    let exitCode: number;
    try {
      exitCode = await new Promise<number>((resolvePromise, reject) => {
        let settled = false;

        const onClose = (code: number | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          child.removeListener("error", onError);
          resolvePromise(code ?? 1);
        };

        const onError = (err: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          child.removeListener("close", onClose);
          reject(new Error(`Failed to spawn Claude Code: ${err.message}`));
        };

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          child.removeListener("close", onClose);
          child.removeListener("error", onError);
          child.kill("SIGTERM");
          // Give it a moment to clean up, then force kill
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 5000);
          reject(new Error(`Claude Code timed out after ${timeout}ms`));
        }, timeout);

        child.on("close", onClose);
        child.on("error", onError);
      });
    } catch (err) {
      // Cleanup config file
      this.cleanupConfig(configPath);

      return {
        success: false,
        backend: "claude-code",
        steps: [],
        totalSteps: 0,
        totalDurationMs: Date.now() - startTime,
        finalAnswer: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // 6. Cleanup config file
    this.cleanupConfig(configPath);

    // 7. Parse output
    return this.parseOutput(stdout, stderr, exitCode, startTime);
  }

  private cleanupConfig(configPath: string): void {
    try {
      unlinkSync(configPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  private parseOutput(
    stdout: string,
    stderr: string,
    exitCode: number,
    startTime: number
  ): AgentResult {
    // Claude Code with --output-format json returns a JSON object
    let finalAnswer = "";

    if (stdout.trim()) {
      try {
        const parsed = JSON.parse(stdout);
        // Claude Code JSON output has a "result" field
        if (parsed.result) {
          finalAnswer = parsed.result;
        } else if (typeof parsed === "string") {
          finalAnswer = parsed;
        } else {
          finalAnswer = JSON.stringify(parsed, null, 2);
        }
      } catch {
        // Not JSON — use raw stdout
        finalAnswer = stdout;
      }
    }

    // If no stdout but stderr has content, use it as context
    if (!finalAnswer && stderr.trim()) {
      finalAnswer = `Claude Code completed with exit code ${exitCode}. Stderr output:\n${stderr.slice(0, 5000)}`;
    }

    return {
      success: exitCode === 0,
      backend: "claude-code",
      steps: [], // Claude Code manages its own steps — we don't have visibility
      totalSteps: 0,
      totalDurationMs: Date.now() - startTime,
      finalAnswer,
      error: exitCode !== 0 ? `Claude Code exited with code ${exitCode}` : undefined,
    };
  }
}
