"use client";

import { useRef, useState, useTransition } from "react";
import type { SignaturePadHandle } from "@/components/shared/SignaturePad";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import { submitPublicAdditionalInfoAction } from "@/features/additional-info/actions";
import type { PublicAdditionalInfoFormDTO } from "@/lib/services/additional-info.service";
import {
  formControlFieldClass,
  formControlLabelClass,
} from "@/lib/ui/form-control-ui";
import { INSURANCE_PII_CONSENT_CHECKBOX_LABEL } from "@/lib/athlete-application/insurance-consent";

export function AdditionalInfoPublicForm({
  initial,
}: {
  initial: PublicAdditionalInfoFormDTO;
}) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initial.alreadyCompleted);

  if (done) {
    return (
      <FeedbackMessage tone="success" role="status">
        추가정보 작성이 완료되었습니다. 이 창을 닫아도 됩니다.
      </FeedbackMessage>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const privacyAgreed = fd.get("privacyAgreed") === "on";
    const insuranceAgreed = fd.get("insuranceAgreed") === "on";
    const address = String(fd.get("participantAddress") ?? "").trim();
    const addressDetail = String(fd.get("participantAddressDetail") ?? "").trim();
    const rrn = String(fd.get("residentRegistrationNumber") ?? "").trim();
    const guardianRelation = String(fd.get("guardianRelation") ?? "").trim();
    const guardianName = String(fd.get("guardianName") ?? "").trim();

    if (!privacyAgreed || !insuranceAgreed) {
      setError("필수 동의에 체크해 주세요.");
      return;
    }
    if (!rrn) {
      setError("주민등록번호를 입력해 주세요.");
      return;
    }
    if (!address) {
      setError("주소를 입력해 주세요.");
      return;
    }
    if (initial.isMinor && !guardianName) {
      setError("보호자 이름을 입력해 주세요.");
      return;
    }
    if (initial.isMinor && !guardianRelation) {
      setError("보호자 관계를 입력해 주세요.");
      return;
    }
    if (padRef.current?.isEmpty()) {
      setError("서명을 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const blob = await padRef.current?.toBlob();
      if (!blob) {
        setError("서명 이미지를 만들 수 없습니다.");
        return;
      }
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const signaturePngBase64 = btoa(binary);

      const res = await submitPublicAdditionalInfoAction(initial.token, {
        residentRegistrationNumber: rrn,
        address,
        addressDetail: addressDetail || null,
        privacyAgreed,
        insuranceAgreed,
        guardianRelation: initial.isMinor ? guardianRelation : null,
        guardianName: initial.isMinor ? guardianName : null,
        signaturePngBase64,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setDone(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-1 rounded-lg border border-matchon-border bg-matchon-surface/40 p-3 text-sm">
        <p className="font-medium text-matchon-text-primary">
          {initial.eventTitle}
        </p>
        <p>
          선수: {initial.fighterName}
          {initial.isMinor && initial.guardianName
            ? ` · 보호자: ${initial.guardianName}`
            : null}
        </p>
        <p className="text-muted-foreground">
          {initial.gymName} · {initial.divisionLabel}
        </p>
      </section>

      <div className="space-y-1.5">
        <label className={formControlLabelClass} htmlFor="rrn">
          주민등록번호 *
        </label>
        <input
          id="rrn"
          name="residentRegistrationNumber"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="900101-1234567"
          className={formControlFieldClass}
        />
      </div>

      <AddressSearchField
        label="주소 *"
        required
        addressName="participantAddress"
        detailName="participantAddressDetail"
        inputClassName={formControlFieldClass}
      />

      {initial.isMinor ? (
        <>
          <div className="space-y-1.5">
            <label className={formControlLabelClass} htmlFor="guardianName">
              보호자 이름 *
            </label>
            <input
              id="guardianName"
              name="guardianName"
              required
              defaultValue={initial.guardianName ?? ""}
              placeholder="보호자 성명"
              className={formControlFieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={formControlLabelClass} htmlFor="guardianRelation">
              보호자 관계 *
            </label>
            <input
              id="guardianRelation"
              name="guardianRelation"
              required
              placeholder="예: 부, 모"
              className={formControlFieldClass}
            />
          </div>
        </>
      ) : null}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="privacyAgreed"
          className="mt-1"
        />
        <span>{initial.privacyConsentCheckboxLabel}</span>
      </label>
      <details className="text-muted-foreground text-xs whitespace-pre-line">
        <summary className="cursor-pointer text-matchon-text-primary">
          {initial.privacyConsentTitle}
        </summary>
        {initial.privacyConsentText}
      </details>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="insuranceAgreed"
          className="mt-1"
        />
        <span>
          {initial.insuranceConsentCheckboxLabel ||
            INSURANCE_PII_CONSENT_CHECKBOX_LABEL}
        </span>
      </label>
      <details className="text-muted-foreground text-xs whitespace-pre-line">
        <summary className="cursor-pointer text-matchon-text-primary">
          {initial.insuranceConsentTitle}
        </summary>
        {initial.insuranceConsentText}
      </details>

      <div className="space-y-2">
        <p className={formControlLabelClass}>서명 *</p>
        <SignaturePad ref={padRef} />
      </div>

      {error ? (
        <FeedbackMessage tone="error" role="alert">
          {error}
        </FeedbackMessage>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "제출 중…" : "추가정보 제출"}
      </Button>
    </form>
  );
}
