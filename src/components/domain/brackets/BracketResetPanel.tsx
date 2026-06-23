"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetEventBracketsAction } from "@/features/brackets/actions";
import { Button } from "@/components/ui/button";

export function BracketResetPanel({
  eventId,
  canResetSafely,
  matchesWithResults,
}: {
  eventId: string;
  canResetSafely: boolean;
  matchesWithResults: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleReset() {
    if (!canResetSafely) return;

    const ok = window.confirm(
      [
        "대진표를 초기화하면 생성된 경기 목록이 삭제됩니다.",
        "신청자 정보는 삭제되지 않습니다.",
        "",
        "계속하시겠습니까?",
      ].join("\n"),
    );
    if (!ok) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      const res = await resetEventBracketsAction(fd);
      if (!res.ok) {
        window.alert(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">대진표 초기화</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        생성된 경기 목록만 삭제합니다. 신청자·체육관·입금·계체 데이터는 유지됩니다.
      </p>

      {matchesWithResults > 0 ? (
        <p className="text-destructive mt-3 text-sm">
          이미 진행/종료된 경기({matchesWithResults}건)가 있어 초기화할 수 없습니다.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={pending || !canResetSafely}
          onClick={handleReset}
        >
          {pending ? "초기화 중…" : "대진표 초기화"}
        </Button>
      )}
    </section>
  );
}
