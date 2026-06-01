import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { fighterService } from "@/lib/services/fighter.service";
import { registrationService } from "@/lib/services/registration.service";
import { FightersTableDesktop } from "@/components/domain/fighters/FightersTableDesktop";
import { FightersCardListMobile } from "@/components/domain/fighters/FightersCardListMobile";
import { GymRegistrationRequestsTable } from "@/components/domain/fighters/GymRegistrationRequestsTable";
import { GymRegistrationRequestsCards } from "@/components/domain/fighters/GymRegistrationRequestsCards";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
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

  const [fighters, requests] = await Promise.all([
    fighterService.listGymFighters(actor),
    registrationService.listGymRegistrationSubmissions(actor),
  ]);

  const tabBase = "/gym/fighters";
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            소속 선수
          </h1>
          <p className="text-muted-foreground text-sm">
            중복 검토는 생년월일·성별·휴대폰 조합으로 확인합니다.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="선수 관리 탭">
          <Link
            href={tabBase}
            className={cn(
              buttonVariants({
                variant: !showRequests ? "default" : "outline",
                size: "sm",
              }),
              "rounded-full",
            )}
            aria-current={!showRequests ? "page" : undefined}
          >
            등록된 선수
          </Link>
          <Link
            href={`${tabBase}?tab=requests`}
            className={cn(
              buttonVariants({
                variant: showRequests ? "default" : "outline",
                size: "sm",
              }),
              "rounded-full",
            )}
            aria-current={showRequests ? "page" : undefined}
          >
            등록 요청
          </Link>
        </nav>
      </div>

      <GymFighterRegistrationPolicyNotice />

      {!actor.gymId ? (
        <GymProfileMissingBanner />
      ) : showRequests ? (
        requests.length === 0 ? (
          <EmptyState
            title="등록 요청이 없습니다"
            description="선수 등록 초대 링크로 접수된 요청이 여기에 표시됩니다."
          />
        ) : (
          <>
            <p className="text-muted-foreground text-sm leading-relaxed">
              선수가 등록 링크로 제출한 정보입니다. 등록 단계에서는 보호자
              전자동의를 받지 않으며, 체육관 승인 후 소속 선수로 등록됩니다.
              보호자 동의는 대회 공식 신청서 제출 시 진행됩니다.
            </p>
            <GymRegistrationRequestsTable items={requests} />
            <GymRegistrationRequestsCards items={requests} />
          </>
        )
      ) : fighters.length === 0 ? (
        <EmptyState
          title="등록된 선수가 없습니다"
          description="승인된 등록 요청이 곧 정식 선수로 추가됩니다."
        />
      ) : (
        <>
          <FightersTableDesktop fighters={fighters} />
          <FightersCardListMobile fighters={fighters} />
        </>
      )}
    </div>
  );
}
