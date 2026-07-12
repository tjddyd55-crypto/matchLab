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
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    return <CompletedCard />;
  }

  if (!initial.documentId) {
    return (
      <FeedbackMessage tone="error" role="alert">
        연결된 신청서 문서를 찾을 수 없습니다. 체육관에 문의해 주세요.
      </FeedbackMessage>
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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle>{initial.documentTitle}</CardTitle>
            <MatchonStatusBadge status="signature_pending" label="서명대기" size="sm" />
          </div>
          <CardDescription>
            대회: {initial.eventTitle} · 선수: {initial.fighterName} (
            {initial.birthYearMasked})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc text-xs leading-relaxed">
            {initial.policyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">필수 동의</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsentAgreementChecklist value={agreements} onChange={setAgreements} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">서명</CardTitle>
          <CardDescription>터치 또는 마우스로 서명해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentSignatureSection padRef={padRef} />
        </CardContent>
      </Card>

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}

      <Button type="submit" size="field" disabled={pending} className="w-full">
        {pending ? "제출 중…" : "서명 제출"}
      </Button>
    </form>
  );
}

function CompletedCard() {
  return (
    <Card variant="success">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>선수 서명이 완료되었습니다</CardTitle>
          <MatchonStatusBadge status="signature_completed" label="서명완료" size="sm" />
        </div>
        <CardDescription>
          보호자 동의가 필요한 경우 체육관에서 안내한 링크로 진행해 주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "field" }), "w-full sm:w-auto")}
        >
          홈으로
        </Link>
      </CardContent>
    </Card>
  );
}
