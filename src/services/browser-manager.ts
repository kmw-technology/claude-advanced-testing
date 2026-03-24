import { chromium, Browser, BrowserContext, Page, devices } from "playwright";

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
    });
  }
  return browserInstance;
}

export async function createContext(options?: {
  width?: number;
  height?: number;
  deviceName?: string;
}): Promise<BrowserContext> {
  const browser = await getBrowser();

  if (options?.deviceName && options.deviceName in devices) {
    return browser.newContext({
      ...devices[options.deviceName],
    });
  }

  return browser.newContext({
    viewport: {
      width: options?.width ?? 1280,
      height: options?.height ?? 720,
    },
  });
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
