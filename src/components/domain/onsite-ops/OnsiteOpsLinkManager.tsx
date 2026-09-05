"use client";

import { useState, useTransition } from "react";
import { EventQrCard } from "@/components/domain/events/qr/EventQrCard";
import { EVENT_QR_SECTION_IDS } from "@/components/domain/events/qr/EventQrPageNav";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
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
  const { confirm } = useAppConfirmDialog();
  const [link, setLink] = useState(initialLink);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const displayUrl =
    rawToken != null
      ? buildOnsiteOpsPortalUrl(rawToken, baseUrl)
      : link?.url;

  function runEnsure() {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      const res = await ensureOnsiteOpsLinkAction(fd);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setLink(res.data.link);
      setRawToken(res.data.rawToken);
      setFeedback({
        tone: "success",
        message: "운영관리 링크가 준비되었습니다.",
      });
    });
  }

  async function runRotate() {
    const ok = await confirm({
      title: "운영관리 링크를 재발급할까요?",
      description:
        "재발급하면 기존 운영관리 링크는 사용할 수 없습니다. 현장에 배포된 QR·링크도 함께 교체해야 합니다.",
      confirmLabel: "재발급",
      variant: "danger",
    });
    if (!ok) return;

    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      const res = await rotateOnsiteOpsLinkAction(fd);
      if (!res.ok) {
        setFeedback({ tone: "error", message: res.error.message });
        return;
      }
      setLink(res.data.link);
      setRawToken(res.data.rawToken);
      setFeedback({
        tone: "success",
        message: "운영관리 링크가 재발급되었습니다.",
      });
    });
  }

  return (
    <section
      id={EVENT_QR_SECTION_IDS.onsiteOps}
      className="scroll-mt-20 space-y-3 print:hidden"
    >
      <header className="space-y-1">
        <p className="text-muted-foreground text-[11px] font-semibold">
          3. 운영관리 QR
        </p>
        <h2 className="text-lg font-semibold">운영관리 QR</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          계체 및 경기운영 모바일 운영용입니다. 이 링크로 계체 및 경기운영
          페이지에 접속할 수 있습니다.
        </p>
        <p className="text-xs leading-relaxed text-amber-900/85">
          {link?.warning ??
            "이 링크를 가진 사용자는 해당 대회의 계체 및 경기운영 정보를 수정할 수 있습니다."}
        </p>
      </header>

      {displayUrl ? (
        <div className="space-y-3">
          <EventQrCard
            layout="split"
            title="현장 운영관리"
            description="모바일 하단 메뉴에서 계체 · 경기운영을 선택합니다."
            steps="QR 스캔 → 계체 또는 경기운영 탭 선택"
            url={displayUrl}
            urlLabel="운영관리 링크"
            printGroup="onsite-ops"
            badge="운영"
            downloadFileName={`matchon-onsite-ops-${eventId}`}
            qrSize={168}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => void runRotate()}
            >
              링크 재발급
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-amber-200/80 bg-amber-50/20 px-4 py-6 text-center">
          <p className="text-muted-foreground text-sm">
            아직 발급된 운영관리 링크가 없습니다.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={runEnsure}
          >
            운영관리 링크 생성
          </Button>
        </div>
      )}

      {feedback ? (
        <FeedbackMessage tone={feedback.tone === "success" ? "success" : "error"}>
          {feedback.message}
        </FeedbackMessage>
      ) : null}
    </section>
  );
}
