import { PublicEventCardDesktop } from "@/components/domain/events/public/PublicEventCardDesktop";
import { PublicEventCardMobile } from "@/components/domain/events/public/PublicEventCardMobile";
import type { PublicEventCardProps } from "@/components/domain/events/public/public-event-ui";

/** PC·모바일 카드를 각각 렌더 (FightersTableDesktop / FightersCardListMobile 패턴) */
export function PublicEventCard(props: PublicEventCardProps) {
  return (
    <>
      <PublicEventCardDesktop {...props} />
      <PublicEventCardMobile {...props} />
    </>
  );
}
