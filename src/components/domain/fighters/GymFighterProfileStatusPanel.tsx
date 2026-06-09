import Link from "next/link";
import {
  FighterProfileStatusBadge,
  resolveFighterProfileStatus,
} from "@/components/domain/fighters/FighterProfileStatusBadge";
import type {
  GymFighterAccountStatus,
  GymFighterProfileDisplayStatus,
} from "@/lib/gym-fighter-edit-display";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GymFighterProfileStatusPanel({
  accountStatus,
  loginId,
  profileStatus,
  hasFighterProfile,
  publicProfileHref,
}: {
  accountStatus: GymFighterAccountStatus;
  loginId: string | null;
  profileStatus: GymFighterProfileDisplayStatus;
  hasFighterProfile: boolean;
  publicProfileHref: string | null;
}) {
  const badgeStatus = resolveFighterProfileStatus({
    userId: accountStatus === "issued" ? "linked" : null,
    hasFighterProfile,
    profileIsPublic: profileStatus === "public",
  });

  const accountLabel =
    accountStatus === "issued"
      ? loginId
        ? `${loginId} (발급됨)`
        : "연결됨"
      : "계정 발급 필요";

  const profileWrittenLabel = hasFighterProfile ? "작성됨" : "프로필 미작성";

  const publicProfileLabel =
    profileStatus === "missing"
      ? "—"
      : profileStatus === "public"
        ? "공개 ON"
        : "공개 OFF";

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">선수 프로필 상태</h2>
        <FighterProfileStatusBadge status={badgeStatus} />
      </div>

      <dl className="grid gap-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">로그인 계정</dt>
          <dd className="text-right font-medium">{accountLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">프로필 작성</dt>
          <dd className="text-right">{profileWrittenLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">공개 프로필</dt>
          <dd className="text-right">{publicProfileLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">주최자 공개 풀</dt>
          <dd className="text-muted-foreground text-right">
            별도 설정 (체육관 토글)
          </dd>
        </div>
      </dl>

      {accountStatus === "issued" && !hasFighterProfile ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          선수가 로그인 후 /fighter/profile 에서 프로필을 작성할 수 있습니다.
        </p>
      ) : null}

      {accountStatus === "none" ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          로그인 계정이 없으면 선수 프로필도 작성되지 않습니다. 위 「로그인
          계정 발급」으로 계정을 만든 뒤 선수가 직접 프로필을 작성합니다.
        </p>
      ) : null}

      {hasFighterProfile && profileStatus === "private" ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          공개 프로필이 비활성화되어 있습니다. 선수가 직접 공개 설정을 켜야
          일반 공개 페이지에 표시됩니다.
        </p>
      ) : null}

      {publicProfileHref ? (
        <Link
          href={publicProfileHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          공개 프로필 보기
        </Link>
      ) : null}

      <p className="text-muted-foreground border-t pt-3 text-[11px] leading-relaxed">
        자기소개·SNS·공개 여부는 선수가 직접 관리합니다. 체육관 대리 수정은
        후속 TODO.
      </p>
    </section>
  );
}
