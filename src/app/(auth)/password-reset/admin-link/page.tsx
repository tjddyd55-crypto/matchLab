import { cookies } from "next/headers";
import { AuthLoginShell } from "@/components/domain/auth/AuthLoginShell";
import { AdminPasswordResetUserForm } from "@/components/domain/auth/AdminPasswordResetUserForm";
import { BRAND_NAME } from "@/lib/brand";
import { adminPasswordResetLinkService } from "@/lib/services/admin-password-reset-link.service";
import { loadMatchonAdminPasswordResetLinkConfig } from "@/server/admin-password-reset/config";
import { ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE } from "@/server/admin-password-reset/token";

export const dynamic = "force-dynamic";

export default async function AdminPasswordResetLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const rawToken = typeof sp.token === "string" ? sp.token.trim() : "";
  const config = loadMatchonAdminPasswordResetLinkConfig();

  if (!config.enabled) {
    return (
      <AuthLoginShell
        title={`${BRAND_NAME} 비밀번호 재설정`}
        description="이 기능을 사용할 수 없습니다."
      >
        <p className="text-sm text-matchon-text-secondary">
          관리자에게 문의해 주세요.
        </p>
      </AuthLoginShell>
    );
  }

  let bootstrap:
    | {
        mode: "exchange";
        token: string;
      }
    | {
        mode: "challenge";
        loginIdMasked: string;
        accountTypeLabel: string;
      }
    | { mode: "invalid"; status: string };

  if (rawToken) {
    bootstrap = { mode: "exchange", token: rawToken };
  } else {
    const jar = await cookies();
    const challenge = jar.get(ADMIN_PASSWORD_RESET_CHALLENGE_COOKIE)?.value;
    if (!challenge) {
      bootstrap = { mode: "invalid", status: "invalid" };
    } else {
      const page =
        await adminPasswordResetLinkService.getPageByChallenge(challenge);
      if (page.status !== "valid") {
        bootstrap = { mode: "invalid", status: page.status };
      } else {
        bootstrap = {
          mode: "challenge",
          loginIdMasked: page.loginIdMasked,
          accountTypeLabel: page.accountTypeLabel,
        };
      }
    }
  }

  return (
    <AuthLoginShell
      title={`${BRAND_NAME} 비밀번호 재설정`}
      description="관리자가 발급한 일회용 링크로 새 비밀번호를 설정합니다."
    >
      <AdminPasswordResetUserForm bootstrap={bootstrap} />
    </AuthLoginShell>
  );
}
