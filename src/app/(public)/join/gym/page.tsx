import Link from "next/link";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { buttonVariants } from "@/components/ui/button";
import { listJoinableAssociations } from "@/lib/services/public-join.service";
import {
  authLoginDescClass,
  authLoginFooterClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 체육관 가입 — 협회를 명시 선택한 뒤 기존 회원사 신청서로 이동.
 * 협회가 1곳이어도 자동 redirect 하지 않는다.
 */
export default async function JoinGymPage() {
  const associations = await listJoinableAssociations();

  return (
    <AuthLoginShell
      title="체육관 가입"
      description="가입할 협회를 확인한 뒤 회원사 신청서로 이동합니다."
      footer={
        <p className={cn(authLoginFooterClass, "mt-6")}>
          <Link
            href="/join"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            ← 가입 유형 선택
          </Link>
        </p>
      }
    >
      {associations.length === 0 ? (
        <p className={authLoginDescClass}>
          현재 공개 가입을 받는 협회가 없습니다. 협회에 직접 문의하거나 나중에
          다시 시도해 주세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {associations.map((a) => (
            <li key={a.organizerId}>
              <div className="flex items-center gap-3 rounded-xl border border-matchon-border bg-white p-4">
                {a.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.logoUrl}
                    alt={`${a.name} 로고`}
                    className="h-12 w-12 rounded-lg border border-matchon-border bg-white object-contain p-1"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-matchon-primary-light text-sm font-bold text-matchon-primary">
                    {a.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-matchon-text-primary">
                    {a.name}
                  </p>
                  <p className="text-sm text-matchon-text-secondary">
                    회원사 가입 가능
                  </p>
                </div>
                <Link
                  href={a.registerPath}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "shrink-0 font-bold",
                  )}
                >
                  가입 신청
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AuthLoginShell>
  );
}
