import Link from "next/link";
import { LogoutButton } from "@/components/domain/auth/LogoutButton";
import type { OrganizerPortalAccess } from "@/lib/organizer-portal-access";
import { OrganizerStatus } from "@/lib/enums";

export function OrganizerPortalBlockedView({
  access,
}: {
  access: OrganizerPortalAccess;
}) {
  const isArchived =
    access.organizer.status === OrganizerStatus.archived ||
    access.accessMode === "platform_archived";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <p className="text-sm font-semibold text-matchon-primary">MATCHON</p>
      <h1 className="mt-2 text-xl font-bold text-matchon-text-primary">
        {isArchived ? "운영 종료된 조직" : "서비스 이용 일시정지"}
      </h1>
      <p className="mt-3 text-sm text-matchon-text-secondary whitespace-pre-line">
        {access.bannerMessage}
      </p>
      {!isArchived ? (
        <p className="mt-2 text-sm text-matchon-text-secondary">
          관리자에게 문의해주세요.
        </p>
      ) : null}
      <div className="mt-6">
        <LogoutButton />
      </div>
      <p className="mt-4 text-xs text-matchon-text-secondary">
        <Link href="/" className="underline-offset-2 hover:underline">
          홈으로
        </Link>
      </p>
    </div>
  );
}
