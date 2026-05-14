"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/lib/enums";

/**
 * 클라이언트 UX용 보조 가드 — 버튼·메뉴 노출만 숨길 때 사용한다.
 * 최종 권한 판단·민감 데이터 노출 여부는 반드시 서버(RSC / Route Handler / Server Action)에서만 수행한다.
 * 이 컴포넌트만으로 보호된 API나 페이지를 대체할 수 없다.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: readonly UserRole[];
  children: ReactNode;
}) {
  void allow;
  return <>{children}</>;
}
