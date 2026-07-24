import { NextResponse } from "next/server";
import { publicPartnerService } from "@/lib/services/public-partner.service";

export const dynamic = "force-dynamic";

/**
 * 공개 홈 파트너 최소 필드만 반환.
 * object key · 관리자 ID · 내부 메모 비노출.
 */
export async function GET() {
  const partners = await publicPartnerService.listActivePublicPartnerLogos();
  return NextResponse.json({
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      logoUrl: p.logoUrl,
      websiteUrl: p.websiteUrl,
      altText: p.altText,
      openInNewTab: p.openInNewTab,
      sortOrder: p.sortOrder,
    })),
  });
}
