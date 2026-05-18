"use client";

import { QRCodeSVG } from "qrcode.react";

export function EventSpectatorQr({ url }: { url: string }) {
  if (!/^https?:\/\//i.test(url)) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeSVG value={url} size={168} level="M" includeMargin />
      <p className="text-muted-foreground max-w-[220px] text-center text-[10px] leading-relaxed">
        관람용 QR · 현장 게시 시 보호자·관람자가 대진표·결과를 빠르게 열 수
        있습니다.
      </p>
    </div>
  );
}
