"use client";

import { useState, useTransition } from "react";
import { EventQrCard } from "@/components/domain/events/qr/EventQrCard";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ensureOnsiteOpsLinkAction,
  rotateOnsiteOpsLinkAction,
} from "@/features/onsite-ops/owner-actions";
import { buildOnsiteOpsPortalUrl } from "@/lib/onsite-ops/token";
import type { OnsiteOpsLinkOwnerVM } from "@/lib/services/onsite-ops-access.service";

export function OnsiteOpsLinkManager({
  eventId,
  baseUrl,
  initialLink,
}: {
  eventId: string;
  baseUrl: string;
  initialLink: OnsiteOpsLinkOwnerVM | null;
}) {
  const [link, setLink] = useState(initialLink);
  const [rawToken, setRawToken] = useState<string | null>(
    initialLink?.hasDisplayableLink ? null : null,
  );
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const displayUrl =
    rawToken != null
      ? buildOnsiteOpsPortalUrl(rawToken, baseUrl)
      : link?.url;

  async function copyLink() {
    if (!displayUrl) return;
    try {
      await navigator.clipboard.writeText(displayUrl);
      setFeedback({ tone: "success", message: "링크가 복사되었습니다." });
    } catch {
      setFeedback({ tone: "error", message: "링크 복사에 실패했습니다." });
    }
  }

  function runEnsure(rotate = false) {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      const res = rotate
        ? await rotateOnsiteOpsLinkAction(fd)
        : await ensureOnsiteOpsLinkAction(fd);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setLink(res.data.link);
      setRawToken(res.data.rawToken);
      setFeedback({
        tone: "success",
        message: rotate
          ? "운영관리 링크가 재발급되었습니다. 이전 링크는 더 이상 사용할 수 없습니다."
          : "운영관리 링크가 준비되었습니다.",
      });
    });
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">운영관리</CardTitle>
        <p className="text-muted-foreground text-sm">
          현장 스태프가 휴대폰으로 계체 및 경기운영을 할 수 있는 링크입니다.
        </p>
        <p className="text-xs text-amber-900/80">
          이 링크를 가진 사용자는 해당 대회의 계체 및 경기운영 정보를 수정할 수
          있습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayUrl ? (
          <EventQrCard
            title="현장 운영관리"
            description="계체 · 경기운영"
            steps="QR 스캔 → 하단 탭에서 기능 선택"
            url={displayUrl}
            printGroup="spectator-overview"
            badge="운영"
            downloadFileName={`matchon-onsite-ops-${eventId}`}
            qrSize={180}
          />
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
            아직 발급된 운영관리 링크가 없습니다.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runEnsure(false)}
          >
            {link?.hasDisplayableLink ? "링크 다시 표시" : "링크 발급"}
          </Button>
          {displayUrl ? (
            <Button type="button" size="sm" variant="outline" onClick={copyLink}>
              링크 복사
            </Button>
          ) : null}
          {link?.hasDisplayableLink || rawToken ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => runEnsure(true)}
            >
              링크 재발급
            </Button>
          ) : null}
        </div>

        {feedback ? (
          <FeedbackMessage tone={feedback.tone === "success" ? "success" : "error"}>
            {feedback.message}
          </FeedbackMessage>
        ) : null}
      </CardContent>
    </Card>
  );
}
