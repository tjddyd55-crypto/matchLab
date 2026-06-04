import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { fighterService } from "@/lib/services/fighter.service";
import { publicFighterService } from "@/lib/services/public-fighter.service";
import { registrationService } from "@/lib/services/registration.service";
import { FighterRegistrationSubmissionStatus } from "@/lib/enums";
import { GymFighterPublicPolicyNotice } from "@/components/domain/fighters/GymFighterPublicPolicyNotice";
import { GymRegistrationRequestsTable } from "@/components/domain/fighters/GymRegistrationRequestsTable";
import { GymRegistrationRequestsCards } from "@/components/domain/fighters/GymRegistrationRequestsCards";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { GymFightersToolbar } from "@/components/domain/fighters/GymFightersToolbar";
import { GymFightersListClient } from "@/components/domain/fighters/GymFightersListClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymFightersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await requireActor();
  const { tab } = await searchParams;
  const showRequests = tab === "requests";

  const [fighters, requests, publicSettings] = await Promise.all([
    fighterService.listGymFighters(actor),
    registrationService.listGymRegistrationSubmissions(actor),
    publicFighterService.listGymFighterPublicSettings(actor),
  ]);

  const publicByFighterId = Object.fromEntries(
    publicSettings.map((s) => [s.fighterId, s]),
  );

  const pendingRequestCount = requests.filter(
    (r) =>
      r.status === FighterRegistrationSubmissionStatus.submitted ||
      r.status === FighterRegistrationSubmissionStatus.duplicate_review,
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          소속 선수
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          체육관 선수 DB를 등록·수정합니다. 선수 등록과 대회 신청(서명·동의)은
          별도 단계입니다.
        </p>
      </div>

      <GymFighterRegistrationPolicyNotice />

      {!actor.gymId ? (
        <GymProfileMissingBanner />
      ) : (
        <GymFightersToolbar
          showRequests={showRequests}
          pendingRequestCount={pendingRequestCount}
        />
      )}

      {!actor.gymId ? null : showRequests ? (
        requests.length === 0 ? (
          <EmptyState
            title="등록 요청이 없습니다"
            description="등록 요청 링크를 만들어 선수에게 보내 주세요."
            action={
              <Link
                href="/gym/invite-links"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                등록 링크 만들기
              </Link>
            }
          />
        ) : (
          <>
            <p className="text-muted-foreground text-sm leading-relaxed">
              선수가 등록 링크로 제출한 정보입니다. 승인 시 서명·보호자 동의는
              요구하지 않으며, 대회 신청 단계에서 처리합니다.
            </p>
            <GymRegistrationRequestsTable items={requests} />
            <GymRegistrationRequestsCards items={requests} />
          </>
        )
      ) : fighters.length === 0 ? (
        <EmptyState
          title="등록된 선수가 없습니다"
          description="선수를 직접 등록하거나, 등록 요청 링크로 선수에게 정보를 받아 주세요."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/gym/fighters/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                선수 직접 등록
              </Link>
              <Link
                href="/gym/invite-links"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                등록 링크 만들기
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <GymFighterPublicPolicyNotice />
          <GymFightersListClient
            fighters={fighters}
            publicByFighterId={publicByFighterId}
          />
        </>
      )}
    </div>
  );
}
