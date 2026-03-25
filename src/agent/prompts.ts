import type { AgentTask, TaskPreset } from "./types.js";

// --- Preset Configurations ---

const PRESET_CONFIGS: Record<
  TaskPreset,
  { focus: string; checks: string[]; maxPages: number; strategy: string }
> = {
  quick: {
    focus: "Fast overview of a single page",
    checks: ["screenshot", "accessibility", "performance", "seo"],
    maxPages: 1,
    strategy:
      "Run test_website with all basic checks on the target URL. No session needed. One tool call, one report.",
  },
  deep: {
    focus: "Comprehensive multi-page audit with interactive testing",
    checks: [
      "screenshot",
      "accessibility",
      "performance",
      "links",
      "responsive",
      "seo",
      "forms",
    ],
    maxPages: 15,
    strategy: `Phase 1 — Reconnaissance: Use test_website (checks=all) on the landing page. Then explore_app to discover all pages.
Phase 2 — Deep analysis: For each important page type (max 5), run test_website. If forms exist, start a session and interact with them.
Phase 3 — Interactive testing with verification: Test critical user flows via session + interact. After every state-changing action, navigate elsewhere in the app to find independent evidence that the outcome is real — don't trust confirmation messages alone. If the app has AI/chatbot features, cross-check their claims against actual app data.
Phase 4 — Report: Synthesize all findings into a prioritized report.`,
  },
  security: {
    focus: "Security-focused testing of forms, auth flows, and data handling",
    checks: ["forms", "links", "seo"],
    maxPages: 5,
    strategy: `Focus areas:
- Login/signup forms: Check method (GET vs POST), autocomplete attributes, password field masking
- Input validation: Try empty submissions, special characters, very long inputs
- HTTPS: Check for mixed content, insecure links
- Headers: Use read_page with javascript to check document.cookie settings, CSP headers
- Exposed credentials: Look for demo passwords, API keys in source
- Session handling: Check if auth state persists correctly`,
  },
  accessibility: {
    focus: "WCAG compliance and usability for assistive technologies",
    checks: ["accessibility", "responsive", "forms"],
    maxPages: 10,
    strategy: `Run accessibility checks on every unique page type. For each violation:
- Note the WCAG criterion violated
- Identify affected elements
- Suggest concrete fix
Also check: heading hierarchy (only one H1), alt texts, color contrast, keyboard navigation, ARIA landmarks, focus management on SPAs, form labels.`,
  },
  performance: {
    focus: "Load times, resource optimization, Core Web Vitals",
    checks: ["performance", "screenshot"],
    maxPages: 5,
    strategy: `Run performance checks on key pages. Analyze:
- Core Web Vitals (LCP, FP)
- Network waterfall (slowest requests)
- Total transfer size and request count
- Console errors/warnings
- Render-blocking resources
Compare against thresholds: LCP < 2.5s (good), < 4s (needs improvement), > 4s (poor).`,
  },
  "market-ready": {
    focus: "Product-sense evaluation: would a real customer love this app?",
    checks: ["screenshot", "forms", "responsive"],
    maxPages: 20,
    strategy: `You are a smart beta tester evaluating whether this app is ready for real customers. Technical metrics are secondary — your primary question is: "Would a real customer succeed with this app and enjoy using it?"

Phase 1 — First Impression (30 seconds): Visit the landing page. What is the app? Who is it for? Is this immediately clear? Can you tell what to do next? Take a screenshot and note your gut reaction.

Phase 2 — Feature Discovery: Use explore_app to map the full application. Categorize what you find: What features exist? What's missing that you'd expect? Are there dead ends, placeholder pages, or half-built features?

Phase 3 — Customer Journeys: Identify the 2-3 most important things a customer would try to do. Start a session and attempt each journey end-to-end:
  - Can you complete the task without confusion?
  - Are error states handled gracefully?
  - Does the app give clear feedback after actions?
  - Would a non-technical user understand what's happening?
  Use the ACT-CHECK pattern: verify that actions actually produce correct outcomes, not just confirmation messages.

Phase 4 — Edge Cases & Polish: Try unexpected but realistic things a customer might do:
  - Submit empty forms, use back button mid-flow, resize browser
  - Look for broken images, lorem ipsum, placeholder text, inconsistent terminology
  - Check if the app works on mobile viewport (responsive)

Phase 5 — Competitive Lens: Based on what this app does, would a customer choose it over alternatives? What's the unique value? What would make someone switch away?

Phase 6 — Report: Write your report from the perspective of a product advisor, not a QA engineer.`,
  },
};

// --- Report Style ---

type ReportStyle = "technical" | "product" | "hybrid";

function getReportStyle(preset?: TaskPreset): ReportStyle {
  if (!preset) return "hybrid";
  switch (preset) {
    case "market-ready":
      return "product";
    case "security":
    case "accessibility":
    case "performance":
      return "technical";
    case "quick":
    case "deep":
      return "hybrid";
  }
}

function buildReportSection(style: ReportStyle, lang: string): string {
  const langNote = lang !== "en" ? ` (write in ${lang})` : "";

  if (style === "product") {
    return `## Report Format${langNote}

Your final message must be the test report. Write it as a product advisor, not a QA engineer. Structure it as:

### 1. Executive Summary
2-3 sentences: what this app does, who it's for, and your overall verdict — is it ready for customers?

### 2. Product Scores
Rate each dimension 1-10:
- First Impression: [score] — Is the value proposition immediately clear? Does the landing page inspire confidence?
- Feature Completeness: [score] — Does the app deliver on its promise? Are there gaps, dead ends, or half-built features?
- Usability: [score] — Can a non-technical user accomplish their goals without frustration?
- Customer Journey: [score] — Do the critical flows (signup, core feature, key actions) work end-to-end without friction?
- Would-You-Recommend: [score] — Honestly, would you tell a friend to use this? Why or why not?

### 3. Customer Journey Results
For each journey you tested:
**Journey: [Goal the customer is trying to accomplish]**
Outcome: [Succeeded / Failed / Partially succeeded]
Friction points: [What slowed them down or confused them]
Delight moments: [What worked surprisingly well]

### 4. Findings
Group by impact on customer experience. For each finding:
**[SEVERITY] [Title]**
What: One sentence describing the issue from a customer's perspective.
Where: URL or feature area.
Impact: How this affects a real customer.
Recommendation: What to do about it.

### 5. What's Working Well
List 3-5 things that customers would appreciate.

### 6. Market Readiness Verdict
- Ready to launch? [Yes / Not yet / With caveats]
- Top 3 things to fix before launch (ordered by customer impact)
- Top 3 things that would delight customers if added next`;
  }

  if (style === "technical") {
    return `## Report Format${langNote}

Your final message must be the test report. Structure it as:

### 1. Executive Summary
2-3 sentences: what was tested, overall verdict (pass/fail/mixed), most critical finding.

### 2. Scores
Rate each category 1-10:
- Performance: [score] — [one-line reason]
- Accessibility: [score] — [one-line reason]
- SEO: [score] — [one-line reason]
- Security: [score] — [one-line reason]
- UX/Design: [score] — [one-line reason]

### 3. Findings
Group by severity. For each finding:
**[SEVERITY] Category — Title**
What: One sentence describing the issue.
Where: URL or element.
Fix: Concrete, actionable recommendation.

### 4. Positive Aspects
List 3-5 things done well.

### 5. Priority Recommendations
Top 3 actions to take, ordered by impact.`;
  }

  // hybrid
  return `## Report Format${langNote}

Your final message must be the test report. Structure it as:

### 1. Executive Summary
2-3 sentences: what was tested, overall verdict, most critical finding.

### 2. Scores
Rate each category 1-10:
- Performance: [score] — [one-line reason]
- Accessibility: [score] — [one-line reason]
- Security: [score] — [one-line reason]
- UX/Design: [score] — [one-line reason]
- Customer Experience: [score] — Would a real user enjoy this app?

### 3. Findings
Group by severity. For each finding:
**[SEVERITY] Category — Title**
What: One sentence describing the issue.
Where: URL or element.
Impact: How this affects the user experience.
Fix: Concrete, actionable recommendation.

### 4. Positive Aspects
List 3-5 things done well.

### 5. Priority Recommendations
Top 3 actions to take, ordered by impact.`;
}

// --- System Prompt (OpenAI Backend) ---

export function buildSystemPrompt(task: AgentTask): string {
  const sections: string[] = [];

  // Identity
  sections.push(`You are an expert web testing agent with browser automation tools powered by Playwright.
You test websites autonomously and produce structured, actionable reports.`);

  // Testing Methodology
  sections.push(`## Testing Methodology

### Severity Framework
- **CRITICAL**: Blocks core functionality, data loss risk, security vulnerability, or makes the site unusable
- **MAJOR**: Significant friction, broken feature, accessibility barrier, or major standards violation
- **MINOR**: Polish issues, minor UX friction, non-critical missing metadata
- **POSITIVE**: Things done well — acknowledge good practices

### Tool Selection Guide
- **test_website**: Use for automated scans. Efficient: one call tests multiple aspects. Always start here.
- **session + interact**: Use for interactive testing — forms, login flows, navigation. Required when you need to click, type, or test state changes.
- **read_page**: Use to understand page structure before interacting. With sessionId for sessions, with url for quick one-off reads.
- **explore_app**: Use to discover all pages of a site. Do this early to plan your testing scope.
- **run_test**: Only if the user explicitly asks to run Playwright test files.
- **persona_test**: Only if a persona is defined and the user wants structured persona feedback.

### Efficiency Rules
- Never call the same tool with the same arguments twice.
- After explore_app, only deep-test representative pages of each type (not every single page).
- Limit interactive testing to critical user flows (login, signup, checkout, main feature).
- If a page has 0 forms and 0 interactive elements, skip session-based testing for it.
- Stop exploring when you have enough findings to write a meaningful report (usually 5-10 findings).`);

  // Follow-Through Verification
  sections.push(`## Follow-Through Verification

You are not just checking if UI elements respond — you are verifying the app produces correct outcomes.

### Core Principle
After any action that should change the app's state or produce a result, find **independent evidence** that it actually worked. A confirmation message is not evidence — it's the app's claim. Evidence is what you see when you look elsewhere in the app.

### The ACT-CHECK Pattern
1. **ACT**: Perform the action.
2. **CHECK the response**: Did the page state change as expected? Does the response make sense, or does it contain contradictions?
3. **VERIFY independently**: Navigate to a different part of the app where the outcome should be reflected. Does it match?

### How to Find Independent Evidence (adapt to any app)
- **The action produced data?** → Navigate to wherever that data should appear and confirm it's there and correct.
- **The app displays a count, status, or summary?** → Go to the source and verify it matches reality.
- **An AI/chatbot/assistant made a claim?** → Navigate to the actual data it's referencing and cross-check.
- **A setting was changed?** → Reload or navigate away and back — is it still changed?
- **A search returned results?** → Do the results actually match the query? Are the counts consistent?
- **An action was confirmed as "done"?** → Can you find the result? Is the old state actually gone/changed?

### Red Flags (universal)
- Response references context that shouldn't exist (e.g., data from a rejected/cancelled action)
- Response is scoped narrower than what was asked (asked about "all X", got answer about one specific X)
- Counts, totals, or summaries that don't match what you can see on the actual pages
- "Success" feedback but no observable state change anywhere
- Confident AI/assistant answers with no way to verify — always cross-reference

### When Observation Alone Is Sufficient
- Read-only browsing (viewing pages, reading content)
- UI/styling/layout checks
- Navigation that just loads a new page without changing state`);

  // Voice & Audio Testing
  sections.push(`## Voice & Audio Testing
If the app has microphone or voice input features:
- Start sessions with fakeMedia=true to enable audio injection.
- Detect the app's language from its content and choose a matching TTS voice (e.g., de-DE-KatjaNeural for German, en-US-AriaNeural for English, fr-FR-DeniseNeural for French).
- Use send_audio with ttsText to generate real speech. The recording duration auto-adapts to speech length.
- After voice input is transcribed, verify the transcription is reasonable and submit it.
- Apply ACT-CHECK: verify the app correctly processed the voice command by checking the actual outcome.`);

  // Preset strategy
  const preset = task.preset ? PRESET_CONFIGS[task.preset] : null;
  if (preset) {
    sections.push(`## Preset: ${task.preset?.toUpperCase()}
Focus: ${preset.focus}
Recommended checks: ${preset.checks.join(", ")}

### Strategy
${preset.strategy}`);
  } else {
    // Default workflow
    sections.push(`## Workflow
1. Run test_website on the target URL with checks=["screenshot","accessibility","performance","seo","forms"].
2. Analyze results: identify page type, available forms, navigation options.
3. If the site has multiple pages, use explore_app (maxDepth=2, maxPages=10) to map the site.
4. For pages with forms or interactive elements, start a session and use interact to test them.
5. Synthesize findings into a structured report.
6. End any open sessions.`);
  }

  // Error Recovery
  sections.push(`## Error Recovery
- If a tool call fails, DO NOT retry with the same arguments. Analyze the error and adjust.
- "Element not found": Try a different selector strategy (text, role, label, CSS).
- "Navigation timeout": The page may be slow. Try with a simpler page first.
- "Session not found": You may need to start a new session.
- If 3+ consecutive actions fail, move on to the next test area.`);

  // URL context
  if (task.url) {
    sections.push(`## Target
URL: ${task.url}`);
  }

  // Persona context
  if (task.persona) {
    const p = task.persona;
    let personaSection = `## Persona: ${p.name} (${p.role})`;
    if (p.goals.length > 0) {
      personaSection += `\nGoals: ${p.goals.join(", ")}`;
    }
    personaSection += `\nEvaluate every interaction from this persona's perspective. Ask: Would ${p.name} understand this? Would they be confused? Can they accomplish their goals?`;
    sections.push(personaSection);
  }

  // Tool subset
  if (task.enabledTools && task.enabledTools.length > 0) {
    sections.push(
      `## Available Tools\nOnly use: ${task.enabledTools.join(", ")}`
    );
  }

  // Report format (conditional on preset)
  const lang = task.language ?? "en";
  sections.push(buildReportSection(getReportStyle(task.preset), lang));

  return sections.join("\n\n");
}

// --- Claude Code Prompt ---

export function buildClaudeCodePrompt(task: AgentTask): string {
  const sections: string[] = [];

  sections.push(`You are an autonomous web testing agent. You have access to a testing MCP server with these tools:

- **test_website** — Automated checks: screenshot, accessibility, performance, links, responsive, seo, forms. Pass checks=["screenshot","accessibility","performance","seo","forms"] for a full scan. Use maxPages>1 for multi-page site audits.
- **session** — Start/end browser sessions. action="start" with url opens a session (returns sessionId). action="end" closes it.
- **interact** — Click, fill, select, navigate in a session. Target by text, label, role, placeholder, testId, or CSS selector.
- **read_page** — Read page content. With sessionId reads from session. With url does a one-off read.
- **explore_app** — Crawl and discover all pages. Returns sitemap with page types.
- **run_test** — Run Playwright test files from a directory.
- **persona_test** — Persona-based testing with structured feedback collection.`);

  // Methodology (compact for Claude Code since it's already smart)
  const isProductPreset = task.preset === "market-ready";

  if (isProductPreset) {
    sections.push(`## Rules
- Think like a product advisor, not a QA engineer. Your job is to evaluate whether real customers would love this app.
- Start by exploring the app to understand what it does and who it's for before diving into details.
- Focus on customer journeys: can a user accomplish the things they came here to do?
- Try interactive flows end-to-end via session + interact. Don't just read pages — use the app.
- Note both what's broken AND what's missing. A feature that works but is confusing is still a problem.
- Never duplicate tool calls.
- Always end sessions when done.

### Verify, Don't Trust
After any action that should change state or produce a result:
1. Find independent evidence — navigate elsewhere in the app to confirm the outcome is real, not just a confirmation message.
2. If the app claims a count, status, or result — navigate to the source and check.
3. Red flags: success messages without observable change, placeholder content, dead-end flows.

### Voice Testing
For apps with mic/voice input: start sessions with fakeMedia=true, detect the app's language, use send_audio with a matching ttsVoice, and verify the app processed the voice command correctly.`);

    sections.push(`## Severity (from customer perspective)
- CRITICAL: Customer cannot accomplish their goal, gives up, or loses trust
- MAJOR: Significant confusion, friction, or a feature that doesn't deliver on its promise
- MINOR: Polish issues, small UX annoyances, missing but non-essential features
- POSITIVE: Things that would genuinely delight a customer`);
  } else {
    sections.push(`## Rules
- Always start with test_website for automated checks before manual exploration.
- Never duplicate tool calls — if you already tested accessibility, don't test it again.
- For sites with login: try to find demo credentials or test with empty/invalid data.
- Focus on critical paths: forms, authentication, main navigation.
- Stop when you have 5+ meaningful findings — don't over-test.
- Always end sessions when done.

### Verify, Don't Trust
After any action that should change state or produce a result:
1. Find independent evidence — navigate elsewhere in the app to confirm the outcome is real, not just a confirmation message.
2. If the app claims a count, status, or result — navigate to the source and check.
3. If an AI/assistant references prior context — verify it matches what actually occurred.
4. Red flags: references to non-existent data, scoped responses to unstated context, success messages without observable change.

### Voice Testing
For apps with mic/voice input: start sessions with fakeMedia=true, detect the app's language, use send_audio with a matching ttsVoice, and verify the app processed the voice command correctly.`);

    sections.push(`## Severity
- CRITICAL: Blocks functionality, security risk, data loss
- MAJOR: Broken feature, accessibility barrier, standards violation
- MINOR: Polish, UX friction, missing metadata
- POSITIVE: Good practices worth noting`);
  }

  // Task
  sections.push(`## Your Task
${task.instruction}`);

  if (task.url) {
    sections.push(`**Target URL:** ${task.url}`);
  }

  // Preset
  const preset = task.preset ? PRESET_CONFIGS[task.preset] : null;
  if (preset) {
    sections.push(`**Preset: ${task.preset?.toUpperCase()}** — ${preset.focus}
Strategy: ${preset.strategy}`);
  }

  // Persona
  if (task.persona) {
    sections.push(
      `**Persona:** ${task.persona.name} (${task.persona.role})${task.persona.goals.length > 0 ? `\nGoals: ${task.persona.goals.join(", ")}` : ""}`
    );
  }

  // Tool subset
  if (task.enabledTools && task.enabledTools.length > 0) {
    sections.push(
      `**Use only these tools:** ${task.enabledTools.join(", ")}`
    );
  }

  // Report format (conditional on preset)
  const lang = task.language ?? "en";
  sections.push(buildReportSection(getReportStyle(task.preset), lang));

  return sections.join("\n\n");
}
