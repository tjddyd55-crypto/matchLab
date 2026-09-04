import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { fighterUnifiedProfileService } from "@/lib/services/fighter-unified-profile.service";
import { fighterService } from "@/lib/services/fighter.service";
import { fighterAccountSetupService } from "@/lib/services/fighter-account-setup.service";
import { GymFighterAccountPanel } from "@/components/domain/fighters/GymFighterAccountPanel";
import { FighterExternalRecordForm } from "@/components/domain/fighters/career/FighterExternalRecordForm";
import { FighterUnifiedCareerPanel } from "@/components/domain/fighters/career/FighterUnifiedCareerPanel";
import { GymFighterProfileStatusPanel } from "@/components/domain/fighters/GymFighterProfileStatusPanel";
import {
  GymFighterForm,
} from "@/components/domain/fighters/GymFighterForm";
import { gymFighterFormInitialFromEdit } from "@/lib/fighters/gym-fighter-form-initial";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymFighterEditPage({
  params,
}: {
  params: Promise<{ fighterId: string }>;
}) {
  const actor = await requireActor();
  const { fighterId } = await params;

  if (actor.gymId) {
    const access = await resolveGymPortalAccess(actor);
    if (!access.canUpdateFighter) {
      redirect("/gym/fighters");
    }
  }

  if (!actor.gymId && actor.role !== "admin") {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  let data;
  let accountPanel;
  try {
    data = await fighterService.getGymFighterEditPageData(actor, fighterId);
    accountPanel = await fighterAccountSetupService.getGymPanelState(
      actor,
      fighterId,
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { row } = data;

  let careerProfile;
  try {
    careerProfile = await fighterUnifiedProfileService.loadForGym(actor, fighterId);
  } catch {
    careerProfile = null;
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-4xl")}>
        <div className="min-w-0">
          <Link
            href="/gym/fighters"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 소속 선수
          </Link>
          <h1 className={matchonPageTitleClass}>선수 정보 수정</h1>
          <p className={cn(matchonPageDescClass, "font-mono text-xs")}>
            {row.fighterCode}
          </p>
        </div>

        <GymFighterAccountPanel
          fighterId={fighterId}
          loginId={accountPanel.loginId}
          hasAccount={accountPanel.hasAccount}
          statusKind={accountPanel.statusKind}
          activeSetupExpiresAt={accountPanel.activeSetupExpiresAt}
        />

        <GymFighterProfileStatusPanel
          accountStatus={data.accountStatus}
          loginId={data.loginId}
          profileStatus={data.profileStatus}
          hasFighterProfile={data.hasFighterProfile}
          publicProfileHref={data.publicProfileHref}
        />

        <GymFighterForm
          mode="edit"
          fighterId={fighterId}
          initial={gymFighterFormInitialFromEdit(row)}
        />

        {careerProfile ? (
          <FighterExternalRecordForm
            fighterId={fighterId}
            initial={careerProfile.externalRecord}
          />
        ) : null}

        {careerProfile ? (
          <div className="pt-2" id="career">
            <h2 className={matchonPageTitleClass}>경기 · 참가 이력</h2>
            <p className={cn(matchonPageDescClass, "mb-4")}>
              전체 전적은 MATCHON 공식 + 기존/외부 합산입니다. 아래 경기 목록은
              MATCHON 공식 MatchResult 기준입니다.
            </p>
            <FighterUnifiedCareerPanel profile={careerProfile} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
