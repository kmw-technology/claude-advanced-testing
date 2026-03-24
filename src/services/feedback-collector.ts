import type {
  FeedbackEntry,
  FeedbackCategory,
  FeedbackSeverity,
  FeedbackReport,
} from "../models/types.js";

const feedbackStore = new Map<string, FeedbackEntry[]>();

const ALL_CATEGORIES: FeedbackCategory[] = [
  "bug",
  "ux_issue",
  "confusion",
  "accessibility_issue",
  "performance_issue",
  "missing_feature",
  "positive",
];

const ALL_SEVERITIES: FeedbackSeverity[] = [
  "critical",
  "major",
  "minor",
  "positive",
];

/**
 * Adds a feedback entry for a session. Returns the created entry with auto-generated id and timestamp.
 */
export function addFeedback(
  sessionId: string,
  entry: Omit<FeedbackEntry, "id" | "timestamp">
): FeedbackEntry {
  const feedback: FeedbackEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  const existing = feedbackStore.get(sessionId) ?? [];
  existing.push(feedback);
  feedbackStore.set(sessionId, existing);

  return feedback;
}

/**
 * Retrieves feedback entries for a session, optionally filtered by category and/or severity.
 */
export function getFeedback(
  sessionId: string,
  filters?: { category?: FeedbackCategory; severity?: FeedbackSeverity }
): FeedbackEntry[] {
  const entries = feedbackStore.get(sessionId) ?? [];

  if (!filters) return [...entries];

  return entries.filter((e) => {
    if (filters.category && e.category !== filters.category) return false;
    if (filters.severity && e.severity !== filters.severity) return false;
    return true;
  });
}

/**
 * Generates an aggregated feedback report for a session.
 */
export function generateReport(sessionId: string): FeedbackReport {
  const entries = feedbackStore.get(sessionId) ?? [];

  const bySeverity = Object.fromEntries(
    ALL_SEVERITIES.map((s) => [s, entries.filter((e) => e.severity === s).length])
  ) as Record<FeedbackSeverity, number>;

  const byCategory = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, entries.filter((e) => e.category === c).length])
  ) as Record<FeedbackCategory, number>;

  // Build summary text
  const lines: string[] = [];
  lines.push(`Total findings: ${entries.length}`);

  if (bySeverity.critical > 0)
    lines.push(`  Critical: ${bySeverity.critical}`);
  if (bySeverity.major > 0) lines.push(`  Major: ${bySeverity.major}`);
  if (bySeverity.minor > 0) lines.push(`  Minor: ${bySeverity.minor}`);
  if (bySeverity.positive > 0)
    lines.push(`  Positive: ${bySeverity.positive}`);

  const activeCategories = ALL_CATEGORIES.filter((c) => byCategory[c] > 0);
  if (activeCategories.length > 0) {
    lines.push("By category:");
    for (const cat of activeCategories) {
      lines.push(`  ${cat}: ${byCategory[cat]}`);
    }
  }

  return {
    sessionId,
    totalEntries: entries.length,
    bySeverity,
    byCategory,
    entries: [...entries],
    summary: lines.join("\n"),
  };
}

/**
 * Clears all feedback for a session. Called when a session ends.
 */
export function clearFeedback(sessionId: string): void {
  feedbackStore.delete(sessionId);
}

/**
 * Removes a specific feedback entry by id.
 */
export function deleteFeedbackEntry(
  sessionId: string,
  entryId: string
): boolean {
  const entries = feedbackStore.get(sessionId);
  if (!entries) return false;

  const index = entries.findIndex((e) => e.id === entryId);
  if (index === -1) return false;

  entries.splice(index, 1);
  return true;
}
