"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddressSearchField } from "@/components/shared/AddressSearchField";
import { BusinessNoInput, PhoneInput } from "@/components/shared/PhoneInput";
import {
  MemberGymSignatureField,
  dataUrlToFile,
} from "@/components/domain/member-gyms/MemberGymSignatureField";
import {
  createManualMemberGymApplicationAction,
  issueManualMemberGymApplicationUploadAction,
} from "@/features/member-gyms/actions";
import type { AssociationMemberGymApplicationAttachmentType } from "@/lib/enums";
import {
  MEMBER_GYM_APPLICATION_ATTACHMENT_SLOTS,
  MEMBER_GYM_MANUAL_EXTRA_ATTACHMENT_SLOTS,
  MEMBER_GYM_RECEPTION_OPTIONS,
} from "@/lib/member-gym/application-form";
import type { MemberGymSettingsV1 } from "@/lib/member-gym/settings";
import { MEMBER_GYM_ATTACHMENT_TYPE_LABEL } from "@/lib/ui-labels/member-gym";

type PendingAttachment = {
  attachmentType: AssociationMemberGymApplicationAttachmentType;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export function MemberGymManualApplicationForm({
  settings,
  actorName,
}: {
  settings: MemberGymSettingsV1;
  actorName: string;
}) {
  const router = useRouter();
  const uploadBatchId = useMemo(() => crypto.randomUUID(), []);
  const [pending, start] = useTransition();
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [paperOriginalConfirmed, setPaperOriginalConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachmentSlots = [
    ...MEMBER_GYM_APPLICATION_ATTACHMENT_SLOTS,
    ...MEMBER_GYM_MANUAL_EXTRA_ATTACHMENT_SLOTS,
  ];

  async function uploadFile(
    file: File,
    attachmentType: AssociationMemberGymApplicationAttachmentType,
  ): Promise<PendingAttachment> {
    const issue = await issueManualMemberGymApplicationUploadAction({
      uploadBatchId,
      attachmentType,
      mimeType: file.type,
      sizeBytes: file.size,
      originalFileName: file.name,
    });
    if (!issue.ok) {
      throw new Error(issue.error.message);
    }
    const put = await fetch(issue.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("파일 업로드 실패");
    const meta: PendingAttachment = {
      attachmentType,
      storagePath: issue.data.path,
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

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          try {
            let nextAttachments = [...attachments];
            const hasPaper = nextAttachments.some(
              (a) => a.attachmentType === "paper_application_scan",
            );
            if (signatureDataUrl) {
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
            } else if (!hasPaper || !paperOriginalConfirmed) {
              setError(
                "손서명을 완료하거나, 종이 신청서 스캔 첨부 후 「종이 원본 서명 확인」에 체크해 주세요.",
              );
              return;
            }

            const homeBase = String(fd.get("homeAddress") || "").trim();
            const homeDetail = String(fd.get("homeAddressDetail") || "").trim();
            const homeAddress = [homeBase, homeDetail]
              .filter(Boolean)
              .join(" ");

            const payload = {
              receptionChannel: String(fd.get("receptionChannel") || "manual"),
              receivedAt: String(fd.get("receivedAt") || "") || undefined,
              internalMemo: String(fd.get("internalMemo") || "") || undefined,
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
              paperConsentConfirmed: fd.get("paperConsentConfirmed") === "on",
              uploadBatchId,
              attachmentsJson: JSON.stringify(nextAttachments),
            };
            const res = await createManualMemberGymApplicationAction(payload);
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            router.push(
              `/organizer/member-gyms/applications/${res.data.applicationId}`,
            );
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "저장 실패");
          }
        });
      }}
    >
      <section className="space-y-3 rounded-md border border-matchon-border bg-white p-4">
        <h2 className="text-sm font-bold">접수 정보</h2>
        <label className="block text-xs">
          접수 방식 *
          <select
            name="receptionChannel"
            required
            defaultValue="paper"
            className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          >
            {MEMBER_GYM_RECEPTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="receivedAt"
          label="접수일"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <label className="block text-xs">
          내부 메모
          <textarea
            name="internalMemo"
            rows={2}
            className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-matchon-text-secondary">
          입력 담당자: {actorName}
        </p>
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
        <PhoneInput name="phone" label="개인 휴대전화" required />
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
          보유 단증 및 자격
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
        <h2 className="text-sm font-bold">4. 증빙·원본 스캔</h2>
        <p className="text-xs text-matchon-text-secondary">
          JPEG/PNG/WebP/PDF · private bucket(`member-gym-files`)만 사용합니다.
          {settings.form.requireRepresentativePhoto ? " 증명사진 필수." : ""}
          {settings.form.requireBusinessRegistration
            ? " 사업자등록증 필수."
            : ""}
        </p>
        {attachmentSlots.map((type) => (
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
        <h2 className="text-sm font-bold">5. 신청인 서명·서류 확인</h2>
        <p className="text-xs text-matchon-text-secondary">
          신청인 성명: {ownerName || "(대표자 성명과 동일)"}
        </p>
        <div>
          <p className="mb-1 text-xs font-medium">손서명</p>
          <MemberGymSignatureField onChange={setSignatureDataUrl} />
        </div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={paperOriginalConfirmed}
            onChange={(e) => setPaperOriginalConfirmed(e.target.checked)}
          />
          종이 신청서 원본 서명을 확인했습니다. (스캔만으로 손서명 생략 시
          필수)
        </label>
        <label className="flex items-start gap-2">
          <input name="paperConsentConfirmed" type="checkbox" required />
          원본 서류(종이·방문 접수 등)를 확인하고 사실과 다름없이
          입력했습니다. (필수)
        </label>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-matchon-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "저장 중…" : "신청으로 저장"}
        </button>
        <p className="text-xs text-matchon-text-secondary sm:self-center">
          저장 후 상세에서 검토·Gym 연결·승인합니다. 즉시 승인하지 않습니다.
        </p>
      </div>
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
  return (
    <label className="block text-xs">
      {label}
      {required ? " *" : ""}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
      />
    </label>
  );
}
