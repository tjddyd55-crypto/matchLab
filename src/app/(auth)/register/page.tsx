import Link from "next/link";
import { redirect } from "next/navigation";
import {
  dashboardPathForRole,
  getCurrentActor,
} from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const actor = await getCurrentActor();
  if (actor) {
    redirect(dashboardPathForRole(actor.role));
  }

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">회원가입</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        MVP 시연 단계에서는 관리자·주최자·체육관·선수 계정을{" "}
        <span className="text-foreground font-medium">사전 발급</span>
        합니다.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        계정 생성·역할 배정은 관리자에게 문의해 주세요. Supabase Auth 사용자
        생성 후 DB <code className="rounded bg-muted px-1 py-0.5 text-xs">User.authUserId</code>를
        맞추는 절차는 <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/dev-start.md</code>를
        참고합니다.
      </p>
      <p>
        <Link
          href="/login"
          className="text-primary text-sm font-medium underline-offset-2 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
