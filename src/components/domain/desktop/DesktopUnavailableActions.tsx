"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { DESKTOP_LOGIN_PATH } from "@/lib/desktop/constants";
import { cn } from "@/lib/utils";

/**
 * 사용 불가 계정: 서버 session revoke (렌더 중 cookie mutate 금지).
 * 공개 홈으로 보내지 않고 로그인으로만 안내.
 */
export function DesktopUnavailableActions() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void signOutAction();
  }, []);

  return (
    <div className="mt-4 flex w-full flex-col gap-3">
      <p className="text-center text-sm text-matchon-text-secondary">
        공개 홈페이지로 이동하지 않습니다.
      </p>
      <Link
        href={DESKTOP_LOGIN_PATH}
        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
      >
        다른 계정으로 로그인
      </Link>
    </div>
  );
}
