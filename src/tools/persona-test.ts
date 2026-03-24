import { z } from "zod";
import { getSession } from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import {
  startPersonaTest,
  generateTestingPrompt,
  endPersonaTest,
} from "../services/persona-manager.js";
import type { PersonaTestReport } from "../models/types.js";

// --- Schemas ---

export const startPersonaTestSchema = z.object({
  sessionId: z.string().describe("Active session ID"),
  url: z.string().url().describe("Target URL to test"),
  personaName: z
    .string()
    .describe("Name for the persona, e.g. 'Maria'"),
  personaRole: z
    .string()
    .describe("Role, e.g. 'first-time visitor', 'power user', 'elderly customer'"),
  background: z
    .string()
    .describe("Brief background description of the persona"),
  goals: z
    .array(z.string())
    .describe("What the persona wants to accomplish on this website"),
  painPoints: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Known frustrations or challenges of this persona"),
  techSavviness: z
    .enum(["low", "medium", "high"])
    .optional()
    .default("medium")
    .describe("How technically skilled the persona is"),
  language: z
    .string()
    .optional()
    .describe("Preferred language, e.g. 'de', 'en'"),
  disabilities: z
    .array(z.string())
    .optional()
    .describe(
      "Any disabilities to consider, e.g. 'low vision', 'motor impairment', 'color blind'"
    ),
});

export const endPersonaTestSchema = z.object({
  sessionId: z.string().describe("Active session ID"),
  completedChecklist: z
    .array(z.string())
    .optional()
    .describe("Which checklist items were completed"),
  overallNotes: z
    .string()
    .optional()
    .describe("Any final notes or observations"),
});

// --- Handlers ---

export async function handleStartPersonaTest(
  input: z.infer<typeof startPersonaTestSchema>
): Promise<string> {
  const session = getSession(input.sessionId);

  // Navigate to the target URL
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
      painPoints: input.painPoints,
      techSavviness: input.techSavviness,
      language: input.language,
      disabilities: input.disabilities,
    },
    input.url
  );

  // Get initial page state
  const pageState = await extractPageState(session.page, {
    consoleErrors: [],
    includeVisibleText: true,
    maxElements: 50,
  });

  // Generate the testing prompt
  const prompt = generateTestingPrompt(config);

  // Format response
  const lines: string[] = [];
  lines.push(prompt);
  lines.push("");
  lines.push("=== Initial Page State ===");
  lines.push("");
  lines.push(`URL: ${pageState.url}`);
  lines.push(`Title: ${pageState.title}`);
  lines.push(
    `Interactive elements: ${pageState.interactiveElements.length}`
  );
  lines.push(`Forms: ${pageState.forms.length}`);

  if (pageState.visibleText) {
    const preview = pageState.visibleText.substring(0, 500);
    lines.push("");
    lines.push(`Page preview: ${preview}${pageState.visibleText.length > 500 ? "..." : ""}`);
  }

  return lines.join("\n");
}

export async function handleEndPersonaTest(
  input: z.infer<typeof endPersonaTestSchema>
): Promise<string> {
  // Validate session exists
  getSession(input.sessionId);

  const report = endPersonaTest(input.sessionId, input.completedChecklist);
  return formatPersonaReport(report, input.overallNotes);
}

// --- Formatters ---

function formatPersonaReport(
  report: PersonaTestReport,
  notes?: string
): string {
  const lines: string[] = [];
  const p = report.persona;
  const fb = report.feedbackReport;

  lines.push("╔══════════════════════════════════════╗");
  lines.push(`║  Persona Test Report: ${p.name}`);
  lines.push("╚══════════════════════════════════════╝");
  lines.push("");

  lines.push(`Persona: ${p.name} (${p.role})`);
  lines.push(`Target: ${report.targetUrl}`);
  lines.push(
    `Duration: ${(report.testingDurationMs / 1000).toFixed(0)}s`
  );
  lines.push(`Overall sentiment: ${report.overallSentiment.toUpperCase()}`);
  lines.push("");

  // Feedback summary
  lines.push("--- Findings ---");
  lines.push("");
  lines.push(fb.summary);
  lines.push("");

  // Checklist results
  if (report.checklistCompleted.length > 0) {
    lines.push("--- Completed Checklist ---");
    lines.push("");
    for (const item of report.checklistCompleted) {
      lines.push(`  [x] ${item}`);
    }
    lines.push("");
  }

  // Detailed findings by severity
  if (fb.entries.length > 0) {
    lines.push("--- Detailed Findings ---");
    lines.push("");

    const severityOrder = ["critical", "major", "minor", "positive"] as const;
    for (const sev of severityOrder) {
      const entries = fb.entries.filter((e) => e.severity === sev);
      if (entries.length === 0) continue;

      lines.push(`[${sev.toUpperCase()}]`);
      for (const entry of entries) {
        lines.push(`  ${entry.category}: ${entry.description}`);
        lines.push(`    URL: ${entry.url}`);
        if (entry.element) lines.push(`    Element: ${entry.element}`);
      }
      lines.push("");
    }
  }

  if (notes) {
    lines.push("--- Notes ---");
    lines.push("");
    lines.push(notes);
  }

  return lines.join("\n");
}
