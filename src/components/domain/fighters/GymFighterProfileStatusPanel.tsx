import Link from "next/link";
import {
  FighterProfileStatusBadge,
  resolveFighterProfileStatus,
} from "@/components/domain/fighters/FighterProfileStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GymFighterProfileStatusPanel({
  userId,
  loginId,
  hasFighterProfile,
  profileIsPublic,
  profileSlug,
}: {
  userId: string | null;
  loginId: string | null;
  hasFighterProfile: boolean;
  profileIsPublic: boolean;
  profileSlug: string | null;
}) {
  const status = resolveFighterProfileStatus({
    userId,
    hasFighterProfile,
    profileIsPublic,
  });

  const publicProfileUrl =
    profileIsPublic && profileSlug ? `/fighters/${profileSlug}` : null;

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">선수 프로필 상태</h2>
        <FighterProfileStatusBadge status={status} />
      </div>

      <dl className="grid gap-2 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">로그인 계정</dt>
          <dd className="text-right font-medium">
            {userId
              ? loginId
                ? `${loginId} (발급됨)`
                : "연결됨"
              : "미발급 — 계정 발급 필요"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">프로필 작성</dt>
          <dd className="text-right">
            {hasFighterProfile ? "작성됨" : "미작성"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">공개 프로필</dt>
          <dd className="text-right">
            {profileIsPublic ? "공개 ON" : "공개 OFF"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">주최자 공개 풀</dt>
          <dd className="text-muted-foreground text-right">
            별도 설정 (체육관 토글)
          </dd>
        </div>
      </dl>

      {userId && !hasFighterProfile ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          선수가 로그인 후 /fighter/profile 에서 프로필을 작성할 수 있습니다.
        </p>
      ) : null}

      {hasFighterProfile && !profileIsPublic ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          공개 프로필이 비활성화되어 있습니다. 선수가 직접 공개 설정을 켜야
          일반 공개 페이지에 표시됩니다.
        </p>
      ) : null}

      {publicProfileUrl ? (
        <Link
          href={publicProfileUrl}
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
