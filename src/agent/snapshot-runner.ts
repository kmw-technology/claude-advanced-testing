import OpenAI from "openai";
import { writeFileSync } from "fs";
import { join } from "path";
import type { AgentConfig, AgentTask } from "./types.js";
import type {
  AppSnapshot,
  GeneratedPersona,
  PersonaEvaluation,
  CrossPersonaAggregation,
  SnapshotRunResult,
} from "./snapshot-types.js";
import { SnapshotCollector } from "../services/snapshot-collector.js";
import { runAgent } from "./runner.js";
import {
  buildPersonaGenerationPrompt,
  buildPersonaEvaluationPrompt,
  buildAggregationPrompt,
} from "./snapshot-prompts.js";

export interface SnapshotConfig {
  url: string;
  personaCount?: number;
  language?: string;
  agentConfig: AgentConfig;
}

/**
 * Run the full 4-phase app snapshot pipeline:
 * 1. Explore the app (browser-based, saves everything)
 * 2. Generate tailored personas (LLM-based)
 * 3. Each persona evaluates the snapshot (LLM-based, no browser)
 * 4. Cross-persona aggregation (LLM-based)
 */
export async function runAppSnapshot(
  config: SnapshotConfig
): Promise<SnapshotRunResult> {
  const startTime = Date.now();
  const verbose = config.agentConfig.verbose ?? false;
  const personaCount = config.personaCount ?? 4;
  const model = config.agentConfig.openaiModel ?? "gpt-5-mini";

  // Ensure we have an OpenAI API key
  const apiKey =
    config.agentConfig.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key required for snapshot mode. Set OPENAI_API_KEY."
    );
  }

  const client = new OpenAI({ apiKey });

  // --- Phase 1: Exploration ---
  if (verbose) console.error("\n[snapshot] Phase 1: Exploring the app...\n");

  const collector = new SnapshotCollector(config.url);

  const explorationTask: AgentTask = {
    instruction: `Thoroughly explore this app and evaluate it from a product perspective. Discover all pages, try key features, test forms, and document everything you find. Take screenshots of important pages.`,
    url: config.url,
    preset: "market-ready",
    language: config.language,
  };

  const explorationConfig: AgentConfig = {
    ...config.agentConfig,
    backend: "openai",
    snapshotCollector: collector,
  };

  const explorationResult = await runAgent(explorationTask, explorationConfig);
  const snapshot = collector.finalize(explorationResult.finalAnswer);

  if (verbose) {
    console.error(
      `[snapshot] Exploration complete: ${snapshot.metadata.pageCount} pages, ${snapshot.metadata.toolCallCount} tool calls, ${snapshot.metadata.durationMs}ms`
    );
    console.error(`[snapshot] Snapshot saved to: ${collector.getSnapshotDir()}\n`);
  }

  // --- Phase 2: Persona Generation ---
  if (verbose)
    console.error(
      `[snapshot] Phase 2: Generating ${personaCount} tailored personas...\n`
    );

  const personaPrompt = buildPersonaGenerationPrompt(
    snapshot,
    personaCount,
    config.language
  );

  const personaResponse = await callLLM(client, model, personaPrompt, verbose);
  const personaData = parseJSON<{
    appSummary: string;
    targetAudience: string;
    personas: GeneratedPersona[];
  }>(personaResponse);

  const personas = personaData.personas.slice(0, personaCount);

  if (verbose) {
    console.error(`[snapshot] Generated ${personas.length} personas:`);
    for (const p of personas) {
      console.error(`  - ${p.name} (${p.role}, tech: ${p.techSavviness})`);
    }
    console.error("");
  }

  // Save personas
  writeFileSync(
    join(collector.getSnapshotDir(), "personas.json"),
    JSON.stringify(personaData, null, 2)
  );

  // --- Phase 3: Persona Evaluations ---
  if (verbose)
    console.error("[snapshot] Phase 3: Running persona evaluations...\n");

  const evaluations: PersonaEvaluation[] = [];

  for (const persona of personas) {
    if (verbose)
      console.error(
        `[snapshot]   Evaluating as: ${persona.name} (${persona.role})...`
      );

    const evalPrompt = buildPersonaEvaluationPrompt(
      snapshot,
      persona,
      config.language
    );

    const evalResponse = await callLLM(client, model, evalPrompt, verbose);
    const evalData = parseJSON<Omit<PersonaEvaluation, "persona" | "rawReport">>(evalResponse);

    evaluations.push({
      ...evalData,
      persona,
      rawReport: evalResponse,
    });

    if (verbose) {
      const recText = evalData.wouldRecommend ? "would recommend" : "would NOT recommend";
      console.error(`[snapshot]   → ${recText}. Verdict: ${evalData.verdict?.slice(0, 100)}...`);
    }
  }

  // Save evaluations
  writeFileSync(
    join(collector.getSnapshotDir(), "evaluations.json"),
    JSON.stringify(evaluations, null, 2)
  );

  if (verbose) console.error("");

  // --- Phase 4: Cross-Persona Aggregation ---
  if (verbose)
    console.error("[snapshot] Phase 4: Cross-persona aggregation...\n");

  const aggPrompt = buildAggregationPrompt(
    snapshot,
    personas,
    evaluations.map((e) => ({ persona: e.persona, rawReport: e.rawReport })),
    config.language
  );

  const aggResponse = await callLLM(client, model, aggPrompt, verbose);
  const aggData = parseJSON<Omit<CrossPersonaAggregation, "personaCount" | "evaluations" | "rawReport">>(aggResponse);

  const aggregation: CrossPersonaAggregation = {
    ...aggData,
    personaCount: personas.length,
    evaluations,
    rawReport: aggResponse,
  };

  // Save aggregation
  writeFileSync(
    join(collector.getSnapshotDir(), "aggregation.json"),
    JSON.stringify(aggregation, null, 2)
  );

  // Save human-readable final report
  const finalReport = formatFinalReport(snapshot, personaData, evaluations, aggregation);
  writeFileSync(
    join(collector.getSnapshotDir(), "final-report.md"),
    finalReport
  );

  if (verbose) {
    console.error(
      `[snapshot] Complete! All results saved to: ${collector.getSnapshotDir()}`
    );
    console.error(
      `[snapshot] Total duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`
    );
  }

  return {
    snapshot,
    personas,
    evaluations,
    aggregation,
    snapshotDir: collector.getSnapshotDir(),
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Make a single LLM call expecting JSON output.
 */
async function callLLM(
  client: OpenAI,
  model: string,
  prompt: string,
  verbose: boolean
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? "";
    if (verbose) {
      const tokens = response.usage?.total_tokens ?? 0;
      console.error(`[snapshot]   LLM call: ${tokens} tokens`);
    }
    return content;
  } catch (err) {
    throw new Error(
      `LLM call failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Parse JSON from LLM response, with error tolerance.
 */
function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error(`Failed to parse LLM response as JSON: ${text.slice(0, 200)}`);
  }
}

/**
 * Format the final human-readable report.
 */
function formatFinalReport(
  snapshot: AppSnapshot,
  personaData: { appSummary: string; targetAudience: string },
  evaluations: PersonaEvaluation[],
  aggregation: CrossPersonaAggregation
): string {
  const lines: string[] = [];

  lines.push("# App Snapshot Report");
  lines.push(`**URL:** ${snapshot.metadata.targetUrl}`);
  lines.push(`**Date:** ${new Date(snapshot.metadata.createdAt).toISOString().slice(0, 10)}`);
  lines.push(`**Pages discovered:** ${snapshot.metadata.pageCount}`);
  lines.push(`**Personas tested:** ${evaluations.length}`);
  lines.push("");

  // App Summary
  lines.push("## What This App Does");
  lines.push(personaData.appSummary);
  lines.push(`**Target audience:** ${personaData.targetAudience}`);
  lines.push("");

  // Overall Score
  lines.push(`## Overall Score: ${aggregation.overallScore}/10`);
  lines.push(aggregation.readinessVerdict);
  lines.push("");

  // Persona Results
  lines.push("## Persona Evaluations");
  lines.push("");
  for (const evaluation of evaluations) {
    const p = evaluation.persona;
    const rec = evaluation.wouldRecommend ? "Would recommend" : "Would NOT recommend";
    lines.push(`### ${p.name} (${p.role})`);
    lines.push(`Tech: ${p.techSavviness} | ${rec}`);
    if (evaluation.scores) {
      const scoreEntries = Object.entries(evaluation.scores);
      for (const [dim, data] of scoreEntries) {
        lines.push(`- ${dim}: ${data.score}/10 — ${data.reason}`);
      }
    }
    lines.push(`**Verdict:** ${evaluation.verdict}`);
    lines.push("");
  }

  // Universal Findings
  if (aggregation.universalFindings?.length > 0) {
    lines.push("## Universal Findings (multiple personas)");
    for (const f of aggregation.universalFindings) {
      lines.push(
        `- **[${f.severity.toUpperCase()}]** ${f.title} (${f.personaCount}/${evaluations.length} personas: ${f.personas.join(", ")})`
      );
    }
    lines.push("");
  }

  // Priority Stack
  if (aggregation.priorityStack?.length > 0) {
    lines.push("## Priority Stack");
    for (const tier of ["MUST FIX", "SHOULD FIX", "NICE TO HAVE"]) {
      const items = aggregation.priorityStack.filter(
        (p) => p.tier === tier
      );
      if (items.length > 0) {
        lines.push(`\n**${tier}:**`);
        for (const item of items) {
          lines.push(`- ${item.title} — ${item.rationale}`);
        }
      }
    }
    lines.push("");
  }

  // Strengths & Weaknesses
  if (aggregation.topStrengths && aggregation.topStrengths.length > 0) {
    lines.push("## Top Strengths");
    for (const s of aggregation.topStrengths) lines.push(`- ${s}`);
    lines.push("");
  }
  if (aggregation.topWeaknesses && aggregation.topWeaknesses.length > 0) {
    lines.push("## Top Weaknesses");
    for (const w of aggregation.topWeaknesses) lines.push(`- ${w}`);
  }

  return lines.join("\n");
}

/**
 * Format snapshot result for CLI output.
 */
export function formatSnapshotResult(result: SnapshotRunResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("  App Snapshot Report");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`URL: ${result.snapshot.metadata.targetUrl}`);
  lines.push(`Pages: ${result.snapshot.metadata.pageCount}`);
  lines.push(`Personas: ${result.personas.length}`);
  lines.push(`Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push(`Saved to: ${result.snapshotDir}`);
  lines.push("");

  lines.push(`Overall Score: ${result.aggregation.overallScore}/10`);
  lines.push(result.aggregation.readinessVerdict);
  lines.push("");

  // Per-persona summary
  lines.push("-".repeat(60));
  lines.push("  Persona Results");
  lines.push("-".repeat(60));
  for (const evaluation of result.evaluations) {
    const p = evaluation.persona;
    const rec = evaluation.wouldRecommend ? "RECOMMEND" : "NOT RECOMMEND";
    lines.push(`\n  ${p.name} (${p.role}) — ${rec}`);
    lines.push(`  ${evaluation.verdict}`);
  }

  // Priority stack
  if (result.aggregation.priorityStack?.length > 0) {
    lines.push("");
    lines.push("-".repeat(60));
    lines.push("  Priority Stack");
    lines.push("-".repeat(60));
    for (const item of result.aggregation.priorityStack) {
      lines.push(`\n  [${item.tier}] ${item.title}`);
      lines.push(`  ${item.rationale}`);
    }
  }

  lines.push("");
  lines.push("=".repeat(60));
  lines.push(`Full report: ${join(result.snapshotDir, "final-report.md")}`);
  lines.push("=".repeat(60));

  return lines.join("\n");
}
