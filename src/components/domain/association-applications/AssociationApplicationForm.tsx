"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import {
  DocumentUploadField,
  type DocumentUploadStatus,
} from "@/components/shared/DocumentUploadField";
import { PhoneVerificationPanel } from "@/components/domain/phone-verification/PhoneVerificationPanel";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { Button } from "@/components/ui/button";
import { submitAssociationApplicationAction } from "@/features/association-applications/actions";
import { RequestedLoginIdField } from "@/components/domain/auth/RequestedLoginIdField";
import { AssociationApplicationAttachmentType } from "@/lib/enums";
import {
  authLoginErrorClass,
  authLoginFieldStackClass,
  authLoginFormClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";

type State = Awaited<ReturnType<typeof submitAssociationApplicationAction>> | null;
type PendingAttachment = {
  attachmentType: AssociationApplicationAttachmentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf"]);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

const ATTACHMENT_SLOTS = [
  {
    type: AssociationApplicationAttachmentType.logo,
    label: "협회 로고",
    description: "프로필에 표시할 로고가 있다면 첨부해 주세요.",
    required: false,
    accept: "image/jpeg,image/png,image/webp",
    acceptHint: "JPEG, PNG, WebP",
    maxSizeHint: "최대 10MB",
  },
  {
    type: AssociationApplicationAttachmentType.business_registration,
    label: "사업자등록증",
    description: "사업자등록증은 필수 첨부입니다.",
    required: true,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    acceptHint: "JPEG, PNG, WebP, PDF",
    maxSizeHint: "이미지 최대 10MB · PDF 최대 20MB",
  },
  {
    type: AssociationApplicationAttachmentType.establishment_proof,
    label: "설립·등록 증빙",
    description: "설립 또는 등록을 확인할 수 있는 서류를 첨부할 수 있습니다.",
    required: false,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    acceptHint: "JPEG, PNG, WebP, PDF",
    maxSizeHint: "이미지 최대 10MB · PDF 최대 20MB",
  },
  {
    type: AssociationApplicationAttachmentType.other,
    label: "기타 서류",
    description: "검토에 참고할 추가 서류가 있다면 첨부해 주세요.",
    required: false,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    acceptHint: "JPEG, PNG, WebP, PDF",
    maxSizeHint: "이미지 최대 10MB · PDF 최대 20MB",
  },
] as const;

function Field({
  id,
  name,
  label,
  required,
  type = "text",
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className={authLoginFieldStackClass}>
      <label htmlFor={id} className={authLoginLabelClass}>
        {label}
      </label>
      <input id={id} name={name} type={type} required={required} className={authLoginInputClass} />
    </div>
  );
}

function validateAttachment(
  attachmentType: AssociationApplicationAttachmentType,
  file: File,
): string | null {
  const allowedMimeTypes =
    attachmentType === AssociationApplicationAttachmentType.logo
      ? IMAGE_MIME_TYPES
      : DOCUMENT_MIME_TYPES;
  if (!allowedMimeTypes.has(file.type)) {
    return attachmentType === AssociationApplicationAttachmentType.logo
      ? "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 파일을 선택해 주세요."
      : "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP, PDF 파일을 선택해 주세요.";
  }
  const maxBytes = IMAGE_MIME_TYPES.has(file.type)
    ? IMAGE_MAX_BYTES
    : DOCUMENT_MAX_BYTES;
  if (file.size > maxBytes) {
    return `파일 용량이 너무 큽니다. 최대 ${maxBytes / (1024 * 1024)}MB 이하의 파일을 선택해 주세요.`;
  }
  return null;
}

export function AssociationApplicationForm({
  phoneVerificationEnabled = true,
}: {
  phoneVerificationEnabled?: boolean;
}) {
  const uploadBatchId = useMemo(() => crypto.randomUUID(), []);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<
    Partial<Record<AssociationApplicationAttachmentType, DocumentUploadStatus>>
  >({});
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<AssociationApplicationAttachmentType, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [signupVerificationToken, setSignupVerificationToken] = useState<
    string | null
  >(null);
  const [state, formAction, pending] = useActionState(
    submitAssociationApplicationAction,
    null as State,
  );
  const isUploading = Object.values(uploadStatuses).includes("uploading");

  function setUploadError(attachmentType: AssociationApplicationAttachmentType, error?: string) {
    setUploadErrors((current) => ({
      ...current,
      [attachmentType]: error,
    }));
  }

  async function uploadFile(file: File, attachmentType: AssociationApplicationAttachmentType) {
    const validationError = validateAttachment(attachmentType, file);
    if (validationError) {
      setUploadError(attachmentType, validationError);
      setUploadStatuses((current) => ({ ...current, [attachmentType]: "error" }));
      return;
    }

    setUploadError(attachmentType);
    setUploadStatuses((current) => ({ ...current, [attachmentType]: "uploading" }));
    try {
      const issueRes = await fetch("/api/uploads/association-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadBatchId,
          attachmentType,
          mimeType: file.type,
          sizeBytes: file.size,
          originalFileName: file.name,
        }),
      });
      const issueJson = await issueRes.json();
      if (!issueRes.ok || !issueJson.data?.uploadUrl) {
        throw new Error(issueJson.error?.message || "업로드 URL 발급에 실패했습니다.");
      }
      const uploadRes = await fetch(issueJson.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("파일 업로드에 실패했습니다.");
      setAttachments((current) => [
        ...current.filter((item) => item.attachmentType !== attachmentType),
        {
          attachmentType,
          storagePath: issueJson.data.path,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      ]);
      setUploadStatuses((current) => ({ ...current, [attachmentType]: "uploaded" }));
    } catch (error) {
      setUploadError(
        attachmentType,
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
      );
      setUploadStatuses((current) => ({ ...current, [attachmentType]: "error" }));
    }
  }

  function removeAttachment(attachmentType: AssociationApplicationAttachmentType) {
    setAttachments((current) => current.filter((item) => item.attachmentType !== attachmentType));
    setUploadError(attachmentType);
    setUploadStatuses((current) => ({ ...current, [attachmentType]: "idle" }));
  }

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-base font-semibold text-matchon-text-primary">
          가입 신청이 완료되었습니다.
        </p>
        <p className={authLoginSecondaryNoteClass}>
          관리자 확인 후 결과를 안내해 드립니다.
        </p>
        <Link
          href="/login"
          className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
        >
          로그인으로 이동
        </Link>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        const hasBusinessRegistration = attachments.some(
          (item) => item.attachmentType === AssociationApplicationAttachmentType.business_registration,
        );
        if (isUploading) {
          setSubmitError("파일 업로드가 완료된 후 제출해 주세요.");
          return;
        }
        if (!hasBusinessRegistration) {
          setSubmitError("사업자등록증을 첨부해 주세요.");
          return;
        }
        if (phoneVerificationEnabled && !signupVerificationToken) {
          setSubmitError("휴대폰 인증을 완료한 후 제출해 주세요.");
          return;
        }
        setSubmitError(null);
        formData.set("attachmentsJson", JSON.stringify(attachments));
        if (phoneVerificationEnabled) {
          formData.set("contactPhone", contactPhone);
          formData.set("signupVerificationToken", signupVerificationToken ?? "");
        }
        formAction(formData);
      }}
      className={authLoginFormClass}
      aria-busy={pending || isUploading}
    >
      <Field id="associationName" name="associationName" label="협회명" required />
      <Field id="associationNameEn" name="associationNameEn" label="영문명 / 약칭" />
      <Field id="representativeName" name="representativeName" label="대표자명" required />
      <Field id="contactName" name="contactName" label="담당자명" required />
      {phoneVerificationEnabled ? (
        <>
          <PhoneVerificationPanel
            accountType="association"
            phone={contactPhone}
            onPhoneChange={setContactPhone}
            verificationToken={signupVerificationToken}
            onVerified={setSignupVerificationToken}
            onReset={() => setSignupVerificationToken(null)}
            disabled={pending || isUploading}
          />
          <input type="hidden" name="contactPhone" value={contactPhone} />
          <input
            type="hidden"
            name="signupVerificationToken"
            value={signupVerificationToken ?? ""}
          />
        </>
      ) : (
        <div className="space-y-2">
          <PhoneInput name="contactPhone" label="담당자 연락처" required />
          <p className={authLoginSecondaryNoteClass} role="status">
            휴대폰 본인인증은 준비 중입니다. 현재는 기존 방식으로 가입 신청할 수
            있습니다.
          </p>
        </div>
      )}
      <Field id="contactEmail" name="contactEmail" label="담당자 이메일" type="email" required />
      <RequestedLoginIdField disabled={pending || isUploading} />
      <AddressSearchField
        label="주소"
        postalName="postalCode"
        addressName="address"
        detailName="addressDetail"
        inputClassName={authLoginInputClass}
      />
      <Field id="website" name="website" label="홈페이지 / SNS" />
      <div className={authLoginFieldStackClass}>
        <label htmlFor="description" className={authLoginLabelClass}>협회 소개</label>
        <textarea id="description" name="description" rows={4} className={`${authLoginInputClass} min-h-[6rem] py-2`} />
      </div>

      <div className="space-y-3 border-t border-matchon-border pt-4">
        <p className={authLoginLabelClass}>첨부 서류</p>
        <p className={authLoginSecondaryNoteClass}>첨부한 서류는 가입 신청 검토에만 사용됩니다.</p>
        {ATTACHMENT_SLOTS.map((slot) => {
          const attachment = attachments.find((item) => item.attachmentType === slot.type);
          return (
            <DocumentUploadField
              key={slot.type}
              label={slot.label}
              description={slot.description}
              required={slot.required}
              accept={slot.accept}
              acceptHint={slot.acceptHint}
              maxSizeHint={slot.maxSizeHint}
              value={attachment ? {
                fileName: attachment.originalFileName,
                sizeBytes: attachment.sizeBytes,
                mimeType: attachment.mimeType,
              } : null}
              status={uploadStatuses[slot.type] ?? "idle"}
              error={uploadErrors[slot.type]}
              disabled={pending}
              onSelect={(file) => void uploadFile(file, slot.type)}
              onRemove={() => removeAttachment(slot.type)}
            />
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-matchon-text-secondary">
        <input type="checkbox" name="termsAccepted" required />
        이용약관에 동의합니다. <span className="font-medium text-matchon-text-primary">(필수)</span>
      </label>
      <label className="flex items-center gap-2 text-sm text-matchon-text-secondary">
        <input type="checkbox" name="privacyAccepted" required />
        개인정보 처리에 동의합니다. <span className="font-medium text-matchon-text-primary">(필수)</span>
      </label>
      {submitError ? <p className={authLoginErrorClass} role="alert">{submitError}</p> : null}
      {state?.ok === false ? (
        <p className={authLoginErrorClass} role="alert" aria-live="assertive">{state.error.message}</p>
      ) : null}
      <Button
        type="submit"
        size="default"
        className="w-full font-bold"
        disabled={
          pending ||
          isUploading ||
          (phoneVerificationEnabled && !signupVerificationToken)
        }
      >
        {pending ? "제출 중…" : isUploading ? "파일 업로드 중…" : "가입 신청 제출"}
      </Button>
    </form>
  );
}
