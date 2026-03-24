import { z } from "zod";
import { getSession } from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import {
  startPersonaTest,
  generateTestingPrompt,
  endPersonaTest,
} from "../services/persona-manager.js";
import {
  addFeedback,
  getFeedback,
  generateReport,
} from "../services/feedback-collector.js";
import type {
  PersonaTestReport,
  FeedbackEntry,
  FeedbackReport,
  FeedbackCategory,
  FeedbackSeverity,
} from "../models/types.js";

const feedbackCategories = [
  "bug",
  "ux_issue",
  "confusion",
  "accessibility_issue",
  "performance_issue",
  "missing_feature",
  "positive",
] as const;

const feedbackSeverities = ["critical", "major", "minor", "positive"] as const;

export const personaTestSchema = z.object({
  action: z
    .enum(["start", "feedback", "report", "end"])
    .describe(
      '"start" a persona test, record "feedback", get a "report", or "end" the test'
    ),
  sessionId: z.string().describe("Active session ID"),

  // For start:
  url: z.string().url().optional().describe("Target URL to test (for start)"),
  personaName: z.string().optional().describe("Persona name (for start)"),
  personaRole: z
    .string()
    .optional()
    .describe("Persona role, e.g. 'first-time visitor' (for start)"),
  background: z
    .string()
    .optional()
    .describe("Persona background description (for start)"),
  goals: z
    .array(z.string())
    .optional()
    .describe("What the persona wants to accomplish (for start)"),
  painPoints: z
    .array(z.string())
    .optional()
    .describe("Known frustrations (for start)"),
  techSavviness: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe("Technical skill level (for start)"),
  language: z.string().optional().describe("Preferred language (for start)"),
  disabilities: z
    .array(z.string())
    .optional()
    .describe("Accessibility needs (for start)"),

  // For feedback:
  category: z
    .enum(feedbackCategories)
    .optional()
    .describe("Feedback category (for feedback)"),
  severity: z
    .enum(feedbackSeverities)
    .optional()
    .describe("Severity level (for feedback)"),
  description: z
    .string()
    .optional()
    .describe("Detailed finding description (for feedback)"),
  feedbackUrl: z
    .string()
    .optional()
    .describe("URL where issue was found (for feedback)"),
  element: z
    .string()
    .optional()
    .describe("Element related to finding (for feedback)"),
  includeScreenshot: z
    .boolean()
    .optional()
    .describe("Capture screenshot with feedback (for feedback)"),
  metadata: z
    .record(z.string())
    .optional()
    .describe("Additional metadata (for feedback)"),

  // For report:
  filterCategory: z
    .enum(feedbackCategories)
    .optional()
    .describe("Filter report by category"),
  filterSeverity: z
    .enum(feedbackSeverities)
    .optional()
    .describe("Filter report by severity"),

  // For end:
  completedChecklist: z
    .array(z.string())
    .optional()
    .describe("Completed checklist items (for end)"),
  overallNotes: z
    .string()
    .optional()
    .describe("Final notes/observations (for end)"),
});

export type PersonaTestInput = z.infer<typeof personaTestSchema>;

export async function handlePersonaTest(
  input: PersonaTestInput
): Promise<{ text: string; screenshot?: string }> {
  switch (input.action) {
    case "start":
      return handleStart(input);
    case "feedback":
      return handleFeedback(input);
    case "report":
      return handleReport(input);
    case "end":
      return handleEnd(input);
  }
}

// --- Start ---

async function handleStart(
  input: PersonaTestInput
): Promise<{ text: string; screenshot?: string }> {
  if (!input.url) throw new Error("url is required for start");
  if (!input.personaName) throw new Error("personaName is required for start");
  if (!input.personaRole) throw new Error("personaRole is required for start");
  if (!input.background) throw new Error("background is required for start");
  if (!input.goals || input.goals.length === 0)
    throw new Error("goals is required for start");

  const session = getSession(input.sessionId);

  await session.page.goto(input.url, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const config = startPersonaTest(
    input.sessionId,
    {
      name: input.personaName,
      role: input.personaRole,
      background: input.background,
      goals: input.goals,
      painPoints: input.painPoints ?? [],
      techSavviness: input.techSavviness ?? "medium",
      language: input.language,
      disabilities: input.disabilities,
    },
    input.url
  );

  const pageState = await extractPageState(session.page, {
    consoleErrors: [],
    includeVisibleText: true,
    maxElements: 50,
  });

  const prompt = generateTestingPrompt(config);

  const lines: string[] = [
    prompt,
    "",
    "=== Initial Page State ===",
    "",
    `URL: ${pageState.url}`,
    `Title: ${pageState.title}`,
    `Interactive elements: ${pageState.interactiveElements.length}`,
    `Forms: ${pageState.forms.length}`,
  ];

  if (pageState.visibleText) {
    const preview = pageState.visibleText.substring(0, 500);
    lines.push(
      "",
      `Page preview: ${preview}${pageState.visibleText.length > 500 ? "..." : ""}`
    );
  }

  return { text: lines.join("\n") };
}

// --- Feedback ---

async function handleFeedback(
  input: PersonaTestInput
): Promise<{ text: string; screenshot?: string }> {
  if (!input.category) throw new Error("category is required for feedback");
  if (!input.severity) throw new Error("severity is required for feedback");
  if (!input.description) throw new Error("description is required for feedback");

  const session = getSession(input.sessionId);
  const url = input.feedbackUrl ?? session.page.url();

  let screenshotBase64: string | undefined;
  if (input.includeScreenshot) {
    try {
      const buffer = await session.page.screenshot({ type: "png" });
      screenshotBase64 = buffer.toString("base64");
    } catch {
      // continue without screenshot
    }
  }

  const entry = addFeedback(input.sessionId, {
    category: input.category,
    severity: input.severity,
    description: input.description,
    url,
    element: input.element,
    screenshotBase64,
    metadata: input.metadata,
  });

  const lines = [
    `Feedback recorded [${entry.id}]`,
    `  Category: ${entry.category}`,
    `  Severity: ${entry.severity}`,
    `  URL: ${entry.url}`,
    `  Description: ${entry.description}`,
  ];
  if (entry.element) lines.push(`  Element: ${entry.element}`);
  if (screenshotBase64) lines.push(`  Screenshot: captured`);

  return { text: lines.join("\n"), screenshot: screenshotBase64 };
}

// --- Report ---

async function handleReport(
  input: PersonaTestInput
): Promise<{ text: string }> {
  getSession(input.sessionId);

  if (input.filterCategory || input.filterSeverity) {
    const entries = getFeedback(input.sessionId, {
      category: input.filterCategory,
      severity: input.filterSeverity,
    });

    if (entries.length === 0) {
      return { text: "No feedback entries match the filter." };
    }

    const lines: string[] = [`Filtered feedback (${entries.length}):`];
    for (const e of entries) {
      lines.push(
        `\n- [${e.severity.toUpperCase()}] ${e.category}: ${e.description}`
      );
      lines.push(`  URL: ${e.url}`);
      if (e.element) lines.push(`  Element: ${e.element}`);
    }
    return { text: lines.join("\n") };
  }

  const report = generateReport(input.sessionId);
  if (report.totalEntries === 0) {
    return { text: "No feedback collected yet." };
  }
  return { text: formatReport(report) };
}

// --- End ---

async function handleEnd(
  input: PersonaTestInput
): Promise<{ text: string }> {
  getSession(input.sessionId);
  const report = endPersonaTest(input.sessionId, input.completedChecklist);
  return { text: formatPersonaReport(report, input.overallNotes) };
}

// --- Formatters ---

function formatReport(report: FeedbackReport): string {
  const lines: string[] = [
    "=== Feedback Report ===",
    "",
    report.summary,
    "",
  ];

  const severityOrder = ["critical", "major", "minor", "positive"] as const;
  for (const sev of severityOrder) {
    const entries = report.entries.filter((e) => e.severity === sev);
    if (entries.length === 0) continue;
    lines.push(`[${sev.toUpperCase()}]`);
    for (const entry of entries) {
      lines.push(`  ${entry.category}: ${entry.description}`);
      lines.push(`    URL: ${entry.url}`);
      if (entry.element) lines.push(`    Element: ${entry.element}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatPersonaReport(
  report: PersonaTestReport,
  notes?: string
): string {
  const p = report.persona;
  const fb = report.feedbackReport;
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════╗");
  lines.push(`║  Persona Test Report: ${p.name}`);
  lines.push("╚══════════════════════════════════════╝");
  lines.push("");
  lines.push(`Persona: ${p.name} (${p.role})`);
  lines.push(`Target: ${report.targetUrl}`);
  lines.push(`Duration: ${(report.testingDurationMs / 1000).toFixed(0)}s`);
  lines.push(`Sentiment: ${report.overallSentiment.toUpperCase()}`);
  lines.push("");
  lines.push(fb.summary);

  if (report.checklistCompleted.length > 0) {
    lines.push("\n--- Completed ---");
    for (const item of report.checklistCompleted) {
      lines.push(`  [x] ${item}`);
    }
  }

  if (fb.entries.length > 0) {
    lines.push("\n--- Findings ---");
    const severityOrder = ["critical", "major", "minor", "positive"] as const;
    for (const sev of severityOrder) {
      const entries = fb.entries.filter((e) => e.severity === sev);
      if (entries.length === 0) continue;
      lines.push(`\n[${sev.toUpperCase()}]`);
      for (const entry of entries) {
        lines.push(`  ${entry.category}: ${entry.description}`);
        lines.push(`    URL: ${entry.url}`);
      }
    }
  }

  if (notes) {
    lines.push(`\n--- Notes ---\n${notes}`);
  }

  return lines.join("\n");
}
