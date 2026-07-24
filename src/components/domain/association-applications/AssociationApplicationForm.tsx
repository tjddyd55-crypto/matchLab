"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { submitAssociationApplicationAction } from "@/features/association-applications/actions";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { Button } from "@/components/ui/button";
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

const ATTACHMENT_SLOTS: {
  type: AssociationApplicationAttachmentType;
  label: string;
  required?: boolean;
}[] = [
  { type: AssociationApplicationAttachmentType.logo, label: "협회 로고", required: true },
  {
    type: AssociationApplicationAttachmentType.business_registration,
    label: "고유번호증 / 사업자등록증",
    required: true,
  },
  {
    type: AssociationApplicationAttachmentType.establishment_proof,
    label: "설립·등록 증빙",
  },
  { type: AssociationApplicationAttachmentType.other, label: "기타 서류" },
];

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
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className={authLoginInputClass}
      />
    </div>
  );
}

export function AssociationApplicationForm() {
  const uploadBatchId = useMemo(() => crypto.randomUUID(), []);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    submitAssociationApplicationAction,
    null as State,
  );

  async function uploadFile(
    file: File,
    attachmentType: AssociationApplicationAttachmentType,
  ) {
    setUploadError(null);
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
      throw new Error(issueJson.error?.message || "업로드 URL 발급 실패");
    }
    const put = await fetch(issueJson.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("파일 업로드 실패");
    setAttachments((prev) => [
      ...prev.filter((a) => a.attachmentType !== attachmentType),
      {
        attachmentType,
        storagePath: issueJson.data.path,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    ]);
  }

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-base font-semibold text-matchon-text-primary">
          협회 가입 신청이 접수되었습니다.
        </p>
        <p className={authLoginSecondaryNoteClass}>
          슈퍼어드민 검토 후 담당자 이메일로 계정 초대가 진행됩니다.
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
      action={(fd) => {
        fd.set("attachmentsJson", JSON.stringify(attachments));
        formAction(fd);
      }}
      className={authLoginFormClass}
      aria-busy={pending}
    >
      <Field id="associationName" name="associationName" label="협회명" required />
      <Field id="associationNameEn" name="associationNameEn" label="영문명 / 약칭" />
      <Field id="representativeName" name="representativeName" label="대표자명" required />
      <Field id="contactName" name="contactName" label="담당자명" required />
      <Field id="contactPhone" name="contactPhone" label="담당자 연락처" required />
      <Field id="contactEmail" name="contactEmail" label="담당자 이메일" type="email" required />
      <AddressSearchField
        label="주소"
        addressName="address"
        detailName="addressDetail"
        postalName="postalCode"
        inputClassName={authLoginInputClass}
      />
      <Field id="website" name="website" label="홈페이지 / SNS" />
      <div className={authLoginFieldStackClass}>
        <label htmlFor="description" className={authLoginLabelClass}>
          협회 소개
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className={`${authLoginInputClass} min-h-[6rem] py-2`}
        />
      </div>

      <div className="space-y-3 border-t border-matchon-border pt-4">
        <p className={authLoginLabelClass}>첨부 서류</p>
        <p className={authLoginSecondaryNoteClass}>
          JPEG/PNG/WebP/PDF · private 저장소만 사용합니다.
        </p>
        {ATTACHMENT_SLOTS.map((slot) => {
          const attached = attachments.find((a) => a.attachmentType === slot.type);
          return (
            <label key={slot.type} className="flex flex-col gap-1 text-sm">
              <span className={authLoginLabelClass}>
                {slot.label}
                {slot.required ? " *" : ""}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required={slot.required && !attached}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadFile(file, slot.type).catch((err: unknown) => {
                    setUploadError(
                      err instanceof Error ? err.message : "업로드에 실패했습니다.",
                    );
                  });
                }}
              />
              {attached ? (
                <span className="text-xs text-matchon-text-secondary">
                  첨부됨: {attached.originalFileName}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
        <input type="checkbox" name="termsAccepted" className="mt-1" required />
        이용약관에 동의합니다.
      </label>
      <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
        <input type="checkbox" name="privacyAccepted" className="mt-1" required />
        개인정보 처리에 동의합니다.
      </label>
      {uploadError ? (
        <p className={authLoginErrorClass} role="alert">
          {uploadError}
        </p>
      ) : null}
      {state?.ok === false ? (
        <p className={authLoginErrorClass} role="alert" aria-live="assertive">
          {state.error.message}
        </p>
      ) : null}
      <Button type="submit" size="field" className="w-full font-bold" disabled={pending}>
        {pending ? "제출 중…" : "가입 신청 제출"}
      </Button>
    </form>
  );
}
