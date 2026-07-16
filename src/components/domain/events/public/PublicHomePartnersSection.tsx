import type { HomePartnerItem } from "@/lib/services/public-partner.service";
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
            함께하는 협회 및 파트너
          </h2>
          <p className="text-sm leading-relaxed text-white/55 md:text-[15px]">
            MATCHON과 함께 대회를 만들어가는 협회와 공식 파트너입니다.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {partners.map((p) => {
            const inner = (
              <span className="flex h-[88px] items-center justify-center rounded-xl border border-white/10 bg-white px-3 py-4 shadow-sm transition-opacity hover:opacity-95">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.logoUrl}
                  alt={p.altText}
                  title={p.name}
                  className="max-h-14 w-full object-contain"
                />
              </span>
            );
            return (
              <li key={p.id}>
                {p.websiteUrl ? (
                  <a
                    href={p.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={p.name}
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
