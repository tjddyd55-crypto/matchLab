import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { JudgeLogoutButton } from "@/components/domain/judges/JudgeLogoutButton";
import type { ResolvedJudgeSession } from "@/lib/services/judge-credential.service";
import { judgeDefaultRoute } from "@/lib/judge-identity";

export function JudgeSessionHeader({
  session,
}: {
  session: ResolvedJudgeSession;
}) {
  const name = session.verifiedName ?? session.displayName ?? session.loginId;

  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
      <div className="space-y-3">
        <BrandLogo size="sm" showText />
        <div className="space-y-1 text-sm">
        <p className="font-medium">
          현재 로그인: {name} / {session.roleLabel}
        </p>
        <p className="text-muted-foreground text-xs">계정 ID: {session.loginId}</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href={judgeDefaultRoute(session.role)} className="underline">
            홈
          </Link>
          {session.role === "SCORING_JUDGE" ? (
            <Link href="/judge/matches" className="underline">
              배정 경기
            </Link>
          ) : null}
          {session.role === "HEAD_JUDGE" ? (
            <Link href="/judge/review" className="underline">
              채점 집계
            </Link>
          ) : null}
          {session.role === "ANNOUNCER" ? (
            <Link href="/judge/results" className="underline">
              결과 발표
            </Link>
          ) : null}
          <Link href="/judge/verify" className="underline">
            본인 정보
          </Link>
        </div>
        </div>
      </div>
      <JudgeLogoutButton />
    </header>
  );
}
