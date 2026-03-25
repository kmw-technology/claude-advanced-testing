// --- App Snapshot Types ---

export interface SnapshotMetadata {
  id: string;
  targetUrl: string;
  createdAt: number;
  durationMs: number;
  toolCallCount: number;
  pageCount: number;
  snapshotDir: string;
}

export interface SnapshotPageData {
  url: string;
  title: string;
  pageType?: string;
  screenshotPath?: string; // relative to snapshot dir
  visibleText?: string;
  interactiveElements: Array<{
    tag: string;
    text: string;
    type?: string;
    role?: string;
    href?: string;
    disabled: boolean;
  }>;
  forms: Array<{
    action: string;
    method: string;
    fields: Array<{
      tag: string;
      type?: string;
      name?: string;
      label?: string;
      placeholder?: string;
      required: boolean;
      options?: string[];
    }>;
    submitButton?: string;
  }>;
  accessibility?: {
    passes: number;
    violationCount: number;
    criticalCount: number;
    violations: Array<{
      id: string;
      impact: string;
      description: string;
      nodes: number;
    }>;
  };
  performance?: {
    loadTimeMs: number;
    totalRequests: number;
    failedRequests: number;
    totalTransferSizeKB: number;
    consoleErrors: string[];
  };
  consoleErrors: string[];
  loadTimeMs?: number;
}

export interface SnapshotToolCall {
  stepNumber: number;
  tool: string;
  input: Record<string, unknown>;
  outputFull: string;
  screenshotPaths: string[];
  durationMs: number;
  timestamp: number;
}

export interface SnapshotAgentObservation {
  stepNumber: number;
  message: string;
  timestamp: number;
}

export interface AppSnapshot {
  metadata: SnapshotMetadata;
  pages: SnapshotPageData[];
  navigation: {
    startUrl: string;
    pages: Array<{
      url: string;
      title: string;
      pageType?: string;
      depth: number;
      linkCount: number;
      formCount: number;
      elementCount: number;
    }>;
  };
  toolCalls: SnapshotToolCall[];
  agentObservations: SnapshotAgentObservation[];
  explorationReport: string;
}

// --- Generated Persona ---

export interface GeneratedPersona {
  name: string;
  role: string;
  age?: number;
  background: string;
  goals: string[];
  painPoints: string[];
  techSavviness: "low" | "medium" | "high";
  whyTheyUseThisApp: string;
  evaluationFocus: string[];
}

// --- Persona Evaluation ---

export interface PersonaEvaluation {
  persona: GeneratedPersona;
  scores: Record<string, { score: number; reason: string }>;
  journeyAssessments: Array<{
    goal: string;
    wouldSucceed: "yes" | "likely" | "unlikely" | "no";
    reasoning: string;
    frictionPoints: string[];
  }>;
  findings: Array<{
    severity: "critical" | "major" | "minor" | "positive";
    title: string;
    description: string;
    affectedPage?: string;
    recommendation?: string;
  }>;
  wouldRecommend: boolean;
  verdict: string;
  rawReport: string;
}

// --- Cross-Persona Aggregation ---

export interface CrossPersonaAggregation {
  personaCount: number;
  evaluations: PersonaEvaluation[];
  universalFindings: Array<{
    title: string;
    severity: string;
    personaCount: number;
    personas: string[];
  }>;
  priorityStack: Array<{
    tier: "MUST FIX" | "SHOULD FIX" | "NICE TO HAVE";
    title: string;
    rationale: string;
  }>;
  overallScore: number;
  readinessVerdict: string;
  topStrengths?: string[];
  topWeaknesses?: string[];
  rawReport: string;
}

// --- Snapshot Run Result ---

export interface SnapshotRunResult {
  snapshot: AppSnapshot;
  personas: GeneratedPersona[];
  evaluations: PersonaEvaluation[];
  aggregation: CrossPersonaAggregation;
  snapshotDir: string;
  totalDurationMs: number;
}
