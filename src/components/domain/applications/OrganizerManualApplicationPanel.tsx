"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createOrganizerManualApplicationAction } from "@/features/applications/actions";
import type { OrganizerManualRegistrationOptionsDTO } from "@/lib/services/application.service";
import { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { Button } from "@/components/ui/button";
import { ORGANIZER_FIELD_INPUT_CLASS } from "@/lib/organizer-dashboard-layout";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
] as const;

type DuplicateCandidate = {
  id: string;
  fighterCode: string;
  name: string;
};

const fieldClass = ORGANIZER_FIELD_INPUT_CLASS;
const labelClass = "text-muted-foreground mb-1 block text-xs font-medium";

export function OrganizerManualApplicationPanel({
  eventId,
  options,
}: {
  eventId: string;
  options: OrganizerManualRegistrationOptionsDTO;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    DuplicateCandidate[] | null
  >(null);
  const [linkFighterId, setLinkFighterId] = useState("");

  const [gymMode, setGymMode] = useState<"existing" | "manual">(
    options.gyms.length > 0 ? "existing" : "manual",
  );

  function resetDuplicateState() {
    setDuplicateCandidates(null);
    setLinkFighterId("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("eventId", eventId);
    fd.set("gymMode", gymMode);
    if (duplicateCandidates && linkFighterId) {
      fd.set("confirmDuplicate", "on");
      fd.set("linkFighterId", linkFighterId);
    }

    startTransition(async () => {
      const res = await createOrganizerManualApplicationAction(fd);
      if (!res.ok) {
        const details = res.error.details as
          | { duplicateCandidates?: DuplicateCandidate[] }
          | undefined;
        if (details?.duplicateCandidates?.length) {
          setDuplicateCandidates(details.duplicateCandidates);
          setError(res.error.message);
          return;
        }
        setError(res.error.message);
        return;
      }
      resetDuplicateState();
      setOpen(false);
      setError(null);
      router.refresh();
    });
  }

  return (
    <section className="ring-foreground/10 rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-base font-semibold">선수 직접 등록</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            체육관 신청 없이 주최자가 운영 필드만 입력해 신청자로 등록합니다.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={open ? "outline" : "default"}
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
            resetDuplicateState();
          }}
        >
          {open ? "닫기" : "선수 직접 등록"}
        </Button>
      </div>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="border-t px-4 pb-4 pt-3"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">체육관 · 선수 기본 정보</p>

              <div>
                <span className={labelClass}>체육관 입력 방식</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={gymMode === "existing" ? "default" : "outline"}
                    disabled={options.gyms.length === 0}
                    onClick={() => setGymMode("existing")}
                  >
                    기존 체육관 선택
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={gymMode === "manual" ? "default" : "outline"}
                    onClick={() => setGymMode("manual")}
                  >
                    체육관명 직접 입력
                  </Button>
                </div>
              </div>

              {gymMode === "existing" ? (
                <div>
                  <label className={labelClass} htmlFor="manual-gymId">
                    체육관 *
                  </label>
                  <select
                    id="manual-gymId"
                    name="gymId"
                    required
                    className={fieldClass}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      체육관 선택
                    </option>
                    {options.gyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={labelClass} htmlFor="manual-gymName">
                    체육관명 *
                  </label>
                  <input
                    id="manual-gymName"
                    name="gymName"
                    required
                    className={fieldClass}
                    placeholder="체육관명 입력"
                  />
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    동일 이름이 있으면 기존 체육관을 재사용합니다.
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass} htmlFor="manual-fighterName">
                  선수 이름 *
                </label>
                <input
                  id="manual-fighterName"
                  name="fighterName"
                  required
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="manual-gender">
                    성별 *
                  </label>
                  <select
                    id="manual-gender"
                    name="gender"
                    required
                    className={fieldClass}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      선택
                    </option>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="manual-birthDate">
                    생년월일 *
                  </label>
                  <AppDateInput
                    id="manual-birthDate"
                    name="birthDate"
                    required
                    disallowFuture
                    aria-label="생년월일"
                    inputClassName={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="manual-phone">
                  연락처
                </label>
                <input
                  id="manual-phone"
                  name="phone"
                  className={fieldClass}
                  placeholder="선택 입력"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="manual-guardianName">
                    보호자 이름
                  </label>
                  <input
                    id="manual-guardianName"
                    name="guardianName"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="manual-guardianPhone">
                    보호자 연락처
                  </label>
                  <input
                    id="manual-guardianPhone"
                    name="guardianPhone"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium">경기 · 입금 · 상태</p>

              <div>
                <label className={labelClass} htmlFor="manual-divisionId">
                  경기구분/체급 *
                </label>
                <select
                  id="manual-divisionId"
                  name="divisionId"
                  required
                  className={fieldClass}
                  defaultValue=""
                >
                  <option value="" disabled>
                    부문 선택
                  </option>
                  {options.divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="manual-applicationStatus">
                    신청 상태
                  </label>
                  <select
                    id="manual-applicationStatus"
                    name="applicationStatus"
                    className={fieldClass}
                    defaultValue={ApplicationStatus.approved}
                  >
                    <option value={ApplicationStatus.approved}>승인</option>
                    <option value={ApplicationStatus.pending}>미승인(대기)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="manual-paymentStatus">
                    입금 상태
                  </label>
                  <select
                    id="manual-paymentStatus"
                    name="paymentStatus"
                    className={fieldClass}
                    defaultValue={PaymentStatus.paid}
                  >
                    <option value={PaymentStatus.paid}>입금완료</option>
                    <option value={PaymentStatus.unpaid}>미입금</option>
                    <option value={PaymentStatus.waived}>입금 확인 불필요</option>
                    <option value={PaymentStatus.pending_check}>
                      입금 확인 필요
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="manual-memo">
                  메모
                </label>
                <textarea
                  id="manual-memo"
                  name="memo"
                  rows={3}
                  className={cn(fieldClass, "h-auto min-h-[4.5rem] py-2")}
                  placeholder="특이사항 (선택)"
                />
              </div>

              {options.feeAmount > 0 ? (
                <p className="text-muted-foreground text-xs">
                  참가비 기준 금액: {options.feeAmount.toLocaleString("ko-KR")}원
                </p>
              ) : null}

              {options.applicationFormMode === "custom" ? (
                <p className="text-muted-foreground text-xs">
                  커스텀 신청서 필드는 &quot;주최자 직접 등록&quot; 기본값으로
                  자동 저장됩니다.
                </p>
              ) : null}
            </div>
          </div>

          {duplicateCandidates && duplicateCandidates.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-100">
                중복 가능 선수가 있습니다. 기존 선수에 연결하거나 확인 후 새로
                등록할 수 있습니다.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {duplicateCandidates.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    size="sm"
                    variant={linkFighterId === c.id ? "default" : "outline"}
                    onClick={() => setLinkFighterId(c.id)}
                  >
                    {c.name} ({c.fighterCode})
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={linkFighterId === "" ? "default" : "outline"}
                  onClick={() => setLinkFighterId("")}
                >
                  새 선수로 등록
                </Button>
              </div>
              {linkFighterId ? (
                <input type="hidden" name="linkFighterId" value={linkFighterId} />
              ) : null}
              {(linkFighterId || duplicateCandidates) && (
                <input type="hidden" name="confirmDuplicate" value="on" />
              )}
            </div>
          ) : null}

          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "등록 중…" : "등록"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setError(null);
                resetDuplicateState();
              }}
            >
              취소
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
