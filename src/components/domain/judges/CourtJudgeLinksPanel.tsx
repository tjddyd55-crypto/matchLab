"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import { buildCourtHeadJudgeUrl, buildCourtScoreJudgeUrl } from "@/lib/qr-url";

export function CourtJudgeLinksPanel({
  courts,
  baseUrl,
  eventId,
}: {
  courts: EventCourtVM[];
  baseUrl: string;
  eventId?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1800);
  }

  if (courts.length === 0) {
    return (
      <section className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        활성 경기장이 없습니다.{" "}
        <Link href={`/organizer/events/${eventId ?? ""}/courts`} className="text-primary underline">
          경기장 관리
        </Link>
        에서 경기장을 먼저 등록하세요.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">경기장별 심판 QR · URL</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          QR 접속 후 이름과 생년월일을 입력하세요. 채점심판은 진행중 경기만 채점하고,
          주심판은 경기 시작·승패 입력·완료·취소를 처리합니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {courts.map((court) => {
          const scoreUrl = buildCourtScoreJudgeUrl(court.id, baseUrl);
          const headUrl = buildCourtHeadJudgeUrl(court.id, baseUrl);
          return (
            <article key={court.id} className="space-y-3 rounded-lg border p-3">
              <h3 className="font-medium">{court.name}</h3>
              <div className="grid gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="font-medium">채점심판</p>
                  <code className="mt-1 block break-all">{scoreUrl}</code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void copy(`${court.id}-score`, scoreUrl)}
                  >
                    {copied === `${court.id}-score` ? "복사됨" : "URL 복사"}
                  </Button>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="font-medium">주심판</p>
                  <code className="mt-1 block break-all">{headUrl}</code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void copy(`${court.id}-head`, headUrl)}
                  >
                    {copied === `${court.id}-head` ? "복사됨" : "URL 복사"}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
