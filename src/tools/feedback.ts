import { z } from "zod";
import { getSession } from "../services/session-manager.js";
import {
  addFeedback,
  getFeedback,
  generateReport,
} from "../services/feedback-collector.js";
import type { FeedbackReport, FeedbackEntry } from "../models/types.js";

// --- Schemas ---

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

export const collectFeedbackSchema = z.object({
  sessionId: z.string().describe("Active session ID"),
  category: z
    .enum(feedbackCategories)
    .describe("Category of the finding"),
  severity: z
    .enum(feedbackSeverities)
    .describe("Severity level of the finding"),
  description: z
    .string()
    .describe("Detailed description of the finding"),
  url: z.string().describe("URL where the issue was found"),
  element: z
    .string()
    .optional()
    .describe("Element description or selector related to the finding"),
  includeScreenshot: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture a screenshot of the current page state"),
  metadata: z
    .record(z.string())
    .optional()
    .describe("Additional key-value metadata"),
});

export const getFeedbackReportSchema = z.object({
  sessionId: z.string().describe("Active session ID"),
  category: z
    .enum(feedbackCategories)
    .optional()
    .describe("Filter by category"),
  severity: z
    .enum(feedbackSeverities)
    .optional()
    .describe("Filter by severity"),
});

// --- Handlers ---

export async function handleCollectFeedback(
  input: z.infer<typeof collectFeedbackSchema>
): Promise<string> {
  // Validate session exists
  const session = getSession(input.sessionId);

  // Optionally capture screenshot
  let screenshotBase64: string | undefined;
  if (input.includeScreenshot) {
    try {
      const buffer = await session.page.screenshot({ type: "png" });
      screenshotBase64 = buffer.toString("base64");
    } catch {
      // Screenshot failed — continue without it
    }
  }

  const entry = addFeedback(input.sessionId, {
    category: input.category,
    severity: input.severity,
    description: input.description,
    url: input.url,
    element: input.element,
    screenshotBase64,
    metadata: input.metadata,
  });

  return formatFeedbackEntry(entry);
}

export async function handleGetFeedbackReport(
  input: z.infer<typeof getFeedbackReportSchema>
): Promise<string> {
  // Validate session exists
  getSession(input.sessionId);

  if (input.category || input.severity) {
    const entries = getFeedback(input.sessionId, {
      category: input.category,
      severity: input.severity,
    });
    return formatFilteredEntries(entries, input.category, input.severity);
  }

  const report = generateReport(input.sessionId);
  return formatReport(report);
}

// --- Formatters ---

function formatFeedbackEntry(entry: FeedbackEntry): string {
  const lines: string[] = [
    `Feedback recorded [${entry.id}]`,
    `  Category: ${entry.category}`,
    `  Severity: ${entry.severity}`,
    `  URL: ${entry.url}`,
    `  Description: ${entry.description}`,
  ];

  if (entry.element) lines.push(`  Element: ${entry.element}`);
  if (entry.screenshotBase64) lines.push(`  Screenshot: captured`);
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    lines.push(`  Metadata: ${JSON.stringify(entry.metadata)}`);
  }

  return lines.join("\n");
}

function formatFilteredEntries(
  entries: FeedbackEntry[],
  category?: string,
  severity?: string
): string {
  const filterDesc = [
    category ? `category=${category}` : "",
    severity ? `severity=${severity}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (entries.length === 0) {
    return `No feedback entries found${filterDesc ? ` (filter: ${filterDesc})` : ""}.`;
  }

  const lines: string[] = [
    `Feedback entries (${entries.length})${filterDesc ? ` [filter: ${filterDesc}]` : ""}:`,
    "",
  ];

  for (const entry of entries) {
    lines.push(
      `- [${entry.severity.toUpperCase()}] ${entry.category}: ${entry.description}`
    );
    lines.push(`  URL: ${entry.url}`);
    if (entry.element) lines.push(`  Element: ${entry.element}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatReport(report: FeedbackReport): string {
  if (report.totalEntries === 0) {
    return "No feedback collected in this session.";
  }

  const lines: string[] = [
    "=== Feedback Report ===",
    "",
    report.summary,
    "",
    "--- All Entries ---",
    "",
  ];

  // Group by severity for readability
  const severityOrder: Array<"critical" | "major" | "minor" | "positive"> = [
    "critical",
    "major",
    "minor",
    "positive",
  ];

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
