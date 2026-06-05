"use client";

import type { UnmatchedBracketCandidateVM } from "@/lib/services/bracket-auto-match.service";
import { EligibilityBadge } from "@/components/domain/field-status/EligibilityBadge";

const WAITING_REASONS = new Set([
  "odd_count",
  "no_opponent_in_division",
  "not_field_eligible",
  "missing_division",
]);

export function UnmatchedBracketCandidatesPanel({
  candidates,
}: {
  candidates: UnmatchedBracketCandidateVM[];
}) {
  const waiting = candidates.filter((c) => WAITING_REASONS.has(c.reason));
  const placed = candidates.filter((c) => c.reason === "already_placed");

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">미매칭 / 대기 선수</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          자동·수동 대진 배치 후 아직 상대가 없거나 대기 중인 선수입니다. 아래
          후보 목록에서 수동 배치할 수 있습니다.
        </p>
      </div>

      {waiting.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          현재 미매칭·대기 선수가 없습니다.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">선수명</th>
                <th className="px-2 py-2 font-medium">체육관</th>
                <th className="px-2 py-2 font-medium">부문/체급</th>
                <th className="px-2 py-2 font-medium">성별</th>
                <th className="px-2 py-2 font-medium">연령부</th>
                <th className="px-2 py-2 font-medium">신청</th>
                <th className="px-2 py-2 font-medium">출전</th>
                <th className="px-2 py-2 font-medium">사유</th>
              </tr>
            </thead>
            <tbody>
              {waiting.map((c) => (
                <tr key={c.applicationId} className="border-b last:border-0">
                  <td className="px-2 py-2 font-medium">{c.fighterName}</td>
                  <td className="px-2 py-2">{c.gymName}</td>
                  <td className="px-2 py-2 text-xs">{c.divisionLabel}</td>
                  <td className="px-2 py-2">{c.gender ?? "—"}</td>
                  <td className="px-2 py-2">{c.ageGroup ?? "—"}</td>
                  <td className="px-2 py-2 text-xs">{c.applicationStatus}</td>
                  <td className="px-2 py-2">
                    <EligibilityBadge
                      label={c.eligibilityLabel}
                      isEligible={c.isEligibleForBracket}
                    />
                  </td>
                  <td className="px-2 py-2 text-xs text-amber-800 dark:text-amber-200">
                    {c.reasonLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {placed.length > 0 ? (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            이미 배치된 선수 ({placed.length}명)
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {placed.map((c) => (
              <li key={c.applicationId}>
                {c.fighterName} · {c.gymName} — {c.divisionLabel}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
