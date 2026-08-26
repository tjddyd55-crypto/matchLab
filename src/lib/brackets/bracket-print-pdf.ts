import "server-only";

import { getServerAppBaseUrl } from "@/lib/qr-url";

function shouldUseBundledChromium(): boolean {
  return (
    process.platform === "linux" &&
    (process.env.RAILWAY_ENVIRONMENT_NAME === "production" ||
      process.env.RAILWAY_ENVIRONMENT === "production" ||
      process.env.NODE_ENV === "production")
  );
}

async function launchPdfBrowser() {
  if (shouldUseBundledChromium()) {
    const [{ chromium: playwright }, chromium] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium"),
    ]);
    return playwright.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  const { chromium } = await import("playwright-core");
  return chromium.launch({ headless: true });
}

/**
 * print route를 headless chromium으로 렌더해 PDF 생성.
 * 화면·인쇄와 동일한 HTML/CSS를 사용한다.
 */
export async function generateBracketPrintPdfBuffer(params: {
  eventId: string;
  cookieHeader: string | null;
  mode?: "court" | "all-matches";
}): Promise<Buffer> {
  const modeQuery =
    params.mode === "all-matches" ? "?mode=all-matches" : "";
  const path = `/organizer/events/${params.eventId}/brackets/print${modeQuery}`;
  return renderPrintPathToPdfBuffer({
    path,
    cookieHeader: params.cookieHeader,
  });
}

export async function generateUnmatchedPrintPdfBuffer(params: {
  eventId: string;
  cookieHeader: string | null;
}): Promise<Buffer> {
  return renderPrintPathToPdfBuffer({
    path: `/organizer/events/${params.eventId}/brackets/unmatched-print`,
    cookieHeader: params.cookieHeader,
  });
}

async function renderPrintPathToPdfBuffer(params: {
  path: string;
  cookieHeader: string | null;
}): Promise<Buffer> {
  const baseUrl = getServerAppBaseUrl();
  if (!baseUrl) {
    throw new Error("APP base URL이 설정되지 않았습니다.");
  }

  const browser = await launchPdfBrowser();
  try {
    const context = await browser.newContext();
    if (params.cookieHeader) {
      await context.setExtraHTTPHeaders({ cookie: params.cookieHeader });
    }
    const page = await context.newPage();
    const url = `${baseUrl}${params.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1,
      margin: { top: "6mm", right: "6mm", bottom: "6mm", left: "6mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
