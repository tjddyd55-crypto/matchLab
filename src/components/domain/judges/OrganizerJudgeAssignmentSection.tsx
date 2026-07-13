"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignJudgeToMatchAction,
  unassignJudgeFromMatchAction,
} from "@/features/judges/actions";
import { Button } from "@/components/ui/button";
import type { JudgeAssignmentVM } from "@/lib/services/judge-assignment.service";
import type { JudgeCredentialListItemVM } from "@/lib/services/judge-credential.service";
import type { OrganizerEventMatchListItemVM } from "@/lib/services/match.service";
import { judgeFieldInputClass } from "@/lib/ui/judge-ui";

export function OrganizerJudgeAssignmentSection({
  eventId,
  matches,
  credentials,
  assignments,
}: {
  eventId: string;
  matches: OrganizerEventMatchListItemVM[];
  credentials: JudgeCredentialListItemVM[];
  assignments: JudgeAssignmentVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.matchId ?? "");
  const [assignFormKey, setAssignFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const matchAssignments = assignments.filter(
    (a) => a.matchId === selectedMatchId,
  );
  const activeCredentials = credentials.filter((c) => c.isActive);

  const inputClass = judgeFieldInputClass;

  const selectedMatch = matches.find((m) => m.matchId === selectedMatchId);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">경기별 심판 배정</h2>

      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">경기 선택</span>
        <select
          value={selectedMatchId}
          onChange={(e) => setSelectedMatchId(e.target.value)}
          className={inputClass}
        >
          {matches.map((m) => (
            <option key={m.matchId} value={m.matchId}>
              {m.matchNumber != null ? `${m.matchNumber}경기` : `${m.matchOrder}번`}
              {" — "}
              {m.fighterRed?.name ?? "미배정"} vs{" "}
              {m.fighterBlue?.name ?? "미배정"}
            </option>
          ))}
        </select>
      </label>

      {selectedMatch ? (
        <p className="text-muted-foreground text-xs">
          {selectedMatch.divisionLabel ?? "경기구분 미상"} ·{" "}
          {selectedMatch.fighterRed?.name ?? "미배정"} vs{" "}
          {selectedMatch.fighterBlue?.name ?? "미배정"}
        </p>
      ) : null}

      <form
        key={assignFormKey}
        className="flex flex-wrap items-end gap-2 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setWarn(null);
          const fd = new FormData(e.currentTarget);
          fd.set("eventId", eventId);
          fd.set("matchId", selectedMatchId);
          startTransition(async () => {
            const res = await assignJudgeToMatchAction(fd);
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            setAssignFormKey((k) => k + 1);
            router.refresh();
          });
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs sm:min-w-[140px] sm:flex-none">
          <span>심판 계정</span>
          <select name="credentialId" required className={inputClass}>
            <option value="">선택</option>
            {activeCredentials.map((c) => (
              <option key={c.id} value={c.id}>
                {c.loginId}
                {c.displayName ? ` (${c.displayName})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-20 flex-col gap-1 text-xs">
          <span>순서</span>
          <select name="judgeOrder" defaultValue="1" className={inputClass}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="isHeadJudge" value="true" />
          주심
        </label>
        <Button type="submit" size="sm" disabled={pending || !selectedMatchId}>
          배정
        </Button>
      </form>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {warn ? (
        <p className="text-amber-800 text-sm dark:text-amber-200">{warn}</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {matchAssignments.length === 0 ? (
          <li className="text-muted-foreground text-sm">배정된 심판이 없습니다.</li>
        ) : (
          matchAssignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
            >
              <span className="min-w-0 break-words">
                {a.judgeOrder}번 · {a.loginId}
                {a.displayName ? ` (${a.displayName})` : ""}
                {a.isHeadJudge ? " · 주심" : ""}
                {a.hasSubmittedScorecard ? " · 제출됨" : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (
                    a.hasSubmittedScorecard &&
                    !window.confirm(
                      "제출된 채점표가 있어 해제해도 기록은 남습니다. 계속할까요?",
                    )
                  ) {
                    return;
                  }
                  const fd = new FormData();
                  fd.set("assignmentId", a.id);
                  startTransition(async () => {
                    const res = await unassignJudgeFromMatchAction(fd);
                    if (!res.ok) {
                      setError(res.error.message);
                      return;
                    }
                    if (res.data.hadSubmittedScorecard) {
                      setWarn(
                        "제출된 채점표가 있어 해제했지만 기록은 유지됩니다.",
                      );
                    }
                    router.refresh();
                  });
                }}
              >
                해제
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
