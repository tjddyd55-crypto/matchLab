import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { fighterService } from "@/lib/services/fighter.service";
import { GymFighterAccountPanel } from "@/components/domain/fighters/GymFighterAccountPanel";
import { GymFighterProfileStatusPanel } from "@/components/domain/fighters/GymFighterProfileStatusPanel";
import {
  GymFighterForm,
  gymFighterFormInitialFromEdit,
} from "@/components/domain/fighters/GymFighterForm";
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
  try {
    data = await fighterService.getGymFighterEditPageData(actor, fighterId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { row } = data;

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-2xl")}>
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
          loginId={data.loginId}
          hasAccount={data.accountStatus === "issued"}
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
      </div>
    </div>
  );
}
