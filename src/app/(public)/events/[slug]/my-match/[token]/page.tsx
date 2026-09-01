import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicMyMatchView } from "@/components/domain/my-match/PublicMyMatchView";
import { myMatchService } from "@/lib/services/my-match.service";

export const dynamic = "force-dynamic";

export default async function PublicMyMatchPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const data = await myMatchService.getPublicPageByToken(slug, token);
  if (!data) notFound();

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-10">
        <PublicMyMatchView data={data} />
        <p className="text-muted-foreground mt-8 text-center text-xs">
          <Link href={`/events/${data.eventSlug}`} className="underline-offset-2 hover:underline">
            {data.eventTitle} 대회 페이지
          </Link>
        </p>
      </div>
    </main>
  );
}
