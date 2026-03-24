import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const runPlaywrightTestSchema = z.object({
  testDir: z
    .string()
    .describe("Absolute path to the directory containing Playwright tests"),
  testFile: z
    .string()
    .optional()
    .describe("Specific test file to run (relative to testDir)"),
  grep: z
    .string()
    .optional()
    .describe("Only run tests matching this regex pattern"),
  project: z
    .string()
    .optional()
    .describe('Browser project to run, e.g. "chromium", "firefox", "webkit"'),
  headed: z
    .boolean()
    .optional()
    .default(false)
    .describe("Run tests in headed mode (visible browser)"),
  timeout: z
    .number()
    .optional()
    .default(120000)
    .describe("Timeout for the entire test run in milliseconds"),
});

export type RunPlaywrightTestInput = z.infer<typeof runPlaywrightTestSchema>;

export interface PlaywrightTestResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  summary: string;
}

export async function runPlaywrightTest(
  input: RunPlaywrightTestInput
): Promise<PlaywrightTestResult> {
  const args = ["npx", "playwright", "test"];

  if (input.testFile) {
    args.push(input.testFile);
  }

  if (input.grep) {
    args.push("--grep", `"${input.grep}"`);
  }

  if (input.project) {
    args.push("--project", input.project);
  }

  if (input.headed) {
    args.push("--headed");
  }

  args.push("--reporter=line");

  const command = args.join(" ");

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: input.testDir,
      timeout: input.timeout,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    return {
      success: true,
      exitCode: 0,
      stdout,
      stderr,
      summary: extractSummary(stdout),
    };
  } catch (error) {
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    const stdout = execError.stdout || "";
    const stderr = execError.stderr || "";

    return {
      success: false,
      exitCode: execError.code ?? 1,
      stdout,
      stderr,
      summary: extractSummary(stdout) || stderr.slice(0, 500),
    };
  }
}

function extractSummary(output: string): string {
  const lines = output.split("\n");
  const summaryLines = lines.filter(
    (line) =>
      line.includes("passed") ||
      line.includes("failed") ||
      line.includes("skipped") ||
      line.includes("flaky") ||
      line.includes("timed out")
  );
  return summaryLines.join("\n").trim() || output.slice(-500);
}
