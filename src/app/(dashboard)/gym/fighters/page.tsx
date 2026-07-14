import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
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
import { MatchonEmptyState } from "@/components/shared/MatchonEmptyState";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
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
  const portal = actor.gymId
    ? await resolveGymPortalAccess(actor).catch(() => null)
    : null;
  const canCreateFighter = portal?.canCreateFighter ?? true;
  const canUpdateFighter = portal?.canUpdateFighter ?? true;

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
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0 space-y-1">
          <h1 className={matchonPageTitleClass}>소속 선수</h1>
          <p className={matchonPageDescClass}>
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
            canCreateFighter={canCreateFighter}
          />
        )}

        {!actor.gymId ? null : showRequests ? (
          requests.length === 0 ? (
            <MatchonEmptyState
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
              <p className={matchonPageDescClass}>
                선수가 등록 링크로 제출한 정보입니다. 승인 시 서명·보호자 동의는
                요구하지 않으며, 대회 신청 단계에서 처리합니다.
              </p>
              <GymRegistrationRequestsTable items={requests} />
              <GymRegistrationRequestsCards items={requests} />
            </>
          )
        ) : fighters.length === 0 ? (
          <MatchonEmptyState
            title="등록된 선수가 없습니다"
            description="선수를 직접 등록하거나, 등록 요청 링크로 선수에게 정보를 받아 주세요."
            action={
              canCreateFighter ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/gym/fighters/new"
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    선수 직접 등록
                  </Link>
                  <Link
                    href="/gym/invite-links"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    등록 링크 만들기
                  </Link>
                </div>
              ) : undefined
            }
          />
        ) : (
          <>
            <GymFighterPublicPolicyNotice />
            <GymFightersListClient
              fighters={fighters}
              publicByFighterId={publicByFighterId}
              readOnly={!canUpdateFighter}
            />
          </>
        )}
      </div>
    </div>
  );
}
