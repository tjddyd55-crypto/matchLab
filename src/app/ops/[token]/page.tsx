import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OnsiteOpsMatchOpsTab } from "@/components/domain/onsite-ops/OnsiteOpsMatchOpsTab";
import { OnsiteOpsShell } from "@/components/domain/onsite-ops/OnsiteOpsShell";
import { OnsiteOpsTokenProvider } from "@/components/domain/onsite-ops/OnsiteOpsTokenContext";
import { OnsiteOpsWeighInTab } from "@/components/domain/onsite-ops/OnsiteOpsWeighInTab";
import { parseOnsiteOpsTab } from "@/lib/onsite-ops/token";
import { loadOnsiteOpsPortalPage } from "@/lib/services/onsite-ops-portal.service";

export const dynamic = "force-dynamic";

export default async function OnsiteOpsPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { token } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = parseOnsiteOpsTab(tabParam);

  const page = await loadOnsiteOpsPortalPage(token);
  if (!page) notFound();

  const { access, fieldStatus, matches, judgeSummaryByMatch } = page;

  return (
    <OnsiteOpsTokenProvider token={token}>
      <OnsiteOpsShell
        token={token}
        eventTitle={access.eventTitle}
        eventLocation={access.eventLocation}
      >
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">불러오는 중…</p>
          }
        >
          {tab === "matches" ? (
            <OnsiteOpsMatchOpsTab
              matches={matches}
              judgeSummaryByMatch={judgeSummaryByMatch}
            />
          ) : (
            <OnsiteOpsWeighInTab
              eventId={access.eventId}
              rows={fieldStatus.rows}
              summary={fieldStatus.summary}
            />
          )}
        </Suspense>
      </OnsiteOpsShell>
    </OnsiteOpsTokenProvider>
  );
}
