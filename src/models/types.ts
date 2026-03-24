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
