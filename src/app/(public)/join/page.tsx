import Link from "next/link";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { buttonVariants } from "@/components/ui/button";
import {
  authLoginDescClass,
  authLoginFooterClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const cards = [
  {
    title: "일반 회원 / 선수",
    description: "대회 참가와 개인 기록을 관리하려면 로그인 후 안내를 따라 주세요.",
    href: "/login",
    cta: "로그인",
  },
  {
    title: "체육관",
    description:
      "체육관 정보를 등록하고 회원·선수를 관리하며 공개 대회에 참가할 수 있습니다.",
    href: "/join/gym",
    cta: "체육관 가입",
  },
  {
    title: "협회·주최자",
    description:
      "협회를 등록하고 대회를 개최·운영할 수 있습니다. 관리자 승인 후 계정이 발급됩니다.",
    href: "/join/association",
    cta: "협회 가입",
  },
] as const;

export default function JoinHubPage() {
  return (
    <AuthLoginShell
      title="MATCHON 회원가입"
      description="가입 유형을 선택해 주세요."
      footer={
        <div className={cn(authLoginFooterClass, "mt-6 space-y-3")}>
          <p>
            이미 MATCHON 체육관 계정이 있고 협회 소속이 필요한 경우, 협회에서
            발송한 초대 링크로 연결할 수 있습니다.
          </p>
          <p>
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {cards.map((card) => (
          <div
            key={card.href}
            className="rounded-xl border border-matchon-border bg-matchon-surface/60 p-5 text-left"
          >
            <h2 className="text-lg font-bold text-matchon-text-primary">
              {card.title}
            </h2>
            <p className={cn(authLoginDescClass, "mt-2")}>{card.description}</p>
            <Link
              href={card.href}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "mt-4 font-bold",
              )}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>
    </AuthLoginShell>
  );
}
