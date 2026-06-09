"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveJudgeScorecardAction } from "@/features/judge/actions";
import { Button } from "@/components/ui/button";
import { JudgeDecisionMethod } from "@/lib/enums";
import { computeScorecardTotals } from "@/lib/judge-score-aggregation";
import type { JudgeScorecardFormVM } from "@/lib/services/judge-scorecard.service";

const DECISION_OPTIONS: { value: JudgeDecisionMethod; label: string }[] = [
  { value: JudgeDecisionMethod.decision, label: "판정" },
  { value: JudgeDecisionMethod.ko_tko, label: "KO/TKO" },
  { value: JudgeDecisionMethod.submission, label: "서브미션" },
  { value: JudgeDecisionMethod.disqualification, label: "실격" },
  { value: JudgeDecisionMethod.forfeit, label: "기권" },
  { value: JudgeDecisionMethod.no_contest, label: "노컨테스트" },
  { value: JudgeDecisionMethod.other, label: "기타" },
];

const WINNER_LABEL: Record<string, string> = {
  red: "홍코너 승",
  blue: "청코너 승",
  draw: "무승부",
  undecided: "미정",
};

type RoundState = JudgeScorecardFormVM["rounds"][number];

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n)));
}

function parseIntNonNeg(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function JudgeScorecardForm({ form }: { form: JudgeScorecardFormVM }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [judgeName, setJudgeName] = useState(form.judgeName);
  const [decisionMethod, setDecisionMethod] = useState(
    form.decisionMethod ?? "",
  );
  const [memo, setMemo] = useState(form.memo ?? "");
  const [rounds, setRounds] = useState<RoundState[]>(form.rounds);

  const totals = useMemo(() => computeScorecardTotals(rounds), [rounds]);
  const readOnly = form.isLocked;

  function updateRound(index: number, patch: Partial<RoundState>) {
    setRounds((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function save(submit: boolean) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", form.matchId);
      fd.set("judgeName", judgeName);
      fd.set("decisionMethod", decisionMethod);
      fd.set("memo", memo);
      fd.set("submit", submit ? "true" : "false");
      fd.set("roundsJson", JSON.stringify(rounds));
      const res = await saveJudgeScorecardAction(fd);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.refresh();
      if (submit) router.push("/judge/matches");
    });
  }

  const inputClass =
    "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">{form.eventTitle}</p>
        <p className="text-muted-foreground text-xs">
          {new Date(form.eventDate).toLocaleDateString("ko-KR")}
          {form.location ? ` · ${form.location}` : ""}
          {form.matchNumber != null ? ` · ${form.matchNumber}경기` : ""}
        </p>
        {form.divisionLabel ? (
          <p className="text-muted-foreground text-xs">{form.divisionLabel}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1">
            <p className="text-muted-foreground text-[10px]">홍코너</p>
            <p className="font-medium text-red-700 dark:text-red-300">
              {form.fighterRedName}
            </p>
          </div>
          <div className="rounded border border-blue-500/30 bg-blue-500/5 px-2 py-1">
            <p className="text-muted-foreground text-[10px]">청코너</p>
            <p className="font-medium text-blue-700 dark:text-blue-300">
              {form.fighterBlueName}
            </p>
          </div>
        </div>
      </header>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">심판 이름</span>
        <input
          value={judgeName}
          onChange={(e) => setJudgeName(e.target.value)}
          disabled={readOnly}
          required
          className={inputClass}
          placeholder="본인 이름을 입력하세요"
        />
      </label>

      <p className="text-muted-foreground text-xs leading-relaxed">
        10점 감점제 기준입니다. 감점(deductions)은 총점에서 자동 차감됩니다.
        다운 횟수는 기록만 하며 점수는 직접 입력합니다.
      </p>

      <div className="flex flex-col gap-4">
        {rounds.map((round, index) => (
          <fieldset
            key={round.roundNumber}
            className="rounded-lg border p-3"
            disabled={readOnly}
          >
            <legend className="px-1 text-sm font-medium">
              {round.roundNumber}라운드
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-red-600">홍 점수 (0–10)</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={round.redScore ?? ""}
                  onChange={(e) =>
                    updateRound(index, { redScore: parseNum(e.target.value) })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-blue-600">청 점수 (0–10)</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={round.blueScore ?? ""}
                  onChange={(e) =>
                    updateRound(index, { blueScore: parseNum(e.target.value) })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span>홍 다운</span>
                <input
                  type="number"
                  min={0}
                  value={round.redKnockdowns}
                  onChange={(e) =>
                    updateRound(index, {
                      redKnockdowns: parseIntNonNeg(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span>청 다운</span>
                <input
                  type="number"
                  min={0}
                  value={round.blueKnockdowns}
                  onChange={(e) =>
                    updateRound(index, {
                      blueKnockdowns: parseIntNonNeg(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span>홍 감점</span>
                <input
                  type="number"
                  min={0}
                  value={round.redDeductions}
                  onChange={(e) =>
                    updateRound(index, {
                      redDeductions: parseIntNonNeg(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span>청 감점</span>
                <input
                  type="number"
                  min={0}
                  value={round.blueDeductions}
                  onChange={(e) =>
                    updateRound(index, {
                      blueDeductions: parseIntNonNeg(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <label className="mt-2 flex flex-col gap-1 text-xs">
              <span>비고</span>
              <input
                value={round.roundMemo ?? ""}
                onChange={(e) =>
                  updateRound(index, {
                    roundMemo: e.target.value || null,
                  })
                }
                className={inputClass}
              />
            </label>
          </fieldset>
        ))}
      </div>

      <div className="bg-muted/40 rounded-lg border p-4 text-sm">
        <p>
          홍코너 총점: <strong>{totals.redTotal}</strong> · 청코너 총점:{" "}
          <strong>{totals.blueTotal}</strong>
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          심판 판정: {WINNER_LABEL[totals.winnerCorner] ?? totals.winnerCorner}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">판정 방식</span>
        <select
          value={decisionMethod}
          onChange={(e) => setDecisionMethod(e.target.value)}
          disabled={readOnly}
          className={inputClass}
        >
          <option value="">선택 (선택사항)</option>
          {DECISION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">심판 메모</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          disabled={readOnly}
          rows={3}
          className={inputClass}
        />
      </label>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => save(false)}
          >
            임시 저장
          </Button>
          <Button type="button" disabled={pending} onClick={() => save(true)}>
            전송
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          공식 결과가 확정되어 읽기 전용입니다.
        </p>
      )}
    </div>
  );
}
