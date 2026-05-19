"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { AthleteSignPublicView } from "@/lib/services/fighter-consent.service";
import { FighterConsentStatus } from "@/lib/enums";
import {
  ConsentAgreementChecklist,
  DEFAULT_AGREEMENT_STATE,
  type AgreementState,
} from "@/components/domain/consents/ConsentAgreementChecklist";
import { ConsentSignatureSection } from "@/components/domain/consents/ConsentSignatureSection";
import type { SignaturePadHandle } from "@/components/shared/SignaturePad";
import { completeFighterConsentAction } from "@/features/fighter-consents/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

type UploadEnvelope = {
  data: {
    uploadUrl: string;
    path: string;
    expiresIn: number;
    maxBytes: number;
  };
};

export function AthleteApplicationSignForm({
  initial,
}: {
  initial: AthleteSignPublicView;
}) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [agreements, setAgreements] =
    useState<AgreementState>(DEFAULT_AGREEMENT_STATE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(
    initial.consentStatus === FighterConsentStatus.completed,
  );

  if (completed) {
    return (
      <CompletedCard />
    );
  }

  if (!initial.documentId) {
    return (
      <p className="text-destructive text-sm" role="alert">
        연결된 신청서 문서를 찾을 수 없습니다. 체육관에 문의해 주세요.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const allAgreed = Object.values(agreements).every(Boolean);
    if (!allAgreed) {
      setError("필수 동의 항목을 모두 선택해 주세요.");
      return;
    }
    if (padRef.current?.isEmpty()) {
      setError("서명을 입력해 주세요.");
      return;
    }

    const blob = await padRef.current?.toBlob();
    if (!blob) {
      setError("서명 이미지를 만들 수 없습니다. 다시 시도해 주세요.");
      return;
    }
    if (blob.size > MAX_SIGNATURE_BYTES) {
      setError(
        `서명 이미지가 너무 큽니다 (${Math.ceil(blob.size / 1024)}KB). ${Math.floor(MAX_SIGNATURE_BYTES / 1024)}KB 이하로 저장해 주세요.`,
      );
      return;
    }

    setPending(true);
    try {
      const issueRes = await fetch("/api/uploads/application-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: initial.token,
          documentId: initial.documentId,
          consentId: initial.consentId,
          mimeType: "image/png",
        }),
      });

      const issueJson = (await issueRes.json()) as
        | UploadEnvelope
        | { error?: { message?: string } };

      if (
        !issueRes.ok ||
        !("data" in issueJson) ||
        !issueJson.data?.uploadUrl ||
        !issueJson.data.path
      ) {
        const msg =
          "error" in issueJson && issueJson.error?.message
            ? issueJson.error.message
            : "업로드 준비에 실패했습니다.";
        setError(msg);
        return;
      }

      const putRes = await fetch(issueJson.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });
      if (!putRes.ok) {
        setError("서명 파일 업로드에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      const fd = new FormData();
      fd.set("token", initial.token);
      fd.set("signatureImagePath", issueJson.data.path);
      fd.set("privacyAgreed", agreements.privacyAgreed ? "true" : "false");
      fd.set("riskAgreed", agreements.riskAgreed ? "true" : "false");
      fd.set("emergencyAgreed", agreements.emergencyAgreed ? "true" : "false");
      fd.set(
        "resultDisclosureAgreed",
        agreements.resultDisclosureAgreed ? "true" : "false",
      );
      fd.set("photoVideoAgreed", agreements.photoVideoAgreed ? "true" : "false");

      const completeRes = await completeFighterConsentAction(fd);
      if (!completeRes.ok) {
        setError(completeRes.error.message);
        return;
      }
      setCompleted(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm">
          대회: <span className="text-foreground">{initial.eventTitle}</span>
        </p>
        <p className="text-muted-foreground text-sm">
          선수:{" "}
          <span className="text-foreground font-medium">{initial.fighterName}</span>{" "}
          · {initial.birthYearMasked}
        </p>
        <p className="font-medium">{initial.documentTitle}</p>
        <ul className="text-muted-foreground list-inside list-disc text-xs">
          {initial.policyLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </header>

      <ConsentAgreementChecklist value={agreements} onChange={setAgreements} />
      <ConsentSignatureSection padRef={padRef} />

      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "제출 중…" : "서명 제출"}
      </Button>
    </form>
  );
}

function CompletedCard() {
  return (
    <div
      className="ring-foreground/10 space-y-3 rounded-xl bg-card p-6 ring-1"
      role="status"
    >
      <p className="font-medium">선수 서명이 완료되었습니다.</p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        보호자 동의가 필요한 경우 체육관에서 안내한 링크로 진행해 주세요.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        홈으로
      </Link>
    </div>
  );
}
