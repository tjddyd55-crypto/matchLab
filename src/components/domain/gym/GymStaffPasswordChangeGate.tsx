"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const CHANGE_PASSWORD_PATH = "/gym/change-password";

/**
 * 선생님(gym_staff) mustChangePassword 시 포털 본 기능 진입을 막고
 * 비밀번호 변경 화면으로 보낸다. 변경 페이지 자체는 통과시킨다.
 */
export function GymStaffPasswordChangeGate({
  mustChangePassword,
  children,
}: {
  mustChangePassword: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onChangePage = pathname === CHANGE_PASSWORD_PATH;

  useEffect(() => {
    if (mustChangePassword && !onChangePage) {
      router.replace(CHANGE_PASSWORD_PATH);
    }
  }, [mustChangePassword, onChangePage, router]);

  if (mustChangePassword && !onChangePage) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-sm text-matchon-text-secondary">
        비밀번호 변경 화면으로 이동 중…
      </div>
    );
  }

  return <>{children}</>;
}
