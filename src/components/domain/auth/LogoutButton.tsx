"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={pending}
      aria-label="로그아웃"
      onClick={() => {
        startTransition(async () => {
          const r = await signOutAction();
          if (r.ok) {
            router.push(r.data.redirectTo);
            router.refresh();
          }
        });
      }}
    >
      {pending ? "로그아웃…" : "로그아웃"}
    </Button>
  );
}
