import { PublicHomeEventsSection } from "@/components/domain/events/public/PublicHomeEventsSection";
import { PublicHomeHeroDesktop } from "@/components/domain/events/public/PublicHomeHeroDesktop";
import { PublicHomeHeroMobile } from "@/components/domain/events/public/PublicHomeHeroMobile";
import { PublicHomeHowItWorksSection } from "@/components/domain/events/public/PublicHomeHowItWorksSection";
import { PublicHomeJudgeSection } from "@/components/domain/events/public/PublicHomeJudgeSection";
import { PublicHomeOrganizerCtaSection } from "@/components/domain/events/public/PublicHomeOrganizerCtaSection";
import { PublicHomeStatsSection } from "@/components/domain/events/public/PublicHomeStatsSection";
import { eventService } from "@/lib/services/event.service";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const events = await eventService.listPublicEvents();
  const featured = events
    .filter(
      (e) =>
        e.registrationStatus === "open" ||
        e.status === "open" ||
        e.status === "ongoing" ||
        e.status === "bracket_ready",
    )
    .slice(0, 6);

  return (
    <div className="flex flex-col">
      <PublicHomeHeroDesktop />
      <PublicHomeHeroMobile />
      <PublicHomeStatsSection />
      <PublicHomeEventsSection events={featured} />
      <PublicHomeHowItWorksSection />
      <PublicHomeOrganizerCtaSection />
      <PublicHomeJudgeSection />
    </div>
  );
}
