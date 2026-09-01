"use client";

import { useEffect, useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { downloadSvgAsPng } from "@/components/domain/judges/judge-qr-ui";
import { getFighterMyMatchPublicUrlAction } from "@/features/my-match/actions";

export function FighterMyMatchQrPanel({
  eventSlug,
  fighterId,
  fighterName,
}: {
  eventSlug: string;
  fighterId: string;
  fighterName: string;
}) {
  const qrId = useId().replace(/:/g, "");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFighterMyMatchPublicUrlAction({ eventSlug, fighterId })
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setError("QR URL을 생성하지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [eventSlug, fighterId]);

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError("URL 복사에 실패했습니다.");
    }
  };

  const downloadQr = () => {
    const svg = document.getElementById(qrId)?.querySelector("svg");
    if (!svg) return;
    downloadSvgAsPng(svg as SVGSVGElement, `${fighterName}-my-match-qr.png`);
  };

  if (error) {
    return <p className="text-destructive text-xs">{error}</p>;
  }

  if (!url) {
    return <p className="text-muted-foreground text-xs">QR 준비 중…</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-3">
      <div>
        <p className="text-sm font-bold">내 경기 순서 QR</p>
        <p className="text-muted-foreground text-xs">
          선수·코치가 로그인 없이 경기 순서를 확인합니다. 순서 변경 후에도 같은 QR을 사용합니다.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
        <QRCodeSVG
          id={qrId}
          value={url}
          size={160}
          level="M"
          className="rounded-md border bg-white p-2"
        />
        <div className="flex w-full flex-col gap-2 sm:min-w-0 sm:flex-1">
          <p className="text-muted-foreground break-all text-xs">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyUrl}>
              URL 복사
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={downloadQr}>
              QR 저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
