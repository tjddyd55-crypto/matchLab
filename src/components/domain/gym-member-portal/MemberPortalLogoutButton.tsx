"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutGymMemberPortalAction } from "@/features/gym-member-portal/member-actions";
import { Button } from "@/components/ui/button";

export function MemberPortalLogoutButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-full"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("token", token);
        startTransition(async () => {
          await logoutGymMemberPortalAction(fd);
          router.replace(`/member-portal/${token}`);
          router.refresh();
        });
      }}
    >
      나가기
    </Button>
  );
}
