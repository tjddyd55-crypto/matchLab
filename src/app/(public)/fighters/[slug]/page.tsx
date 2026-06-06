import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicFighterProfileView } from "@/components/domain/fighters/PublicFighterProfileView";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import { fighterProfileService } from "@/lib/services/fighter-profile.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fighterProfileService.getPublicBySlug(slug);
  if (!profile) {
    return { title: "선수 프로필을 찾을 수 없습니다" };
  }
  return {
    title: `${profile.displayName} · 선수 프로필`,
    description: `${profile.displayName} 선수 프로필 — ${profile.recordSummary}`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicFighterProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fighterProfileService.getPublicBySlug(slug);
  if (!profile) notFound();

  return (
    <div
      className={cn(
        PUBLIC_CONTENT_CONTAINER_CLASS,
        "py-8 md:py-12",
      )}
    >
      <PublicFighterProfileView profile={profile} />
    </div>
  );
}
