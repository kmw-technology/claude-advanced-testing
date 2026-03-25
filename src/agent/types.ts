// --- Agent Configuration ---

export interface AgentConfig {
  backend: "openai" | "claude-code";

  // OpenAI-specific
  openaiApiKey?: string;
  openaiModel?: string; // default: "gpt-4o"

  // Claude Code-specific
  claudeCodePath?: string; // default: "claude"

  // Shared
  maxSteps?: number; // default: 50
  verbose?: boolean; // log each step to stderr
  timeout?: number; // total timeout ms (default: 300000)
}

// --- Task Presets ---

export type TaskPreset = "quick" | "deep" | "security" | "accessibility" | "performance" | "market-ready";

// --- Agent Task ---

export interface AgentTask {
  instruction: string;
  url?: string;
  preset?: TaskPreset;
  persona?: {
    name: string;
    role: string;
    goals: string[];
  };
  enabledTools?: string[];
  language?: string; // report language (default: "en")
}

// --- Agent Step (one tool call) ---

export interface AgentStep {
  stepNumber: number;
  tool: string;
  input: Record<string, unknown>;
  output: string;
  durationMs: number;
  timestamp: number;
}

// --- Agent Result ---

export interface AgentResult {
  success: boolean;
  backend: "openai" | "claude-code";
  steps: AgentStep[];
  totalSteps: number;
  totalDurationMs: number;
  finalAnswer: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// --- Tool Definition (internal) ---

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  handler: (input: Record<string, unknown>) => Promise<ToolOutput>;
}

export interface ToolOutput {
  text: string;
  images?: Array<{ data: string; mimeType: string }>;
}
