"use client";

import { useMemo, useState, useTransition } from "react";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { BusinessNoInput, PhoneInput } from "@/components/shared/PhoneInput";
import {
  MemberGymSignatureField,
  dataUrlToFile,
} from "@/components/domain/member-gyms/MemberGymSignatureField";
import { submitMemberGymJoinApplicationAction } from "@/features/member-gyms/actions";
import { AssociationMemberGymApplicationAttachmentType } from "@/lib/enums";
import { MEMBER_GYM_APPLICATION_ATTACHMENT_SLOTS } from "@/lib/member-gym/application-form";
import { MEMBER_GYM_ATTACHMENT_TYPE_LABEL } from "@/lib/ui-labels/member-gym";
import type { MemberGymSettingsV1 } from "@/lib/member-gym/settings";

type GuideFile = {
  id: string;
  kind: string;
  originalFileName: string;
};

type PendingAttachment = {
  attachmentType: AssociationMemberGymApplicationAttachmentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export function MemberGymRegistrationForm({
  token,
  organizerName,
  guideMessage,
  settings,
  guideFiles,
}: {
  token: string;
  organizerName: string;
  guideMessage: string;
  settings: MemberGymSettingsV1;
  guideFiles: GuideFile[];
}) {
  const uploadBatchId = useMemo(() => crypto.randomUUID(), []);
  const [pending, start] = useTransition();
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(
    file: File,
    attachmentType: AssociationMemberGymApplicationAttachmentType,
  ): Promise<PendingAttachment> {
    const issueRes = await fetch("/api/uploads/member-gym-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        uploadBatchId,
        attachmentType,
        mimeType: file.type,
        sizeBytes: file.size,
        originalFileName: file.name,
      }),
    });
    const issueJson = await issueRes.json();
    if (!issueRes.ok || !issueJson.data?.uploadUrl) {
      throw new Error(issueJson.error?.message || "업로드 URL 발급 실패");
    }
    const put = await fetch(issueJson.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("파일 업로드 실패");
    const meta: PendingAttachment = {
      attachmentType,
      storagePath: issueJson.data.path,
      originalFileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
    setAttachments((prev) => [
      ...prev.filter((a) => a.attachmentType !== attachmentType),
      meta,
    ]);
    return meta;
  }

  if (done) {
    return (
      <div className="rounded-md border border-matchon-border bg-white p-6 text-sm">
        <h2 className="text-lg font-bold">접수 완료</h2>
        <p className="mt-2 text-matchon-text-secondary">{done}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          try {
            if (!signatureDataUrl) {
              setError("손서명을 완료해 주세요.");
              return;
            }

            let nextAttachments = [...attachments];
            const existingSig = nextAttachments.find(
              (a) => a.attachmentType === "applicant_signature",
            );
            if (!existingSig) {
              const file = dataUrlToFile(
                signatureDataUrl,
                "applicant-signature.png",
              );
              const meta = await uploadFile(file, "applicant_signature");
              nextAttachments = [
                ...nextAttachments.filter(
                  (a) => a.attachmentType !== "applicant_signature",
                ),
                meta,
              ];
            }

            const homeBase = String(fd.get("homeAddress") || "").trim();
            const homeDetail = String(fd.get("homeAddressDetail") || "").trim();
            const homeAddress = [homeBase, homeDetail]
              .filter(Boolean)
              .join(" ");

            const payload = {
              token,
              gymName: String(fd.get("gymName") || ""),
              ownerName: String(fd.get("ownerName") || ""),
              ownerNameEn: String(fd.get("ownerNameEn") || "") || undefined,
              birthDate: String(fd.get("birthDate") || "") || undefined,
              gender: String(fd.get("gender") || "") || undefined,
              phone: String(fd.get("phone") || ""),
              gymPhone: String(fd.get("gymPhone") || "") || undefined,
              email: String(fd.get("email") || ""),
              homeAddress: homeAddress || undefined,
              gymAddress: String(fd.get("gymAddress") || ""),
              gymAddressDetail:
                String(fd.get("gymAddressDetail") || "") || undefined,
              businessNo: String(fd.get("businessNo") || "") || undefined,
              sportType: String(fd.get("sportType") || "") || undefined,
              qualifications:
                String(fd.get("qualifications") || "") || undefined,
              careerSummary: String(fd.get("careerSummary") || "") || undefined,
              memo: String(fd.get("memo") || "") || undefined,
              privacyConsent: fd.get("privacyConsent") === "on",
              registrationConsent: fd.get("registrationConsent") === "on",
              smsConsent: fd.get("smsConsent") === "on",
              informationConsent: fd.get("informationConsent") === "on",
              signatureName: String(fd.get("signatureName") || ""),
              signatureConsent: fd.get("signatureConsent") === "on",
              uploadBatchId,
              attachmentsJson: JSON.stringify(nextAttachments),
            };
            const res = await submitMemberGymJoinApplicationAction(payload);
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            setDone(res.data.message);
          } catch (err) {
            setError(err instanceof Error ? err.message : "제출 실패");
          }
        });
      }}
    >
      <section className="rounded-md border border-matchon-border bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-matchon-primary">
          {organizerName}
        </p>
        <p className="mt-2 text-sm text-matchon-text-secondary">{guideMessage}</p>
        {guideFiles.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {guideFiles.map((f) => (
              <li key={f.id}>
                <a
                  className="text-matchon-primary underline"
                  href={`/api/member-gym/link-attachments/${f.id}/download?token=${encodeURIComponent(token)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {f.originalFileName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">1. 회원사·체육관 정보</h2>
        <Field name="gymName" label="체육관명" required />
        <AddressSearchField
          label="체육관 주소"
          required
          addressName="gymAddress"
          detailName="gymAddressDetail"
        />
        <PhoneInput name="gymPhone" label="체육관 연락처" />
        <BusinessNoInput name="businessNo" label="사업자등록번호" />
        <Field name="sportType" label="종목" />
      </section>

      <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">2. 대표자 정보</h2>
        <label className="block text-xs">
          관장 성명 *
          <input
            name="ownerName"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
        </label>
        <Field name="ownerNameEn" label="성명 영문" />
        <Field name="birthDate" label="생년월일" type="date" />
        <Field name="gender" label="성별" />
        <PhoneInput name="phone" label="개인 연락처" required />
        <Field name="email" label="이메일" type="email" required />
        <AddressSearchField
          label="집 주소"
          addressName="homeAddress"
          detailName="homeAddressDetail"
        />
      </section>

      <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">3. 자격·경력</h2>
        <label className="block text-xs">
          보유단증 및 자격증
          <textarea
            name="qualifications"
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          경력
          <textarea
            name="careerSummary"
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          비고
          <textarea
            name="memo"
            rows={2}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">4. 첨부 서류</h2>
        <p className="text-xs text-matchon-text-secondary">
          JPEG/PNG/WebP/PDF · 이미지는 10MB, PDF는 20MB까지. private storage에만
          저장됩니다.
          {settings.form.requireRepresentativePhoto ? " 증명사진 필수." : ""}
          {settings.form.requireBusinessRegistration
            ? " 사업자등록증 필수."
            : ""}
        </p>
        {MEMBER_GYM_APPLICATION_ATTACHMENT_SLOTS.map((type) => (
          <label key={type} className="block text-xs">
            {MEMBER_GYM_ATTACHMENT_TYPE_LABEL[type]}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="mt-1 block w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                start(async () => {
                  try {
                    await uploadFile(file, type);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "업로드 실패",
                    );
                  }
                });
              }}
            />
          </label>
        ))}
        <ul className="text-xs text-matchon-text-secondary">
          {attachments
            .filter((a) => a.attachmentType !== "applicant_signature")
            .map((a) => (
              <li key={a.storagePath}>
                {MEMBER_GYM_ATTACHMENT_TYPE_LABEL[a.attachmentType]} ·{" "}
                {a.originalFileName}
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-md border border-matchon-border bg-white p-4 text-sm">
        <h2 className="text-sm font-bold">5. 신청인 및 서약인</h2>
        <label className="flex items-start gap-2">
          <input name="privacyConsent" type="checkbox" required />
          개인정보 수집·이용에 동의합니다. (필수)
        </label>
        <label className="flex items-start gap-2">
          <input name="registrationConsent" type="checkbox" required />
          사실 확인 및 회원자격 신청에 동의합니다. (필수)
        </label>
        <label className="flex items-start gap-2">
          <input name="smsConsent" type="checkbox" />
          SMS 수신에 동의합니다.
        </label>
        <label className="flex items-start gap-2">
          <input name="informationConsent" type="checkbox" />
          자료·정보 수신에 동의합니다.
        </label>
        <label className="block text-xs">
          신청인 성명 *
          <input
            name="signatureName"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
        </label>
        <div>
          <p className="mb-1 text-xs font-medium">손서명 *</p>
          <MemberGymSignatureField onChange={setSignatureDataUrl} />
        </div>
        <label className="flex items-start gap-2">
          <input name="signatureConsent" type="checkbox" required />
          위 내용이 사실임을 확인하고 전자 신청합니다. (필수)
        </label>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-matchon-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "제출 중…" : "가입 신청 제출"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
}) {
  if (type === "date") {
    return (
      <div className="block space-y-1.5 text-sm">
        <span className="font-semibold">
          {label}
          {required ? " *" : ""}
        </span>
        <AppDateInput
          name={name}
          required={required}
          defaultValue={defaultValue}
          disallowFuture={name === "birthDate"}
          aria-label={label}
        />
      </div>
    );
  }
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-semibold">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 h-11 w-full rounded-lg border border-matchon-border bg-white px-3 text-base shadow-sm"
      />
    </label>
  );
}
