"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { isMatchonDesktopClient } from "@/lib/desktop/client";
import { cn } from "@/lib/utils";

export function LogoutButton({
  afterLogoutPath,
  className,
}: {
  /** desktop Manager 등 — 서버 revoke 후 클라이언트 이동 경로 고정 */
  afterLogoutPath?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className={cn(className)}
      disabled={pending}
      aria-label="로그아웃"
      onClick={() => {
        startTransition(async () => {
          const r = await signOutAction();
          if (!r.ok) return;
          const dest = afterLogoutPath ?? r.data.redirectTo;
          // history에 인증 화면을 남기지 않음 (뒤로가기 → homepage 방지)
          router.replace(dest);
          router.refresh();
          if (isMatchonDesktopClient()) {
            void window.matchonDesktop?.clearNavigationHistory?.();
          }
        });
      }}
    >
      {pending ? "로그아웃…" : "로그아웃"}
    </Button>
  );
}
