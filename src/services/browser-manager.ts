import { chromium, Browser, BrowserContext, Page, devices } from "playwright";

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    });
  }
  return browserInstance;
}

export async function createContext(options?: {
  width?: number;
  height?: number;
  deviceName?: string;
  permissions?: string[];
  origin?: string;
}): Promise<BrowserContext> {
  const browser = await getBrowser();

  const contextOptions: Record<string, unknown> = {};

  if (options?.deviceName && options.deviceName in devices) {
    Object.assign(contextOptions, devices[options.deviceName]);
  } else {
    contextOptions.viewport = {
      width: options?.width ?? 1280,
      height: options?.height ?? 720,
    };
  }

  if (options?.permissions && options.origin) {
    contextOptions.permissions = options.permissions;
  }

  const context = await browser.newContext(contextOptions);

  // Grant permissions scoped to origin (Playwright requires this)
  if (options?.permissions && options.origin) {
    await context.grantPermissions(options.permissions, {
      origin: options.origin,
    });
  }

  return context;
}

export async function createPage(options?: {
  width?: number;
  height?: number;
  deviceName?: string;
}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await createContext(options);
  const page = await context.newPage();
  return { context, page };
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function navigateAndWait(
  page: Page,
  url: string,
  options?: {
    waitForSelector?: string;
    waitForTimeout?: number;
  }
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  if (options?.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
  }

  if (options?.waitForTimeout) {
    await page.waitForTimeout(options.waitForTimeout);
  }
}
