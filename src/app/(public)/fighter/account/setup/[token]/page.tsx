import Link from "next/link";
import { FighterAccountSetupForm } from "@/components/domain/fighters/FighterAccountSetupForm";
import { fighterAccountSetupService } from "@/lib/services/fighter-account-setup.service";

export const dynamic = "force-dynamic";

function statusMessage(status: string): string {
  switch (status) {
    case "expired":
      return "계정 설정 링크가 만료되었습니다.\n소속 체육관에 새 링크 발급을 요청해 주세요.";
    case "used":
      return "이미 사용된 계정 설정 링크입니다.\n로그인 화면에서 로그인해 주세요.";
    case "revoked":
      return "사용할 수 없는 링크입니다.\n소속 체육관에 새 링크를 요청해 주세요.";
    default:
      return "사용할 수 없는 링크입니다.";
  }
}

export default async function FighterAccountSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const page = await fighterAccountSetupService.getSetupPageByToken(token);

  if (page.status !== "valid") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold text-matchon-text-primary">
          유효하지 않은 링크
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-matchon-text-secondary">
          {statusMessage(page.status)}
        </p>
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-matchon-primary underline">
            로그인 화면으로 이동
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 pb-24">
      <h1 className="text-xl font-bold text-matchon-text-primary">
        선수 계정 설정
      </h1>
      <p className="mt-2 text-sm text-matchon-text-secondary">
        MATCHON에서 사용할 로그인 아이디와 비밀번호를 설정해 주세요.
      </p>
      <div className="mt-6">
        <FighterAccountSetupForm
          token={token}
          fighterName={page.fighterName}
          gymName={page.gymName}
          existingLoginId={page.existingLoginId}
        />
      </div>
    </main>
  );
}
