"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { JudgeScoreSheetJudgeNumber } from "@/lib/judge-score-sheet/types";
import { JUDGE_SCORE_SHEET_JUDGE_NUMBERS } from "@/lib/judge-score-sheet/types";

type MetaResponse = {
  eventId: string;
  eventName: string;
  matchCount: number;
  venues: Array<{ id: string; name: string; matchCount: number }>;
};

function downloadFilenameFromDisposition(
  disposition: string,
  fallback: string,
): string {
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="([^"]+)"/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

export function OrganizerJudgeScoreSheetActions({
  eventId,
}: {
  eventId: string;
}) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [selectedJudges, setSelectedJudges] = useState<
    JudgeScoreSheetJudgeNumber[]
  >([...JUDGE_SCORE_SHEET_JUDGE_NUMBERS]);
  const [venueId, setVenueId] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMetaLoading(true);
    setMetaError(null);
    void fetch(
      `/api/organizer/events/${eventId}/judge-score-sheet-meta`,
      { credentials: "include" },
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "경기 정보를 불러오지 못했습니다.");
        }
        return res.json() as Promise<MetaResponse>;
      })
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setMetaError(
            e instanceof Error ? e.message : "경기 정보를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  const filteredMatchCount = useMemo(() => {
    if (!meta) return 0;
    if (!venueId) return meta.matchCount;
    return meta.venues.find((v) => v.id === venueId)?.matchCount ?? 0;
  }, [meta, venueId]);

  const pageCount = filteredMatchCount * selectedJudges.length;

  function toggleJudge(n: JudgeScoreSheetJudgeNumber) {
    setSelectedJudges((prev) => {
      if (prev.includes(n)) {
        const next = prev.filter((j) => j !== n);
        return next.length > 0 ? next : prev;
      }
      return JUDGE_SCORE_SHEET_JUDGE_NUMBERS.filter(
        (j) => j === n || prev.includes(j),
      );
    });
  }

  const onDownload = useCallback(async () => {
    if (downloading || selectedJudges.length === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("judges", selectedJudges.join(","));
      if (venueId) qs.set("courtId", venueId);
      const res = await fetch(
        `/api/organizer/events/${eventId}/judge-score-sheet-pdf?${qs}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ??
            "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      const blob = await res.blob();
      const filename = downloadFilenameFromDisposition(
        res.headers.get("Content-Disposition") ?? "",
        "MATCHON_심판채점표.pdf",
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setDownloading(false);
    }
  }, [downloading, eventId, selectedJudges, venueId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            심판 채점표
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>심판 채점표 출력</DialogTitle>
          <DialogDescription>
            한 페이지에 한 경기·한 심판 채점표가 출력됩니다. 대회·선수 정보는
            자동 입력되고, 점수·이름·서명만 수기 작성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {metaLoading ? (
            <p className="text-sm text-matchon-text-secondary">불러오는 중…</p>
          ) : metaError ? (
            <p className="text-sm text-destructive">{metaError}</p>
          ) : meta ? (
            <>
              <div className="rounded-lg border border-matchon-border bg-matchon-surface/40 px-3 py-2 text-sm">
                <p>
                  총 경기:{" "}
                  <span className="font-semibold">{filteredMatchCount}경기</span>
                </p>
                <p>
                  선택 심판:{" "}
                  <span className="font-semibold">
                    {selectedJudges.length}명
                  </span>
                </p>
                <p>
                  생성 페이지:{" "}
                  <span className="font-semibold">{pageCount}페이지</span>
                </p>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">심판</legend>
                <div className="flex flex-wrap gap-3">
                  {JUDGE_SCORE_SHEET_JUDGE_NUMBERS.map((n) => (
                    <label
                      key={n}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedJudges.includes(n)}
                        onChange={() => toggleJudge(n)}
                      />
                      {n}심판
                    </label>
                  ))}
                </div>
              </fieldset>

              {meta.venues.length > 1 ? (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">장소</span>
                  <select
                    className="w-full rounded-md border border-matchon-border bg-white px-3 py-2 text-sm"
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                  >
                    <option value="">전체 ({meta.matchCount}경기)</option>
                    {meta.venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.matchCount}경기)
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={
              downloading ||
              metaLoading ||
              !!metaError ||
              selectedJudges.length === 0 ||
              filteredMatchCount === 0
            }
            onClick={() => void onDownload()}
          >
            {downloading ? "PDF 생성 중…" : "PDF 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
