import { notFound } from "next/navigation";
import { fighterProfileService } from "@/lib/services/fighter-profile.service";

export const dynamic = "force-dynamic";

export default async function PublicFighterProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fighterProfileService.getPublicBySlug(slug);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <article className="space-y-6">
        {profile.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.profileImageUrl}
            alt=""
            className="mx-auto size-32 rounded-full object-cover"
          />
        ) : null}
        <header className="text-center">
          <h1 className="font-heading text-2xl font-semibold">
            {profile.displayName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {profile.gymName} · {profile.regionLabel}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {profile.gender} · {profile.ageGroup} · {profile.weightLabel}
            {profile.primarySport ? ` · ${profile.primarySport}` : ""}
          </p>
          <p className="mt-2 text-sm font-medium">{profile.recordSummary}</p>
        </header>
        {profile.bio ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
        ) : null}
        <ul className="flex flex-wrap justify-center gap-3 text-sm text-primary">
          {profile.snsInstagram ? (
            <li>
              <a href={profile.snsInstagram} rel="noopener noreferrer">
                Instagram
              </a>
            </li>
          ) : null}
          {profile.snsYoutube ? (
            <li>
              <a href={profile.snsYoutube} rel="noopener noreferrer">
                YouTube
              </a>
            </li>
          ) : null}
          {profile.snsTiktok ? (
            <li>
              <a href={profile.snsTiktok} rel="noopener noreferrer">
                TikTok
              </a>
            </li>
          ) : null}
        </ul>
      </article>
    </div>
  );
}
