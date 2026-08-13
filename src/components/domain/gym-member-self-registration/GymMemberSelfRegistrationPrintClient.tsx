"use client";

import { QRCodeSVG } from "qrcode.react";

export function GymMemberSelfRegistrationPrintClient({
  gymName,
  url,
}: {
  gymName: string;
  url: string | null;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-10 text-center print:py-6">
      <p className="text-sm font-semibold tracking-wide text-matchon-primary">
        MATCHON
      </p>
      <h1 className="mt-3 text-2xl font-bold text-matchon-text-primary">
        {gymName}
      </h1>
      <p className="mt-2 text-lg font-semibold">신규 회원 등록</p>
      {url ? (
        <div className="mt-6 flex justify-center">
          <QRCodeSVG value={url} size={240} includeMargin />
        </div>
      ) : (
        <p className="mt-6 text-sm text-matchon-text-secondary">
          사용 중인 링크가 없습니다. 회원관리에서 링크를 재발급해 주세요.
        </p>
      )}
      <p className="mt-6 text-sm text-matchon-text-secondary">
        QR을 스캔하고
        <br />
        회원정보를 작성해주세요.
      </p>
      <button
        type="button"
        className="mt-8 min-h-11 rounded-lg border border-matchon-border px-4 text-sm print:hidden"
        onClick={() => window.print()}
      >
        인쇄
      </button>
    </main>
  );
}
