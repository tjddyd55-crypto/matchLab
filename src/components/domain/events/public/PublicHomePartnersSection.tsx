import type { HomePartnerItem } from "@/lib/services/public-partner.service";
import { PublicPartnerLogoGrid } from "@/components/domain/events/public/PublicPartnerLogoGrid";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { cn } from "@/lib/utils";

export function PublicHomePartnersSection({
  partners,
}: {
  partners: HomePartnerItem[];
}) {
  if (partners.length === 0) return null;

  return (
    <section className="bg-matchon-sidebar py-12 md:py-14">
      <div className={cn(PUBLIC_CONTENT_CONTAINER_CLASS, "space-y-8")}>
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <h2 className="font-black text-[22px] tracking-tight text-white md:text-[26px]">
            함께하는 파트너
          </h2>
          <p className="text-sm leading-relaxed text-white/55 md:text-[15px]">
            MATCHON과 함께하는 후원사·협력사·기관입니다.
          </p>
        </div>

        <PublicPartnerLogoGrid partners={partners} />
      </div>
    </section>
  );
}
