import { notFound } from "next/navigation";
import { PublicEventBracketsSection } from "@/components/domain/events/public/PublicEventBracketsSection";
import { PublicEventDetailShell } from "@/components/domain/events/public/PublicEventDetailShell";
import { bracketService } from "@/lib/services/bracket.service";
import { eventService } from "@/lib/services/event.service";

export const dynamic = "force-dynamic";

export default async function PublicEventBracketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await eventService.getPublicEventBySlug(slug);
  if (!event) {
    notFound();
  }

  const brackets = await bracketService.getPublicBracketsByEventSlug(slug);

  return (
    <PublicEventDetailShell event={event} slug={slug} activeTab="brackets">
      <PublicEventBracketsSection
        eventId={event.id}
        slug={slug}
        brackets={brackets}
      />
    </PublicEventDetailShell>
  );
}
