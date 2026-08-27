import type { Metadata } from "next";
import { PublicHomeAudienceSection } from "@/components/domain/events/public/PublicHomeAudienceSection";
import { PublicHomeFeaturesSection } from "@/components/domain/events/public/PublicHomeFeaturesSection";
import { PublicHomeGymSection } from "@/components/domain/events/public/PublicHomeGymSection";
import { PublicHomeHero } from "@/components/domain/events/public/PublicHomeHero";
import { PublicHomeHowItWorksSection } from "@/components/domain/events/public/PublicHomeHowItWorksSection";
import { PublicHomeManagerDownloadSection } from "@/components/domain/events/public/PublicHomeManagerDownloadSection";
import { PublicHomeOrganizerCtaSection } from "@/components/domain/events/public/PublicHomeOrganizerCtaSection";
import { PublicHomePartnersSection } from "@/components/domain/events/public/PublicHomePartnersSection";
import {
  getMatchonManagerDownloadInfo,
  type MatchonManagerDownloadInfo,
} from "@/lib/desktop/manager-download";
import { BRAND_NAME } from "@/lib/brand";
import { publicPartnerService } from "@/lib/services/public-partner.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: `${BRAND_NAME} | 체육관 · 격투기 대회 운영 플랫폼`,
  },
  description:
    "회원과 선수 관리부터 참가 신청, 대진 편성, 경기 운영과 결과 관리까지 MATCHON Manager에서 관리하세요.",
  openGraph: {
    title: `${BRAND_NAME} | 체육관 · 격투기 대회 운영 플랫폼`,
    description:
      "회원과 선수 관리부터 참가 신청, 대진 편성, 경기 운영과 결과 관리까지 MATCHON Manager에서 관리하세요.",
  },
};

function safeManagerDownload(): MatchonManagerDownloadInfo | null {
  try {
    return getMatchonManagerDownloadInfo();
  } catch {
    return null;
  }
}

export default async function PublicHomePage() {
  const [managerDownload, partners] = await Promise.all([
    Promise.resolve(safeManagerDownload()),
    publicPartnerService.listActivePublicPartnerLogos(),
  ]);

  return (
    <div className="flex flex-col">
      <PublicHomeHero download={managerDownload} />
      <PublicHomeFeaturesSection />
      <PublicHomeGymSection />
      <PublicHomeHowItWorksSection />
      <PublicHomeAudienceSection />
      <PublicHomeManagerDownloadSection download={managerDownload} />
      <PublicHomePartnersSection partners={partners} />
      <PublicHomeOrganizerCtaSection download={managerDownload} />
    </div>
  );
}
