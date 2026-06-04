import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymFighterForm } from "@/components/domain/fighters/GymFighterForm";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { GymFighterRegistrationPolicyNotice } from "@/components/domain/fighters/GymFighterRegistrationPolicyNotice";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymFighterNewPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const actor = await requireActor();
  const { returnTo } = await searchParams;

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
          선수 직접 등록
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          체육관 소속 선수 DB에 등록합니다. 서명·보호자 동의는 대회 신청 단계에서
          진행합니다.
        </p>
      </div>

      <GymFighterRegistrationPolicyNotice />

      {!actor.gymId ? (
        <GymProfileMissingBanner />
      ) : (
        <GymFighterForm
          mode="create"
          returnTo={returnTo?.startsWith("/gym/") ? returnTo : undefined}
        />
      )}
    </div>
  );
}
