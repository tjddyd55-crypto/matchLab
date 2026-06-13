"use client";

import { useState } from "react";
import { judgeLogoutAction } from "@/features/judge/actions";
import { Button } from "@/components/ui/button";

export function JudgeLogoutButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await judgeLogoutAction();
          window.location.assign("/judge/login");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "로그아웃…" : "로그아웃"}
    </Button>
  );
}
