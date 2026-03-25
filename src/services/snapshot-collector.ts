import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { ToolOutput } from "../agent/types.js";
import type {
  AppSnapshot,
  SnapshotMetadata,
  SnapshotPageData,
  SnapshotToolCall,
  SnapshotAgentObservation,
} from "../agent/snapshot-types.js";

export class SnapshotCollector {
  private snapshotDir: string;
  private screenshotDir: string;
  private screenshotCounter = 0;
  private toolCalls: SnapshotToolCall[] = [];
  private observations: SnapshotAgentObservation[] = [];
  private pageDataMap = new Map<string, SnapshotPageData>();
  private navPages: Array<{
    url: string;
    title: string;
    pageType?: string;
    depth: number;
    linkCount: number;
    formCount: number;
    elementCount: number;
  }> = [];
  private startTime: number;
  private targetUrl: string;

  constructor(targetUrl: string) {
    this.targetUrl = targetUrl;
    this.startTime = Date.now();

    // Create snapshot directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const projectRoot = join(
      import.meta.url.replace("file:///", "").replace(/\/[^/]+\/[^/]+$/, ""),
      "..",
      ".."
    );
    // Use a simpler approach for the path
    this.snapshotDir = join(
      process.cwd(),
      "artifacts",
      "snapshots",
      timestamp
    );
    this.screenshotDir = join(this.snapshotDir, "screenshots");

    mkdirSync(this.screenshotDir, { recursive: true });
  }

  getSnapshotDir(): string {
    return this.snapshotDir;
  }

  /**
   * Record a tool call with its FULL output (before truncation).
   * Saves screenshots to disk and extracts page data.
   */
  recordToolCall(
    stepNumber: number,
    toolName: string,
    input: Record<string, unknown>,
    fullOutput: ToolOutput,
    durationMs: number
  ): void {
    // Save screenshots from images array
    const screenshotPaths: string[] = [];
    if (fullOutput.images) {
      for (const img of fullOutput.images) {
        const path = this.saveScreenshot(
          img.data,
          `${toolName}-${stepNumber}`
        );
        screenshotPaths.push(path);
      }
    }

    // Record the tool call with full text
    this.toolCalls.push({
      stepNumber,
      tool: toolName,
      input,
      outputFull: fullOutput.text,
      screenshotPaths,
      durationMs,
      timestamp: Date.now(),
    });

    // Extract structured page data from tool outputs
    this.extractPageData(toolName, input, fullOutput.text, screenshotPaths);
  }

  /**
   * Record agent reasoning between tool calls.
   */
  recordObservation(stepNumber: number, message: string): void {
    this.observations.push({
      stepNumber,
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Finalize: write snapshot.json, return the AppSnapshot.
   */
  finalize(explorationReport: string): AppSnapshot {
    const metadata: SnapshotMetadata = {
      id: this.snapshotDir.split(/[\\/]/).pop() ?? "unknown",
      targetUrl: this.targetUrl,
      createdAt: this.startTime,
      durationMs: Date.now() - this.startTime,
      toolCallCount: this.toolCalls.length,
      pageCount: this.pageDataMap.size,
      snapshotDir: this.snapshotDir,
    };

    const snapshot: AppSnapshot = {
      metadata,
      pages: [...this.pageDataMap.values()],
      navigation: {
        startUrl: this.targetUrl,
        pages: this.navPages,
      },
      toolCalls: this.toolCalls,
      agentObservations: this.observations,
      explorationReport,
    };

    // Write snapshot.json (without full tool output text to keep it readable)
    const snapshotForDisk = {
      ...snapshot,
      toolCalls: snapshot.toolCalls.map((tc) => ({
        ...tc,
        // Keep first 2000 chars of each tool output in the JSON
        outputFull:
          tc.outputFull.length > 2000
            ? tc.outputFull.slice(0, 2000) + "\n[... truncated for disk ...]"
            : tc.outputFull,
      })),
    };
    writeFileSync(
      join(this.snapshotDir, "snapshot.json"),
      JSON.stringify(snapshotForDisk, null, 2)
    );

    return snapshot;
  }

  /**
   * Save a base64 PNG to disk. Returns path relative to snapshot dir.
   */
  private saveScreenshot(base64Data: string, label: string): string {
    this.screenshotCounter++;
    const filename = `${String(this.screenshotCounter).padStart(3, "0")}-${label}.png`;
    const fullPath = join(this.screenshotDir, filename);
    writeFileSync(fullPath, Buffer.from(base64Data, "base64"));
    return `screenshots/${filename}`;
  }

  /**
   * Extract structured page data from tool output text.
   */
  private extractPageData(
    toolName: string,
    input: Record<string, unknown>,
    outputText: string,
    screenshotPaths: string[]
  ): void {
    if (toolName === "explore_app") {
      this.parseExploreOutput(outputText);
    } else if (toolName === "test_website") {
      this.parseTestWebsiteOutput(input, outputText, screenshotPaths);
    } else if (
      toolName === "read_page" ||
      toolName === "interact" ||
      toolName === "session"
    ) {
      this.parsePageStateOutput(toolName, input, outputText, screenshotPaths);
    }
  }

  /**
   * Parse explore_app output to build navigation map.
   */
  private parseExploreOutput(output: string): void {
    // Parse the sitemap format from explore_app
    const pageBlocks = output.split(/\n(?=\s*\S.*\[)/);
    for (const block of pageBlocks) {
      const urlMatch = block.match(/URL:\s*(\S+)/);
      const titleMatch = block.match(/^[\s]*(.+?)\s*\[/);
      const typeMatch = block.match(/\[(\w+)\]/);
      const linksMatch = block.match(/Links:\s*(\d+)/);
      const formsMatch = block.match(/Forms:\s*(\d+)/);
      const elementsMatch = block.match(/Interactive:\s*(\d+)/);
      const loadMatch = block.match(/Load:\s*(\d+)ms/);
      const depthMatch = block.match(/depth[:\s]*(\d+)/i);

      if (urlMatch) {
        const url = urlMatch[1];
        this.navPages.push({
          url,
          title: titleMatch?.[1]?.trim() ?? "",
          pageType: typeMatch?.[1],
          depth: depthMatch ? parseInt(depthMatch[1]) : 0,
          linkCount: linksMatch ? parseInt(linksMatch[1]) : 0,
          formCount: formsMatch ? parseInt(formsMatch[1]) : 0,
          elementCount: elementsMatch ? parseInt(elementsMatch[1]) : 0,
        });

        // Create basic page data entry
        if (!this.pageDataMap.has(url)) {
          this.pageDataMap.set(url, {
            url,
            title: titleMatch?.[1]?.trim() ?? "",
            pageType: typeMatch?.[1],
            interactiveElements: [],
            forms: [],
            consoleErrors: [],
            loadTimeMs: loadMatch ? parseInt(loadMatch[1]) : undefined,
          });
        }
      }
    }
  }

  /**
   * Parse test_website output for page data.
   */
  private parseTestWebsiteOutput(
    input: Record<string, unknown>,
    output: string,
    screenshotPaths: string[]
  ): void {
    const url = (input.url as string) ?? this.targetUrl;
    const existing = this.pageDataMap.get(url) ?? {
      url,
      title: "",
      interactiveElements: [],
      forms: [],
      consoleErrors: [],
    };

    // Extract title from screenshot section
    const titleMatch = output.match(/---\s*Screenshot\s*---\s*\n"(.+?)"/);
    if (titleMatch) existing.title = titleMatch[1];

    // Assign first screenshot
    if (screenshotPaths.length > 0 && !existing.screenshotPath) {
      existing.screenshotPath = screenshotPaths[0];
    }

    // Extract accessibility data
    const a11yMatch = output.match(
      /Passes:\s*(\d+)\s*\|\s*Violations:\s*(\d+)/
    );
    if (a11yMatch) {
      const criticalMatch = output.match(/Critical:\s*(\d+)/);
      existing.accessibility = {
        passes: parseInt(a11yMatch[1]),
        violationCount: parseInt(a11yMatch[2]),
        criticalCount: criticalMatch ? parseInt(criticalMatch[1]) : 0,
        violations: [],
      };

      // Parse individual violations
      const violationRegex =
        /\[(?:CRITICAL|SERIOUS|MODERATE|MINOR)]\s*(.+?)\s*\((\d+)\s*instance/g;
      let match;
      while ((match = violationRegex.exec(output)) !== null) {
        existing.accessibility.violations.push({
          id: match[1].trim(),
          impact: match[0].includes("CRITICAL")
            ? "critical"
            : match[0].includes("SERIOUS")
              ? "serious"
              : "moderate",
          description: match[1].trim(),
          nodes: parseInt(match[2]),
        });
      }
    }

    // Extract performance data
    const perfMatch = output.match(
      /Load:\s*(\d+)ms.*?Requests:\s*(\d+)\s*\((\d+)\s*failed\).*?Transfer:\s*([\d.]+)\s*KB/s
    );
    if (perfMatch) {
      existing.performance = {
        loadTimeMs: parseInt(perfMatch[1]),
        totalRequests: parseInt(perfMatch[2]),
        failedRequests: parseInt(perfMatch[3]),
        totalTransferSizeKB: parseFloat(perfMatch[4]),
        consoleErrors: [],
      };

      // Extract console errors
      const consoleSection = output.match(
        /Console errors:\s*(\d+)\n([\s\S]*?)(?=\n(?:Slowest|---|\n))/
      );
      if (consoleSection) {
        const errors = consoleSection[2]
          .split("\n")
          .filter((l) => l.trim().startsWith("-"))
          .map((l) => l.trim().replace(/^-\s*/, ""));
        existing.performance.consoleErrors = errors;
      }
    }

    // Extract forms
    const formsMatch = output.match(/---\s*Forms\s*---\s*\n([\s\S]*?)(?=\n---|\n\n|$)/);
    if (formsMatch) {
      existing.forms = this.parseForms(formsMatch[1]);
    }

    this.pageDataMap.set(url, existing);
  }

  /**
   * Parse page state from interact/read_page/session outputs.
   */
  private parsePageStateOutput(
    _toolName: string,
    input: Record<string, unknown>,
    output: string,
    screenshotPaths: string[]
  ): void {
    const urlMatch = output.match(/URL:\s*(\S+)/);
    const url =
      urlMatch?.[1] ??
      (input.url as string) ??
      (input.sessionId ? "session" : this.targetUrl);

    if (url === "session") return;

    const existing = this.pageDataMap.get(url) ?? {
      url,
      title: "",
      interactiveElements: [],
      forms: [],
      consoleErrors: [],
    };

    // Extract title
    const titleMatch = output.match(/Title:\s*(.+)/);
    if (titleMatch) existing.title = titleMatch[1].trim();

    // Assign screenshot
    if (screenshotPaths.length > 0 && !existing.screenshotPath) {
      existing.screenshotPath = screenshotPaths[0];
    }

    // Extract visible text
    const textMatch = output.match(
      /Visible Text:\s*\n([\s\S]*?)(?=\nInteractive|Forms|$)/
    );
    if (textMatch && textMatch[1].trim().length > 0) {
      existing.visibleText = textMatch[1].trim().slice(0, 5000);
    }

    // Extract interactive elements
    const elementsSection = output.match(
      /Interactive Elements\s*\((\d+)\):\s*\n([\s\S]*?)(?=\nVisible Text|Forms|Console|$)/
    );
    if (elementsSection) {
      const lines = elementsSection[2]
        .split("\n")
        .filter((l) => l.trim().startsWith("["));
      existing.interactiveElements = lines.slice(0, 30).map((line) => {
        const tagMatch = line.match(/\[(\w+)]/);
        const textMatch = line.match(/"([^"]+)"/);
        const roleMatch = line.match(/role="([^"]+)"/);
        const typeMatch = line.match(/type="([^"]+)"/);
        const hrefMatch = line.match(/→\s*(\S+)/);
        return {
          tag: tagMatch?.[1] ?? "unknown",
          text: textMatch?.[1] ?? "",
          role: roleMatch?.[1],
          type: typeMatch?.[1],
          href: hrefMatch?.[1],
          disabled: line.includes("[DISABLED]"),
        };
      });
    }

    // Extract forms
    const formsSection = output.match(
      /Forms\s*\(\d+\):\s*\n([\s\S]*?)(?=\nInteractive|Visible Text|Console|$)/
    );
    if (formsSection) {
      existing.forms = this.parseForms(formsSection[1]);
    }

    this.pageDataMap.set(url, existing);
  }

  /**
   * Parse form text into structured form data.
   */
  private parseForms(
    text: string
  ): SnapshotPageData["forms"] {
    const forms: SnapshotPageData["forms"] = [];
    const formBlocks = text.split(/\n(?=\s*\[(?:GET|POST)])/);

    for (const block of formBlocks) {
      const headerMatch = block.match(
        /\[(GET|POST)]\s*(\S+)\s*—\s*(\d+)\s*fields?\s*(?:—\s*Submit:\s*"(.+?)")?/
      );
      if (!headerMatch) continue;

      const fields: SnapshotPageData["forms"][0]["fields"] = [];
      const fieldRegex =
        /<(\w+)>\s*(?:type="(\w+)")?\s*(?:name="(\w+)")?\s*(?:placeholder="([^"]*)")?\s*(\[REQUIRED])?/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(block)) !== null) {
        fields.push({
          tag: fieldMatch[1],
          type: fieldMatch[2],
          name: fieldMatch[3],
          placeholder: fieldMatch[4],
          required: !!fieldMatch[5],
        });
      }

      forms.push({
        action: headerMatch[2],
        method: headerMatch[1],
        fields,
        submitButton: headerMatch[4],
      });
    }

    return forms;
  }
}
