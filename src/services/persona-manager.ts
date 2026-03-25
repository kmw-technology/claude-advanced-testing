import type {
  PersonaDefinition,
  PersonaTestConfig,
  PersonaTestReport,
  FeedbackReport,
} from "../models/types.js";
import { generateReport } from "./feedback-collector.js";

const activeTests = new Map<string, PersonaTestConfig>();

/**
 * Starts a persona test for a session. Generates a testing checklist based on persona traits.
 */
export function startPersonaTest(
  sessionId: string,
  persona: PersonaDefinition,
  targetUrl: string
): PersonaTestConfig {
  const checklist = generateChecklist(persona);

  const config: PersonaTestConfig = {
    sessionId,
    persona,
    targetUrl,
    testingChecklist: checklist,
    startedAt: Date.now(),
  };

  activeTests.set(sessionId, config);
  return config;
}

/**
 * Gets the active persona test config for a session, if any.
 */
export function getPersonaConfig(
  sessionId: string
): PersonaTestConfig | null {
  return activeTests.get(sessionId) ?? null;
}

/**
 * Generates a testing prompt/instructions that Claude can use to guide the test.
 */
export function generateTestingPrompt(config: PersonaTestConfig): string {
  const p = config.persona;
  const lines: string[] = [];

  lines.push(`=== Persona Test: ${p.name} ===`);
  lines.push("");
  lines.push(`You are testing ${config.targetUrl} as the following persona:`);
  lines.push("");
  lines.push(`Name: ${p.name}`);
  lines.push(`Role: ${p.role}`);
  lines.push(`Background: ${p.background}`);
  lines.push(`Tech savviness: ${p.techSavviness}`);
  if (p.language) lines.push(`Preferred language: ${p.language}`);
  if (p.device) lines.push(`Device: ${p.device}`);

  lines.push("");
  lines.push("Goals:");
  for (const goal of p.goals) {
    lines.push(`  - ${goal}`);
  }

  if (p.painPoints.length > 0) {
    lines.push("");
    lines.push("Pain points to watch for:");
    for (const pain of p.painPoints) {
      lines.push(`  - ${pain}`);
    }
  }

  if (p.disabilities && p.disabilities.length > 0) {
    lines.push("");
    lines.push("Accessibility needs:");
    for (const d of p.disabilities) {
      lines.push(`  - ${d}`);
    }
  }

  lines.push("");
  lines.push("=== Testing Checklist ===");
  lines.push("");
  for (const item of config.testingChecklist) {
    lines.push(`[ ] ${item}`);
  }

  lines.push("");
  lines.push("=== Instructions ===");
  lines.push("");
  lines.push(
    "1. Navigate the website as this persona would. Think about their goals and frustrations."
  );
  lines.push(
    "2. Use the `interact` tool to perform actions (click, fill, navigate)."
  );
  lines.push(
    "3. After any action that should change state or produce a result, VERIFY: navigate to a different part of the app where the outcome should be reflected. A confirmation message is not proof — find independent evidence."
  );
  lines.push(
    "4. When the app displays counts, statuses, or AI/chatbot responses — cross-check by navigating to the actual source data."
  );
  lines.push(
    "5. Use the `collect_feedback` tool to record findings as you discover them."
  );
  lines.push(
    "6. Categorize findings: bug, ux_issue, confusion, accessibility_issue, performance_issue, missing_feature, or positive."
  );
  lines.push(
    "7. Rate severity: critical (blocks the goal), major (significant friction), minor (small annoyance), positive (good experience)."
  );
  lines.push(
    "8. When done, call `end_persona_test` with the completed checklist items."
  );

  return lines.join("\n");
}

/**
 * Ends a persona test and returns a report with aggregated feedback.
 */
export function endPersonaTest(
  sessionId: string,
  completedChecklist?: string[]
): PersonaTestReport {
  const config = activeTests.get(sessionId);
  if (!config) {
    throw new Error(
      `No active persona test for session ${sessionId}.`
    );
  }

  const feedbackReport: FeedbackReport = generateReport(sessionId);
  const durationMs = Date.now() - config.startedAt;

  // Determine overall sentiment from feedback
  const sentiment = computeSentiment(feedbackReport);

  activeTests.delete(sessionId);

  return {
    persona: config.persona,
    targetUrl: config.targetUrl,
    feedbackReport,
    testingDurationMs: durationMs,
    checklistCompleted: completedChecklist ?? [],
    overallSentiment: sentiment,
  };
}

/**
 * Clears persona test state for a session. Called when a session ends.
 */
export function clearPersonaTest(sessionId: string): void {
  activeTests.delete(sessionId);
}

// --- Internal helpers ---

function generateChecklist(persona: PersonaDefinition): string[] {
  const items: string[] = [];

  // Base checklist items for all personas
  items.push("Can I understand what this product/site does within 10 seconds?");
  items.push("Is the main navigation clear and usable?");

  // Goal-based checklist with verification
  for (const goal of persona.goals) {
    items.push(`Can I accomplish: "${goal}"?`);
    items.push(`After accomplishing "${goal}", can the result be independently verified elsewhere in the app?`);
  }

  // Tech-savviness based items
  if (persona.techSavviness === "low") {
    items.push("Are instructions and labels written in plain language?");
    items.push("Are error messages helpful and non-technical?");
    items.push("Can I complete actions without guessing?");
  }

  if (persona.techSavviness === "high") {
    items.push("Are there keyboard shortcuts or power-user features?");
    items.push("Does the interface respond quickly to interactions?");
  }

  // Accessibility items
  if (persona.disabilities && persona.disabilities.length > 0) {
    items.push("Is the content accessible with my assistive needs?");
    items.push("Are interactive elements keyboard-navigable?");
    items.push("Do images have meaningful alt text?");
  }

  // Pain point awareness
  for (const pain of persona.painPoints) {
    items.push(`Does this site avoid frustration: "${pain}"?`);
  }

  // Language items
  if (persona.language && persona.language !== "en") {
    items.push(
      `Is the content available in ${persona.language}, or at least understandable?`
    );
  }

  return items;
}

function computeSentiment(
  report: FeedbackReport
): "positive" | "mixed" | "negative" {
  if (report.totalEntries === 0) return "positive";

  const negativeCount =
    report.bySeverity.critical + report.bySeverity.major;
  const positiveCount = report.bySeverity.positive;

  if (negativeCount === 0 && positiveCount > 0) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "mixed";
}
