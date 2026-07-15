import { redirect } from "next/navigation";
import { LoginForm } from "@/components/domain/auth/LoginForm";
import { BRAND_NAME } from "@/lib/brand";
import {
  dashboardPathForRole,
  getCurrentActor,
} from "@/lib/auth/actor";
import { authPageDescClass, authPageTitleClass } from "@/lib/ui/auth-ui";
import { normalizeLoginId } from "@/lib/validators/login-id.validator";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getCurrentActor();
  if (actor) {
    redirect(dashboardPathForRole(actor.role));
  }

  const params = await searchParams;
  const activatedRaw = params.activated;
  const activated =
    activatedRaw === "1" ||
    activatedRaw === "true" ||
    (Array.isArray(activatedRaw) && activatedRaw[0] === "1");
  const loginIdRaw = params.loginId;
  const loginIdParam = Array.isArray(loginIdRaw)
    ? loginIdRaw[0]
    : loginIdRaw;
  const defaultLoginId =
    typeof loginIdParam === "string" && loginIdParam.trim()
      ? normalizeLoginId(loginIdParam)
      : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className={authPageTitleClass}>{BRAND_NAME} 로그인</h1>
        <p className={authPageDescClass}>
          발급받은 아이디와 비밀번호로 로그인합니다.
        </p>
      </div>
      <LoginForm
        defaultLoginId={defaultLoginId}
        activatedBanner={activated}
      />
    </div>
  );
}
