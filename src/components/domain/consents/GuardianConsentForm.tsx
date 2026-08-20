"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { GuardianConsentPublicFormView } from "@/lib/types/guardian-consent-public";
import { ConsentStatus } from "@/lib/enums";
import { completeGuardianConsentAction } from "@/features/consents/actions";
import { GuardianConsentDocument } from "@/components/domain/consents/GuardianConsentDocument";
import {
  ConsentAgreementChecklist,
  DEFAULT_AGREEMENT_STATE,
  type AgreementState,
} from "@/components/domain/consents/ConsentAgreementChecklist";
import { ConsentSignatureSection } from "@/components/domain/consents/ConsentSignatureSection";
import type { SignaturePadHandle } from "@/components/shared/SignaturePad";
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
import { publicApplicationFieldInputClass } from "@/lib/ui/public-application-ui";
import { cn } from "@/lib/utils";

/** `upload.service.ts` 의 {@link CONSENT_SIGNATURE_MAX_BYTES} 와 동기화 */
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

type UploadEnvelope = {
  data: {
    uploadUrl: string;
    path: string;
    expiresIn: number;
    maxBytes: number;
  };
};

export function GuardianConsentForm({
  token,
  registrationSubmissionId,
  documentId,
  scope = "registration",
  initial,
}: {
  token?: string;
  registrationSubmissionId?: string | null;
  documentId?: string | null;
  scope?: "registration" | "application";
  initial: GuardianConsentPublicFormView;
}) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [agreements, setAgreements] =
    useState<AgreementState>(DEFAULT_AGREEMENT_STATE);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(
    initial.consentStatus === ConsentStatus.completed,
  );

  if (completed) {
    return (
      <Card variant="success">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>보호자 동의가 완료되었습니다</CardTitle>
            <MatchonStatusBadge status="signature_completed" label="동의완료" size="sm" />
          </div>
          <CardDescription>
            {scope === "application"
              ? "대회 신청서 작성이 계속 진행됩니다. 체육관에서 최종 제출을 확인해 주세요."
              : "체육관에서 등록 요청을 검토한 뒤 선수 승인 절차가 진행됩니다."}
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const allAgreed = Object.values(agreements).every(Boolean);
    if (!allAgreed) {
      setError("필수 동의 항목을 모두 선택해 주세요.");
      return;
    }
    if (!guardianName.trim() || !guardianPhone.trim() || !relationship.trim()) {
      setError("보호자 정보와 관계를 입력해 주세요.");
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
      const issueRes = await fetch(
        scope === "application"
          ? "/api/uploads/application-guardian-signature"
          : "/api/uploads/consent-signature",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            scope === "application"
              ? {
                  consentId: initial.consentId,
                  documentId: documentId ?? "",
                  mimeType: "image/png",
                }
              : {
                  registrationSubmissionId: registrationSubmissionId ?? "",
                  consentId: initial.consentId,
                  token: token ?? "",
                  mimeType: "image/png",
                },
          ),
        },
      );

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
            : "업로드 준비에 실패했습니다. 링크와 네트워크를 확인해 주세요.";
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
      fd.set("consentId", initial.consentId);
      if (scope === "application") {
        fd.set("scope", "application");
      } else {
        fd.set("registrationSubmissionId", registrationSubmissionId ?? "");
        fd.set("token", token ?? "");
      }
      fd.set("signatureImagePath", issueJson.data.path);
      fd.set("guardianName", guardianName.trim());
      fd.set("guardianPhone", guardianPhone.trim());
      fd.set("relationship", relationship.trim());
      fd.set("privacyAgreed", agreements.privacyAgreed ? "true" : "false");
      fd.set("riskAgreed", agreements.riskAgreed ? "true" : "false");
      fd.set("emergencyAgreed", agreements.emergencyAgreed ? "true" : "false");
      fd.set(
        "resultDisclosureAgreed",
        agreements.resultDisclosureAgreed ? "true" : "false",
      );
      fd.set(
        "photoVideoAgreed",
        agreements.photoVideoAgreed ? "true" : "false",
      );

      const completeRes = await completeGuardianConsentAction(fd);
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
            <CardTitle className="text-base">신청 정보</CardTitle>
            <MatchonStatusBadge status="signature_pending" label="동의대기" size="sm" />
          </div>
          <CardDescription>
            체육관: {initial.gymDisplayLabel} · 선수: {initial.fighterName}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-matchon-text-secondary">
          보호자(등록 시 입력): {initial.guardianNameMasked} · 연락처{" "}
          {initial.guardianPhoneMasked}
        </CardContent>
      </Card>

      <GuardianConsentDocument
        documentTitle={initial.documentTitle}
        documentVersion={initial.documentVersion}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">보호자 정보 확인</CardTitle>
          <CardDescription>등록 시 입력한 정보와 일치하는지 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">보호자 이름 (확인)</span>
            <input
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className={publicApplicationFieldInputClass}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">보호자 휴대폰</span>
            <input
              required
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              className={publicApplicationFieldInputClass}
            />
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">선수와의 관계</span>
            <input
              required
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="예: 부, 모, 조부 등"
              className={publicApplicationFieldInputClass}
            />
          </label>
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
          <CardDescription>보호자 본인 서명을 입력해 주세요.</CardDescription>
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

      <Button type="submit" size="default" disabled={pending} className="w-full">
        {pending ? "제출 중…" : "동의 및 서명 제출"}
      </Button>
    </form>
  );
}
