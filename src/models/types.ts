export interface ScreenshotOptions {
  url: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
  deviceName?: string;
  waitForSelector?: string;
  waitForTimeout?: number;
}

export interface ScreenshotResult {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  url: string;
  title: string;
}

export interface AccessibilityViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  description: string;
  helpUrl: string;
  nodes: number;
  elements: string[];
}

export interface AccessibilityResult {
  url: string;
  violations: AccessibilityViolation[];
  passes: number;
  violationCount: number;
  criticalCount: number;
  seriousCount: number;
}

export interface ConsoleEntry {
  type: string;
  text: string;
  location?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  resourceType: string;
  failed: boolean;
  failureText?: string;
}

export interface PerformanceMetrics {
  url: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  largestContentfulPaint?: number;
  totalRequests: number;
  failedRequests: number;
  totalTransferSize: number;
  consoleErrors: ConsoleEntry[];
  consoleWarnings: ConsoleEntry[];
  networkRequests: NetworkRequest[];
}

export interface LinkCheckResult {
  url: string;
  status: number | null;
  ok: boolean;
  redirectUrl?: string;
  error?: string;
}

export interface LinkCheckReport {
  baseUrl: string;
  totalLinks: number;
  brokenLinks: LinkCheckResult[];
  redirectLinks: LinkCheckResult[];
  workingLinks: number;
}

export interface VisualDiffResult {
  url: string;
  viewports: {
    name: string;
    width: number;
    height: number;
    screenshot: string;
  }[];
}

export interface FormField {
  tag: string;
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  required: boolean;
  label?: string;
}

export interface FormTestResult {
  url: string;
  forms: {
    action: string;
    method: string;
    fields: FormField[];
    submitButton?: string;
  }[];
}

export interface SeoData {
  url: string;
  title: string;
  metaDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  canonicalUrl?: string;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  hasRobotsMeta: boolean;
  robotsContent?: string;
  structuredData: unknown[];
  images: {
    src: string;
    alt: string;
    hasAlt: boolean;
  }[];
  imagesWithoutAlt: number;
  totalImages: number;
  internalLinks: number;
  externalLinks: number;
}

// --- Session & Interactive Testing Types ---

import type { BrowserContext, Page } from "playwright";

export interface SessionData {
  id: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastAccessedAt: number;
  url: string;
  consoleErrors: ConsoleEntry[];
  dialogMessages: string[];
  deviceName?: string;
  width: number;
  height: number;
}

export interface SessionInfo {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  lastAccessedAt: number;
  deviceName?: string;
  width: number;
  height: number;
}

export interface InteractiveElement {
  tag: string;
  type?: string;
  role?: string;
  text: string;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled: boolean;
  checked?: boolean;
  value?: string;
  href?: string;
  ariaLabel?: string;
}

export interface PageFormField {
  tag: string;
  type?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  required: boolean;
  options?: string[];
}

export interface PageFormInfo {
  action: string;
  method: string;
  fields: PageFormField[];
  submitButton?: string;
}

export interface PageState {
  url: string;
  title: string;
  interactiveElements: InteractiveElement[];
  visibleText?: string;
  forms: PageFormInfo[];
  notifications: string[];
  consoleErrors: ConsoleEntry[];
  screenshot?: string;
}

export type InteractionAction =
  | "click"
  | "fill"
  | "select"
  | "check"
  | "uncheck"
  | "hover"
  | "press_key"
  | "scroll"
  | "navigate"
  | "go_back"
  | "go_forward"
  | "wait"
  | "submit";

export interface InteractResult {
  success: boolean;
  action: InteractionAction;
  pageState: PageState;
  error?: string;
  dialogMessage?: string;
  duration: number;
}

export interface DiscoveredPage {
  url: string;
  title: string;
  links: string[];
  forms: PageFormInfo[];
  interactiveElementCount: number;
  depth: number;
}

export interface ExploreResult {
  startUrl: string;
  pagesDiscovered: number;
  pages: DiscoveredPage[];
  errors: { url: string; error: string }[];
}

// --- SPA Wait Types ---

export interface SpaSettlementResult {
  urlChanged: boolean;
  previousUrl: string;
  currentUrl: string;
  domMutationCount: number;
  settledAfterMs: number;
}

export interface WaitStrategyConfig {
  minWait: number;
  maxWait: number;
  networkQuiet: boolean;
  quietPeriod: number;
}

// --- Feedback Collection Types ---

export type FeedbackCategory =
  | "bug"
  | "ux_issue"
  | "confusion"
  | "accessibility_issue"
  | "performance_issue"
  | "missing_feature"
  | "positive";

export type FeedbackSeverity = "critical" | "major" | "minor" | "positive";

export interface FeedbackEntry {
  id: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  description: string;
  url: string;
  element?: string;
  screenshotBase64?: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

export interface FeedbackReport {
  sessionId: string;
  totalEntries: number;
  bySeverity: Record<FeedbackSeverity, number>;
  byCategory: Record<FeedbackCategory, number>;
  entries: FeedbackEntry[];
  summary: string;
}

// --- Enhanced Explore Types ---

import type { PageType } from "../services/page-classifier.js";

export interface EnhancedDiscoveredPage extends DiscoveredPage {
  pageType: PageType;
  screenshotBase64?: string;
  screenshotHash?: string;
  isScreenshotDuplicate: boolean;
  consentBannerFound: boolean;
  consentBannerDismissed: boolean;
  loadTimeMs: number;
  contentSummary: {
    wordCount: number;
    imageCount: number;
    hasMainContent: boolean;
  };
}

export interface EnhancedExploreResult {
  startUrl: string;
  pagesDiscovered: number;
  pages: EnhancedDiscoveredPage[];
  errors: { url: string; error: string }[];
  uniqueScreenshots: number;
  duplicateScreenshots: number;
  pageTypeDistribution: Record<string, number>;
  totalDurationMs: number;
}

// --- Persona Testing Types ---

export interface PersonaDefinition {
  name: string;
  role: string;
  background: string;
  goals: string[];
  painPoints: string[];
  techSavviness: "low" | "medium" | "high";
  language?: string;
  disabilities?: string[];
  device?: string;
}

export interface PersonaTestConfig {
  sessionId: string;
  persona: PersonaDefinition;
  targetUrl: string;
  testingChecklist: string[];
  startedAt: number;
}

export interface PersonaTestReport {
  persona: PersonaDefinition;
  targetUrl: string;
  feedbackReport: FeedbackReport;
  testingDurationMs: number;
  checklistCompleted: string[];
  overallSentiment: "positive" | "mixed" | "negative";
}

// --- Site Audit Types ---

export interface PageAuditResult {
  url: string;
  title: string;
  pageType: string;
  stages: {
    access: {
      success: boolean;
      loadTimeMs: number;
      error?: string;
    };
    capture: {
      screenshotBase64?: string;
    };
    extraction: {
      wordCount: number;
      imageCount: number;
      linkCount: number;
      formCount: number;
      interactiveElementCount: number;
      seo?: SeoData;
    };
    accessibility?: AccessibilityResult;
    performance?: PerformanceMetrics;
  };
}

export interface SiteAuditReport {
  targetUrl: string;
  pagesAudited: number;
  totalDurationMs: number;
  pages: PageAuditResult[];
  summary: {
    totalAccessibilityViolations: number;
    criticalViolations: number;
    averageLoadTimeMs: number;
    slowestPage: { url: string; loadTimeMs: number };
    brokenLinks: number;
    seoIssues: string[];
    pageTypeDistribution: Record<string, number>;
  };
}
