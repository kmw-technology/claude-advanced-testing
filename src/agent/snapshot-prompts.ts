import type { AppSnapshot, GeneratedPersona } from "./snapshot-types.js";

/**
 * Build a condensed representation of the app snapshot for LLM consumption.
 * This is the "internal representation" that personas evaluate.
 */
function buildAppContext(snapshot: AppSnapshot): string {
  const sections: string[] = [];

  // App overview from the exploration report
  sections.push(`## App Exploration Report\n${snapshot.explorationReport}`);

  // Navigation structure
  if (snapshot.navigation.pages.length > 0) {
    const navLines = [`## Site Structure (${snapshot.navigation.pages.length} pages discovered)`];
    for (const page of snapshot.navigation.pages) {
      const parts = [`- **${page.title || page.url}**`];
      if (page.pageType) parts.push(`[${page.pageType}]`);
      parts.push(`— ${page.linkCount} links, ${page.formCount} forms, ${page.elementCount} interactive elements`);
      if (page.url !== page.title) parts.push(`\n  URL: ${page.url}`);
      navLines.push(parts.join(" "));
    }
    sections.push(navLines.join("\n"));
  }

  // Detailed page data
  const pagesWithContent = snapshot.pages.filter(
    (p) => p.visibleText || p.forms.length > 0 || p.interactiveElements.length > 0
  );

  if (pagesWithContent.length > 0) {
    sections.push("## Detailed Page Data");

    for (const page of pagesWithContent) {
      const pageLines = [`### ${page.title || page.url}`];
      pageLines.push(`URL: ${page.url}`);
      if (page.pageType) pageLines.push(`Type: ${page.pageType}`);
      if (page.screenshotPath) pageLines.push(`Screenshot: ${page.screenshotPath}`);

      // Visible text (condensed)
      if (page.visibleText) {
        const text = page.visibleText.slice(0, 3000);
        pageLines.push(`\n**Visible Content:**\n${text}`);
      }

      // Forms (full detail — critical for understanding what users can DO)
      if (page.forms.length > 0) {
        pageLines.push(`\n**Forms (${page.forms.length}):**`);
        for (const form of page.forms) {
          pageLines.push(`  [${form.method}] ${form.action} — ${form.fields.length} fields`);
          if (form.submitButton) pageLines.push(`  Submit: "${form.submitButton}"`);
          for (const field of form.fields) {
            const parts = [`    <${field.tag}>`];
            if (field.type) parts.push(`type="${field.type}"`);
            if (field.name) parts.push(`name="${field.name}"`);
            if (field.label) parts.push(`label="${field.label}"`);
            if (field.placeholder) parts.push(`placeholder="${field.placeholder}"`);
            if (field.required) parts.push("[REQUIRED]");
            pageLines.push(parts.join(" "));
          }
        }
      }

      // Interactive elements (what can the user click/do?)
      if (page.interactiveElements.length > 0) {
        pageLines.push(`\n**Interactive Elements (${page.interactiveElements.length}):**`);
        for (const el of page.interactiveElements.slice(0, 25)) {
          const parts = [`  [${el.tag}]`];
          if (el.role) parts.push(`role="${el.role}"`);
          if (el.text) parts.push(`"${el.text}"`);
          if (el.href) parts.push(`→ ${el.href}`);
          if (el.disabled) parts.push("[DISABLED]");
          pageLines.push(parts.join(" "));
        }
        if (page.interactiveElements.length > 25) {
          pageLines.push(`  ... and ${page.interactiveElements.length - 25} more`);
        }
      }

      // Accessibility
      if (page.accessibility) {
        const a = page.accessibility;
        pageLines.push(`\n**Accessibility:** ${a.passes} passes, ${a.violationCount} violations (${a.criticalCount} critical)`);
        for (const v of a.violations.slice(0, 5)) {
          pageLines.push(`  [${v.impact.toUpperCase()}] ${v.description} (${v.nodes} instances)`);
        }
      }

      // Performance
      if (page.performance) {
        const p = page.performance;
        pageLines.push(`\n**Performance:** ${p.loadTimeMs}ms load, ${p.totalRequests} requests (${p.failedRequests} failed), ${p.totalTransferSizeKB}KB`);
        if (p.consoleErrors.length > 0) {
          pageLines.push(`Console errors: ${p.consoleErrors.join("; ")}`);
        }
      }

      sections.push(pageLines.join("\n"));
    }
  }

  // Agent observations (what the exploration agent noticed)
  if (snapshot.agentObservations.length > 0) {
    const obsLines = ["## Agent Observations During Exploration"];
    for (const obs of snapshot.agentObservations) {
      if (obs.message.length > 50) {
        obsLines.push(`- ${obs.message.slice(0, 500)}`);
      }
    }
    sections.push(obsLines.join("\n"));
  }

  return sections.join("\n\n");
}

/**
 * Prompt for generating tailored personas based on the app snapshot.
 */
export function buildPersonaGenerationPrompt(
  snapshot: AppSnapshot,
  count: number = 4,
  language?: string
): string {
  const appContext = buildAppContext(snapshot);
  const langNote = language ? `\nGenerate persona names, backgrounds, and text in ${language}.` : "";

  return `You are a product research expert. Based on the following app exploration data, generate ${count} diverse user personas who would realistically use this app.

${appContext}

## Instructions

Analyze the app above and generate ${count} personas. Each persona should be a realistic person who would actually use this app in real life. Make them diverse along these axes:
- **Tech savviness**: Mix of low, medium, and high
- **Experience level**: From newcomer to power user
- **Use case**: Different primary reasons for using the app
- **Demographics**: Varied age, background, circumstances
- **Skepticism**: Some trusting, some cautious

Each persona must be tailored to THIS SPECIFIC APP — not generic user profiles. Reference actual features, pages, and content you see in the data.${langNote}

## Output Format

Respond with a JSON object exactly matching this structure:
{
  "appSummary": "2-3 sentences: what this app does and who it's for",
  "targetAudience": "The primary audience for this app",
  "personas": [
    {
      "name": "Realistic name",
      "role": "Their relationship to the app (e.g., 'freelance midwife with small practice')",
      "age": 34,
      "background": "2-3 sentences about their life, work, and context",
      "goals": ["What they want to accomplish with this app"],
      "painPoints": ["What frustrates them about tools like this"],
      "techSavviness": "low|medium|high",
      "whyTheyUseThisApp": "Specific reason they'd try this app",
      "evaluationFocus": ["Specific features/areas they'd pay attention to"]
    }
  ]
}

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Prompt for a persona to evaluate the app based on the snapshot.
 */
export function buildPersonaEvaluationPrompt(
  snapshot: AppSnapshot,
  persona: GeneratedPersona,
  language?: string
): string {
  const appContext = buildAppContext(snapshot);
  const langNote = language ? `\nWrite your evaluation in ${language}.` : "";

  return `You are ${persona.name}, ${persona.role}.

## About You
- **Age:** ${persona.age ?? "unspecified"}
- **Background:** ${persona.background}
- **Tech savviness:** ${persona.techSavviness}
- **Why you're here:** ${persona.whyTheyUseThisApp}
- **Your goals:** ${persona.goals.join(", ")}
- **Your pain points:** ${persona.painPoints.join(", ")}
- **You'll focus on:** ${persona.evaluationFocus.join(", ")}

## The App You're Evaluating

You've been given complete access to explore this app. Below is everything visible in the app — every page, every form, every button, every piece of content. Review it as if you were actually using the app.

${appContext}

## Your Task

Evaluate this app from YOUR perspective as ${persona.name}. Be authentic to your persona — a tech-savvy power user notices different things than a confused newcomer.${langNote}

For each of your goals, assess:
- Could you figure out how to accomplish it based on what you see?
- Are the right features/pages/forms available?
- Would anything confuse or frustrate you?
- What would delight you?

## Output Format

Respond with a JSON object exactly matching this structure:
{
  "scores": {
    "firstImpression": { "score": 7, "reason": "..." },
    "featureCompleteness": { "score": 6, "reason": "..." },
    "usability": { "score": 8, "reason": "..." },
    "trustAndCredibility": { "score": 5, "reason": "..." },
    "wouldRecommend": { "score": 7, "reason": "..." }
  },
  "journeyAssessments": [
    {
      "goal": "The goal you're trying to accomplish",
      "wouldSucceed": "yes|likely|unlikely|no",
      "reasoning": "Why you think you would/wouldn't succeed",
      "frictionPoints": ["Specific things that would slow you down"]
    }
  ],
  "findings": [
    {
      "severity": "critical|major|minor|positive",
      "title": "Short title",
      "description": "What you noticed, from your perspective",
      "affectedPage": "URL or page name",
      "recommendation": "What would make this better for you"
    }
  ],
  "wouldRecommend": true,
  "verdict": "2-3 sentence overall verdict from your persona's perspective"
}

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Prompt for cross-persona aggregation.
 */
export function buildAggregationPrompt(
  snapshot: AppSnapshot,
  personas: GeneratedPersona[],
  evaluations: Array<{ persona: GeneratedPersona; rawReport: string }>,
  language?: string
): string {
  const langNote = language ? `\nWrite in ${language}.` : "";

  const personaSummaries = evaluations
    .map(
      (e) =>
        `### ${e.persona.name} (${e.persona.role}, tech: ${e.persona.techSavviness})\n${e.rawReport}`
    )
    .join("\n\n");

  return `You are a product strategy advisor. ${personas.length} diverse user personas have each independently evaluated the same app. Your job is to synthesize their findings into actionable product intelligence.

## App
**URL:** ${snapshot.metadata.targetUrl}
**Pages discovered:** ${snapshot.metadata.pageCount}

## Individual Persona Evaluations

${personaSummaries}

## Your Task

Cross-reference all persona evaluations and produce:${langNote}

1. **Universal findings** — Issues or positives that MULTIPLE personas mentioned (these are the most important)
2. **Segment-specific findings** — Things only one persona type noticed (these reveal blind spots)
3. **Priority stack** — MUST FIX (blocks core users), SHOULD FIX (significant friction), NICE TO HAVE (polish)
4. **Overall score** — Weighted average across all personas (1-10)
5. **Readiness verdict** — Is this app ready for its target audience?

## Output Format

Respond with a JSON object:
{
  "universalFindings": [
    { "title": "...", "severity": "critical|major|minor|positive", "personaCount": 3, "personas": ["Name1", "Name2", "Name3"] }
  ],
  "priorityStack": [
    { "tier": "MUST FIX|SHOULD FIX|NICE TO HAVE", "title": "...", "rationale": "..." }
  ],
  "overallScore": 6.5,
  "readinessVerdict": "2-3 sentences: is this ready? What must happen first?",
  "topStrengths": ["...", "..."],
  "topWeaknesses": ["...", "..."]
}

Respond with ONLY the JSON object, no additional text.`;
}
