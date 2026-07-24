import type { HomePartnerItem } from "@/lib/services/public-partner.service";
import { cn } from "@/lib/utils";

export function PublicPartnerLogoItem({
  partner,
  muted = false,
}: {
  partner: Pick<
    HomePartnerItem,
    "name" | "logoUrl" | "websiteUrl" | "altText" | "openInNewTab"
  >;
  /** 관리자 미리보기에서 비활성 등 구분 */
  muted?: boolean;
}) {
  const inner = (
    <span
      className={cn(
        "flex h-[88px] items-center justify-center rounded-xl border border-white/10 bg-white px-3 py-4 shadow-sm transition-opacity",
        muted ? "opacity-40" : "hover:opacity-95",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={partner.logoUrl}
        alt={partner.altText}
        title={partner.name}
        className="max-h-14 w-full object-contain"
      />
    </span>
  );

  if (!partner.websiteUrl) return inner;

  return (
    <a
      href={partner.websiteUrl}
      target={partner.openInNewTab ? "_blank" : undefined}
      rel={partner.openInNewTab ? "noopener noreferrer" : undefined}
      aria-label={partner.name}
    >
      {inner}
    </a>
  );
}

export function PublicPartnerLogoGrid({
  partners,
  className,
  mutedIds,
}: {
  partners: Array<
    Pick<
      HomePartnerItem,
      "id" | "name" | "logoUrl" | "websiteUrl" | "altText" | "openInNewTab"
    >
  >;
  className?: string;
  mutedIds?: Set<string>;
}) {
  if (partners.length === 0) return null;

  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6",
        className,
      )}
    >
      {partners.map((p) => (
        <li key={p.id}>
          <PublicPartnerLogoItem
            partner={p}
            muted={mutedIds?.has(p.id) ?? false}
          />
        </li>
      ))}
    </ul>
  );
}
