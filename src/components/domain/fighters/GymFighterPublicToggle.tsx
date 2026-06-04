"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gymTogglePublicFighterAction } from "@/features/public-fighters/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GymFighterPublicToggle({
  fighterId,
  initialPublic,
}: {
  fighterId: string;
  initialPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("fighterId", fighterId);
    fd.set("isPublic", next ? "true" : "false");
    const res = await gymTogglePublicFighterAction(null, fd);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setIsPublic(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant={isPublic ? "default" : "outline"}
        disabled={pending}
        className="h-7 text-xs"
        onClick={() => void toggle(!isPublic)}
      >
        {isPublic ? "공개 중" : "비공개"}
      </Button>
      {error ? (
        <span className="text-destructive text-[10px]">{error}</span>
      ) : null}
      <span
        className={cn(
          "text-[10px]",
          isPublic ? "text-primary" : "text-muted-foreground",
        )}
      >
        {isPublic ? "주최자 목록 노출" : "주최자 비노출"}
      </span>
    </div>
  );
}
