import "server-only";

import { getServerAppBaseUrl } from "@/lib/qr-url";

/**
 * print route를 headless chromium으로 렌더해 PDF 생성.
 * 화면·인쇄와 동일한 HTML/CSS를 사용한다.
 */
export async function generateBracketPrintPdfBuffer(params: {
  eventId: string;
  cookieHeader: string | null;
}): Promise<Buffer> {
  const baseUrl = getServerAppBaseUrl();
  if (!baseUrl) {
    throw new Error("APP base URL이 설정되지 않았습니다.");
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    if (params.cookieHeader) {
      await context.setExtraHTTPHeaders({ cookie: params.cookieHeader });
    }
    const page = await context.newPage();
    const url = `${baseUrl}/organizer/events/${params.eventId}/brackets/print`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
