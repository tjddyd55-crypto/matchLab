import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

export const runtime = "edge";

function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = truncateText(
    searchParams.get("title")?.trim() || `${BRAND_NAME} 대회 공고`,
    48,
  );
  const date = truncateText(searchParams.get("date")?.trim() || "", 32);
  const location = truncateText(searchParams.get("location")?.trim() || "", 40);
  const metaLine = [date, location].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0b1220 0%, #1e293b 45%, #334155 100%)",
          padding: "72px 80px",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#38bdf8",
            }}
          />
          {BRAND_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: title.length > 28 ? 52 : 60,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {metaLine ? (
            <div style={{ fontSize: 30, color: "#cbd5e1", lineHeight: 1.3 }}>
              {metaLine}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <span>대진표 · 결과 · 참가 신청 관리</span>
          <span>matchlab.kr</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
