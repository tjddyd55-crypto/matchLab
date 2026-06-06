import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { fighterService } from "@/lib/services/fighter.service";
import { fighterRepository } from "@/lib/repositories/fighter.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { GymFighterAccountPanel } from "@/components/domain/fighters/GymFighterAccountPanel";
import { GymFighterProfileStatusPanel } from "@/components/domain/fighters/GymFighterProfileStatusPanel";
import {
  GymFighterForm,
  gymFighterFormInitialFromEdit,
} from "@/components/domain/fighters/GymFighterForm";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
        <GymProfileMissingBanner />
      </div>
    );
  }

  let row;
  try {
    row = await fighterService.getGymFighterForEdit(actor, fighterId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    throw e;
  }

  const ctx = await fighterRepository.findFighterVisibilityContext(fighterId);
  const user = ctx?.userId
    ? await userRepository.findUserById(ctx.userId)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <Link
          href="/gym/fighters"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-2",
          )}
        >
          ← 소속 선수
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          선수 정보 수정
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {row.fighterCode}
        </p>
      </div>

      <GymFighterAccountPanel
        fighterId={fighterId}
        loginId={user?.loginId ?? null}
        hasAccount={Boolean(ctx?.userId)}
      />

      {ctx ? (
        <GymFighterProfileStatusPanel
          userId={ctx.userId}
          loginId={user?.loginId ?? null}
          hasFighterProfile={ctx.hasFighterProfile}
          profileIsPublic={ctx.profileIsPublic}
          profileSlug={ctx.profileSlug}
        />
      ) : null}

      <GymFighterForm
        mode="edit"
        fighterId={fighterId}
        initial={gymFighterFormInitialFromEdit(row)}
      />
    </div>
  );
}
