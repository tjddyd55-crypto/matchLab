"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  MemberGymSignatureField,
  dataUrlToFile,
} from "@/components/domain/member-gyms/MemberGymSignatureField";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import {
  DocumentUploadField,
  type DocumentUploadStatus,
} from "@/components/shared/DocumentUploadField";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { PhoneVerificationPanel } from "@/components/domain/phone-verification/PhoneVerificationPanel";
import { BusinessNoInput, PhoneInput } from "@/components/shared/PhoneInput";
import { Button } from "@/components/ui/button";
import { submitGymApplicationAction } from "@/features/gym-applications/actions";
import { RequestedLoginIdField } from "@/components/domain/auth/RequestedLoginIdField";
import { submitMemberGymJoinApplicationAction } from "@/features/member-gyms/actions";
import {
  GYM_JOIN_ATTACHMENT_HINT,
  GYM_JOIN_DOCUMENT_SLOTS,
  GYM_JOIN_IMAGE_ONLY_ATTACHMENT_TYPES,
} from "@/lib/gym-join/application-form";
import type { MemberGymSettingsV1 } from "@/lib/member-gym/settings";
import {
  authLoginErrorClass,
  authLoginFieldStackClass,
  authLoginFormClass,
  authLoginInputClass,
  authLoginLabelClass,
  authLoginSecondaryNoteClass,
} from "@/lib/ui/auth-login-ui";

type PendingAttachment = {
  attachmentType: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

type GuideFile = {
  id: string;
  kind: string;
  originalFileName: string;
};

type IndependentState =
  | Awaited<ReturnType<typeof submitGymApplicationAction>>
  | null;

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_MIME = new Set([...IMAGE_MIME, "application/pdf"]);
const IMAGE_MAX = 10 * 1024 * 1024;
const DOCUMENT_MAX = 20 * 1024 * 1024;

function validateFile(attachmentType: string, file: File): string | null {
  const imageOnly = GYM_JOIN_IMAGE_ONLY_ATTACHMENT_TYPES.has(attachmentType);
  const allowed = imageOnly ? IMAGE_MIME : DOCUMENT_MIME;
  if (!allowed.has(file.type)) {
    return imageOnly
      ? "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP 파일을 선택해 주세요."
      : "지원하지 않는 파일 형식입니다. JPEG, PNG, WebP, PDF 파일을 선택해 주세요.";
  }
  const max = IMAGE_MIME.has(file.type) ? IMAGE_MAX : DOCUMENT_MAX;
  if (file.size > max) {
    return `파일 용량이 너무 큽니다. 최대 ${max / (1024 * 1024)}MB 이하의 파일을 선택해 주세요.`;
  }
  return null;
}

function TextField({
  name,
  label,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  if (type === "date") {
    return (
      <div className={authLoginFieldStackClass}>
        <span className={authLoginLabelClass}>
          {label}
          {required ? " *" : ""}
        </span>
        <AppDateInput
          name={name}
          required={required}
          disallowFuture={name === "birthDate"}
          aria-label={label}
        />
      </div>
    );
  }
  return (
    <div className={authLoginFieldStackClass}>
      <label htmlFor={name} className={authLoginLabelClass}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className={authLoginInputClass}
      />
    </div>
  );
}

/**
 * 체육관 가입 신청서 SSOT.
 * - independent: /join/gym → GymApplication
 * - association_invite: /member-gym-register/[token] → AssociationMemberGymApplication
 */
export function GymJoinApplicationForm({
  mode,
  associationInvite,
  phoneVerificationEnabled = true,
}: {
  mode: "independent" | "association_invite";
  associationInvite?: {
    token: string;
    organizerName: string;
    guideMessage: string;
    settings: MemberGymSettingsV1;
    guideFiles: GuideFile[];
  };
  /** 독립 체육관 가입 OTP. Production 미개통 시 false */
  phoneVerificationEnabled?: boolean;
}) {
  const uploadBatchId = useMemo(() => crypto.randomUUID(), []);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<
    Record<string, DocumentUploadStatus>
  >({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [ownerName, setOwnerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviteDone, setInviteDone] = useState<string | null>(null);
  const [mobilePhone, setMobilePhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [signupVerificationToken, setSignupVerificationToken] = useState<
    string | null
  >(null);
  const [invitePending, startInvite] = useTransition();
  const [independentState, independentAction, independentPending] =
    useActionState(submitGymApplicationAction, null as IndependentState);

  const passwordsMismatch =
    mode === "independent" &&
    passwordConfirm.length > 0 &&
    password !== passwordConfirm;

  const settings = associationInvite?.settings;
  const requirePhoto = Boolean(settings?.form.requireRepresentativePhoto);
  const requireBusiness = Boolean(settings?.form.requireBusinessRegistration);
  const isUploading = Object.values(uploadStatuses).includes("uploading");
  const pending = independentPending || invitePending;

  const slots = GYM_JOIN_DOCUMENT_SLOTS.map((slot) => {
    if (slot.type === "representative_photo" && requirePhoto) {
      return { ...slot, required: true };
    }
    if (slot.type === "business_registration" && requireBusiness) {
      return { ...slot, required: true };
    }
    return slot;
  });

  async function uploadFile(file: File, attachmentType: string) {
    const validationError = validateFile(attachmentType, file);
    if (validationError) {
      setUploadErrors((c) => ({ ...c, [attachmentType]: validationError }));
      setUploadStatuses((c) => ({ ...c, [attachmentType]: "error" }));
      return;
    }
    setUploadErrors((c) => {
      const next = { ...c };
      delete next[attachmentType];
      return next;
    });
    setUploadStatuses((c) => ({ ...c, [attachmentType]: "uploading" }));
    try {
      const endpoint =
        mode === "independent"
          ? "/api/uploads/gym-application"
          : "/api/uploads/member-gym-application";
      const body =
        mode === "independent"
          ? {
              uploadBatchId,
              attachmentType,
              mimeType: file.type,
              sizeBytes: file.size,
              originalFileName: file.name,
            }
          : {
              token: associationInvite!.token,
              uploadBatchId,
              attachmentType,
              mimeType: file.type,
              sizeBytes: file.size,
              originalFileName: file.name,
            };
      const issueRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const issueJson = await issueRes.json();
      if (!issueRes.ok || !issueJson.data?.uploadUrl) {
        throw new Error(
          issueJson.error?.message || "업로드 URL 발급에 실패했습니다.",
        );
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
      setUploadStatuses((c) => ({ ...c, [attachmentType]: "uploaded" }));
    } catch (error) {
      setUploadErrors((c) => ({
        ...c,
        [attachmentType]:
          error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
      }));
      setUploadStatuses((c) => ({ ...c, [attachmentType]: "error" }));
    }
  }

  function removeAttachment(attachmentType: string) {
    setAttachments((current) =>
      current.filter((item) => item.attachmentType !== attachmentType),
    );
    setUploadErrors((c) => {
      const next = { ...c };
      delete next[attachmentType];
      return next;
    });
    setUploadStatuses((c) => ({ ...c, [attachmentType]: "idle" }));
  }

  async function ensureSignatureAttachment(): Promise<PendingAttachment[]> {
    let next = [...attachments];
    if (!next.some((a) => a.attachmentType === "applicant_signature")) {
      if (!signatureDataUrl) {
        throw new Error("손서명을 완료해 주세요.");
      }
      const file = dataUrlToFile(signatureDataUrl, "applicant-signature.png");
      const endpoint =
        mode === "independent"
          ? "/api/uploads/gym-application"
          : "/api/uploads/member-gym-application";
      const body =
        mode === "independent"
          ? {
              uploadBatchId,
              attachmentType: "applicant_signature",
              mimeType: file.type,
              sizeBytes: file.size,
              originalFileName: file.name,
            }
          : {
              token: associationInvite!.token,
              uploadBatchId,
              attachmentType: "applicant_signature",
              mimeType: file.type,
              sizeBytes: file.size,
              originalFileName: file.name,
            };
      const issueRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const issueJson = await issueRes.json();
      if (!issueRes.ok || !issueJson.data?.uploadUrl) {
        throw new Error(
          issueJson.error?.message || "서명 업로드 URL 발급에 실패했습니다.",
        );
      }
      const uploadRes = await fetch(issueJson.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("서명 업로드에 실패했습니다.");
      next = [
        ...next.filter((a) => a.attachmentType !== "applicant_signature"),
        {
          attachmentType: "applicant_signature",
          storagePath: issueJson.data.path,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      ];
      setAttachments(next);
    }
    return next;
  }

  if (independentState?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-base font-semibold text-matchon-text-primary">
          가입 신청이 완료되었습니다.
        </p>
        <p className={authLoginSecondaryNoteClass}>
          관리자 승인 후 신청한 계정으로 로그인할 수 있습니다. 승인 전까지
          체육관 관리 기능은 사용할 수 없습니다.
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

  if (inviteDone) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-base font-semibold text-matchon-text-primary">
          가입 신청이 완료되었습니다.
        </p>
        <p className={authLoginSecondaryNoteClass}>
          관리자 확인 후 결과를 안내해 드립니다.
        </p>
        {associationInvite?.organizerName ? (
          <p className={authLoginSecondaryNoteClass}>
            승인 후 {associationInvite.organizerName}와 연결됩니다.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className={authLoginFormClass}
      aria-busy={pending || isUploading}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startInvite(async () => {
          setSubmitError(null);
          try {
            if (isUploading) {
              setSubmitError("파일 업로드가 완료된 후 제출해 주세요.");
              return;
            }
            if (requirePhoto) {
              const has = attachments.some(
                (a) => a.attachmentType === "representative_photo",
              );
              if (!has) {
                setSubmitError("증명사진을 첨부해 주세요.");
                return;
              }
            }
            if (requireBusiness) {
              const has = attachments.some(
                (a) => a.attachmentType === "business_registration",
              );
              if (!has) {
                setSubmitError("사업자등록증을 첨부해 주세요.");
                return;
              }
            }
            if (!signatureDataUrl) {
              setSubmitError("손서명을 완료해 주세요.");
              return;
            }
            if (
              mode === "independent" &&
              phoneVerificationEnabled &&
              !signupVerificationToken
            ) {
              setSubmitError("휴대폰 인증을 완료한 후 제출해 주세요.");
              return;
            }
            const nextAttachments = await ensureSignatureAttachment();

            if (mode === "independent") {
              const pw = String(fd.get("password") || "");
              const pwConfirm = String(fd.get("passwordConfirm") || "");
              if (pw !== pwConfirm) {
                setSubmitError("비밀번호가 일치하지 않습니다.");
                return;
              }
              fd.set("uploadBatchId", uploadBatchId);
              fd.set("attachmentsJson", JSON.stringify(nextAttachments));
              if (phoneVerificationEnabled) {
                fd.set("mobilePhone", mobilePhone);
                fd.set(
                  "signupVerificationToken",
                  signupVerificationToken ?? "",
                );
              }
              if (!fd.get("contactName")) {
                fd.set(
                  "contactName",
                  String(fd.get("representativeName") || ""),
                );
              }
              independentAction(fd);
              return;
            }

            const homeBase = String(fd.get("homeAddress") || "").trim();
            const homeDetail = String(fd.get("homeAddressDetail") || "").trim();
            const homeAddress = [homeBase, homeDetail]
              .filter(Boolean)
              .join(" ");

            const res = await submitMemberGymJoinApplicationAction({
              token: associationInvite!.token,
              gymName: String(fd.get("gymName") || ""),
              ownerName: String(fd.get("ownerName") || ""),
              ownerNameEn: String(fd.get("ownerNameEn") || "") || undefined,
              birthDate: String(fd.get("birthDate") || "") || undefined,
              gender: String(fd.get("gender") || "") || undefined,
              phone: String(fd.get("mobilePhone") || fd.get("phone") || ""),
              gymPhone: String(fd.get("gymPhone") || "") || undefined,
              email: String(fd.get("email") || ""),
              homeAddress: homeAddress || undefined,
              homePostalCode:
                String(fd.get("homePostalCode") || "") || undefined,
              gymAddress: String(fd.get("address") || ""),
              gymAddressDetail:
                String(fd.get("addressDetail") || "") || undefined,
              gymPostalCode: String(fd.get("postalCode") || "") || undefined,
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
            });
            if (!res.ok) {
              setSubmitError(res.error.message);
              return;
            }
            setInviteDone(res.data.message);
          } catch (err) {
            setSubmitError(
              err instanceof Error ? err.message : "제출에 실패했습니다.",
            );
          }
        });
      }}
    >
      {mode === "association_invite" && associationInvite ? (
        <section className="rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-matchon-primary">
            초대한 협회
          </p>
          <p className="mt-1 text-base font-semibold text-matchon-text-primary">
            {associationInvite.organizerName}
          </p>
          <p className="mt-2 text-sm text-matchon-text-secondary">
            {associationInvite.organizerName}의 초대로 가입합니다. 가입 승인 후
            해당 협회와 연결됩니다.
          </p>
          {associationInvite.guideMessage ? (
            <p className="mt-2 text-sm text-matchon-text-secondary">
              {associationInvite.guideMessage}
            </p>
          ) : null}
          {associationInvite.guideFiles.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {associationInvite.guideFiles.map((f) => (
                <li key={f.id}>
                  <a
                    className="text-matchon-primary underline"
                    href={`/api/member-gym/link-attachments/${f.id}/download?token=${encodeURIComponent(associationInvite.token)}`}
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
      ) : null}

      {mode === "independent" ? (
        <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-matchon-text-primary">
            1. 계정 정보
          </h2>
          <RequestedLoginIdField disabled={pending} />
          <div className={authLoginFieldStackClass}>
            <label htmlFor="password" className={authLoginLabelClass}>
              비밀번호 *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              disabled={pending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authLoginInputClass}
            />
            <p className={authLoginSecondaryNoteClass}>
              8자 이상, 공백 없이 입력해 주세요. 관리자 승인 후 이 비밀번호로
              바로 로그인합니다.
            </p>
          </div>
          <div className={authLoginFieldStackClass}>
            <label htmlFor="passwordConfirm" className={authLoginLabelClass}>
              비밀번호 확인 *
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              disabled={pending}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={authLoginInputClass}
              aria-invalid={passwordsMismatch || undefined}
            />
            {passwordsMismatch ? (
              <p className={authLoginErrorClass} role="alert">
                비밀번호가 일치하지 않습니다.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-matchon-text-primary">
          {mode === "independent" ? "2. 체육관 정보" : "1. 체육관 정보"}
        </h2>
        <TextField name="gymName" label="체육관명" required />
        <div className={authLoginFieldStackClass}>
          <label htmlFor="ownerOrRep" className={authLoginLabelClass}>
            대표자명 *
          </label>
          <input
            id="ownerOrRep"
            name={mode === "independent" ? "representativeName" : "ownerName"}
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={authLoginInputClass}
          />
        </div>
        {mode === "independent" ? (
          <PhoneInput name="phone" label="체육관 연락처" />
        ) : (
          <PhoneInput name="gymPhone" label="체육관 연락처" />
        )}
        <AddressSearchField
          label="체육관 주소"
          required
          postalName="postalCode"
          addressName="address"
          detailName="addressDetail"
          inputClassName={authLoginInputClass}
        />
        <BusinessNoInput name="businessNo" label="사업자등록번호" />
        <TextField name="sportType" label="운영 종목" />
        <div className={authLoginFieldStackClass}>
          <label htmlFor="description" className={authLoginLabelClass}>
            소개
          </label>
          <textarea
            id="description"
            name={mode === "independent" ? "description" : "memo"}
            rows={3}
            className={`${authLoginInputClass} min-h-[5rem] py-2`}
          />
        </div>
        {mode === "association_invite" ? (
          <>
            <TextField name="ownerNameEn" label="성명 영문" />
            <TextField name="birthDate" label="생년월일" type="date" />
            <TextField name="gender" label="성별" />
            <AddressSearchField
              label="집 주소"
              postalName="homePostalCode"
              addressName="homeAddress"
              detailName="homeAddressDetail"
              inputClassName={authLoginInputClass}
            />
            <div className={authLoginFieldStackClass}>
              <label htmlFor="qualifications" className={authLoginLabelClass}>
                보유단증 및 자격증
              </label>
              <textarea
                id="qualifications"
                name="qualifications"
                rows={3}
                className={`${authLoginInputClass} min-h-[5rem] py-2`}
              />
            </div>
            <div className={authLoginFieldStackClass}>
              <label htmlFor="careerSummary" className={authLoginLabelClass}>
                경력
              </label>
              <textarea
                id="careerSummary"
                name="careerSummary"
                rows={3}
                className={`${authLoginInputClass} min-h-[5rem] py-2`}
              />
            </div>
          </>
        ) : (
          <TextField name="contactName" label="담당자명" />
        )}
        {mode === "independent" ? (
          phoneVerificationEnabled ? (
            <>
              <PhoneVerificationPanel
                accountType="gym"
                phone={mobilePhone}
                onPhoneChange={setMobilePhone}
                verificationToken={signupVerificationToken}
                onVerified={setSignupVerificationToken}
                onReset={() => setSignupVerificationToken(null)}
                disabled={pending || isUploading}
              />
              <input type="hidden" name="mobilePhone" value={mobilePhone} />
              <input
                type="hidden"
                name="signupVerificationToken"
                value={signupVerificationToken ?? ""}
              />
            </>
          ) : (
            <div className="space-y-2">
              <PhoneInput name="mobilePhone" label="개인 연락처" required />
              <p className={authLoginSecondaryNoteClass} role="status">
                휴대폰 본인인증은 준비 중입니다. 현재는 기존 방식으로 가입
                신청할 수 있습니다.
              </p>
            </div>
          )
        ) : (
          <PhoneInput name="mobilePhone" label="개인 연락처" required />
        )}
        <TextField name="email" label="이메일" type="email" required />
      </section>

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-matchon-text-primary">
          {mode === "independent" ? "3. 첨부 서류" : "2. 첨부 서류"}
        </h2>
        <p className={authLoginSecondaryNoteClass}>{GYM_JOIN_ATTACHMENT_HINT}</p>
        {slots.map((slot) => {
          const attachment = attachments.find(
            (item) => item.attachmentType === slot.type,
          );
          return (
            <DocumentUploadField
              key={slot.type}
              label={slot.label}
              description={slot.description}
              required={slot.required}
              accept={
                slot.imageOnly
                  ? "image/jpeg,image/png,image/webp"
                  : "image/jpeg,image/png,image/webp,application/pdf"
              }
              acceptHint={
                slot.imageOnly ? "JPEG, PNG, WebP" : "JPEG, PNG, WebP, PDF"
              }
              maxSizeHint={
                slot.imageOnly
                  ? "최대 10MB"
                  : "이미지 최대 10MB · PDF 최대 20MB"
              }
              value={
                attachment
                  ? {
                      fileName: attachment.originalFileName,
                      sizeBytes: attachment.sizeBytes,
                      mimeType: attachment.mimeType,
                    }
                  : null
              }
              status={uploadStatuses[slot.type] ?? "idle"}
              error={uploadErrors[slot.type]}
              disabled={pending}
              onSelect={(file) => void uploadFile(file, slot.type)}
              onRemove={() => removeAttachment(slot.type)}
            />
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl border border-matchon-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-matchon-text-primary">
          {mode === "independent" ? "4. 신청인 및 서약" : "3. 신청인 및 서약"}
        </h2>
        <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
          <input name="privacyConsent" type="checkbox" required className="mt-1" />
          개인정보 수집·이용에 동의합니다.{" "}
          <span className="font-medium text-matchon-text-primary">(필수)</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
          <input
            name="registrationConsent"
            type="checkbox"
            required
            className="mt-1"
          />
          입력한 정보가 사실임을 확인하며 체육관 가입 신청에 동의합니다.{" "}
          <span className="font-medium text-matchon-text-primary">(필수)</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
          <input name="smsConsent" type="checkbox" className="mt-1" />
          SMS 수신에 동의합니다. (선택)
        </label>
        <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
          <input name="informationConsent" type="checkbox" className="mt-1" />
          자료·정보 수신에 동의합니다. (선택)
        </label>
        <div className={authLoginFieldStackClass}>
          <label htmlFor="signatureName" className={authLoginLabelClass}>
            신청인 성명 *
          </label>
          <input
            id="signatureName"
            name="signatureName"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={authLoginInputClass}
          />
        </div>
        <div>
          <p className={authLoginLabelClass}>손서명 *</p>
          <p className={`${authLoginSecondaryNoteClass} mb-2`}>
            아래 영역에 직접 서명해 주세요. 「서명 완료」를 누르면 신청서에
            포함됩니다.
          </p>
          <MemberGymSignatureField onChange={setSignatureDataUrl} />
        </div>
        <label className="flex items-start gap-2 text-sm text-matchon-text-secondary">
          <input
            name="signatureConsent"
            type="checkbox"
            required
            className="mt-1"
          />
          위 내용이 사실임을 확인하고 전자 신청합니다.{" "}
          <span className="font-medium text-matchon-text-primary">(필수)</span>
        </label>
      </section>

      {submitError ? (
        <p className={authLoginErrorClass} role="alert">
          {submitError}
        </p>
      ) : null}
      {independentState?.ok === false ? (
        <p className={authLoginErrorClass} role="alert" aria-live="assertive">
          {independentState.error.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="default"
        className="w-full font-bold"
        disabled={
          pending ||
          isUploading ||
          passwordsMismatch ||
          (mode === "independent" &&
            phoneVerificationEnabled &&
            !signupVerificationToken)
        }
      >
        {pending
          ? "제출 중…"
          : isUploading
            ? "파일 업로드 중…"
            : "가입 신청 제출"}
      </Button>
    </form>
  );
}
