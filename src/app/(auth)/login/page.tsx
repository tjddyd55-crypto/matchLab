import { redirect } from "next/navigation";
import { LoginForm } from "@/components/domain/auth/LoginForm";
import { BRAND_NAME } from "@/lib/brand";
import {
  dashboardPathForRole,
  getCurrentActor,
} from "@/lib/auth/actor";
import { authPageDescClass, authPageTitleClass } from "@/lib/ui/auth-ui";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const actor = await getCurrentActor();
  if (actor) {
    redirect(dashboardPathForRole(actor.role));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className={authPageTitleClass}>{BRAND_NAME} 로그인</h1>
        <p className={authPageDescClass}>
          Supabase Auth 계정으로 로그인합니다. DB{" "}
          <code className="rounded bg-matchon-surface px-1 py-0.5 text-xs">
            User.authUserId
          </code>{" "}
          매핑이 필요합니다.
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-xs leading-relaxed text-matchon-text-secondary">
        시연 순서·계정: 프로젝트 루트의{" "}
        <code className="rounded bg-matchon-surface px-1 py-0.5">docs/demo-scenario.md</code> ·{" "}
        <code className="rounded bg-matchon-surface px-1 py-0.5">docs/dev-start.md</code>
      </p>
    </div>
  );
}
