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
    title: "협회 가입",
    description:
      "대회를 주최하고 회원사를 관리하는 협회입니다. 관리자 승인 후 계정이 발급됩니다.",
    href: "/join/association",
    cta: "가입 신청",
  },
  {
    title: "체육관 가입 (회원사)",
    description:
      "소속 선수를 등록하고 대회에 참가하는 체육관입니다. 가입할 협회를 선택한 뒤 기존 회원사 신청서를 작성합니다.",
    href: "/join/gym",
    cta: "가입 신청",
  },
] as const;

export default function JoinHubPage() {
  return (
    <AuthLoginShell
      title="MATCHON 회원가입"
      description="가입 유형을 선택해 주세요."
      footer={
        <p className={cn(authLoginFooterClass, "mt-6")}>
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
          >
            로그인
          </Link>
        </p>
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
