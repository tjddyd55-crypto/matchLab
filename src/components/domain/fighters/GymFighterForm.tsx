"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createGymFighterDirectAction,
  releaseGymFighterAffiliationAction,
  updateGymFighterAction,
} from "@/features/fighters/actions";
import { AppDateInput } from "@/components/shared/AppDateInput";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { FighterStatus } from "@/lib/enums";
import type { GymFighterFormInitialValues } from "@/lib/fighters/gym-fighter-form-initial";
import { cn } from "@/lib/utils";
import {
  StructuredRecordFields,
  type StructuredRecordValue,
} from "@/components/domain/fighters/StructuredRecordFields";

type DuplicateCandidate = {
  id: string;
  fighterCode: string;
  name: string;
};

export type GymFighterFormValues = GymFighterFormInitialValues;

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
] as const;

const STATUS_OPTIONS: { value: FighterStatus; label: string }[] = [
  { value: FighterStatus.active, label: "활성" },
  { value: FighterStatus.inactive, label: "비활성" },
];

export function GymFighterForm({
  mode,
  fighterId,
  initial,
  returnTo,
}: {
  mode: "create" | "edit";
  fighterId?: string;
  initial?: Partial<GymFighterFormValues>;
  returnTo?: string;
}) {
  const router = useRouter();
  const { confirm } = useAppConfirmDialog();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(
    null,
  );
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [createLoginAccount, setCreateLoginAccount] = useState(
    mode === "create",
  );
  const [issuedCredentials, setIssuedCredentials] = useState<{
    loginId: string;
    temporaryPassword: string;
  } | null>(null);
  const [record, setRecord] = useState<StructuredRecordValue>(() => {
    const total = initial?.recordTotalBouts ?? 0;
    const wins = initial?.recordWin ?? 0;
    const draws = initial?.recordDraw ?? 0;
    const losses = initial?.recordLoss ?? 0;
    const detailSum = wins + draws + losses;
    // Fighter Int 캐시: 총전만 저장 시 W/D/L=0 → UI에서는 모름(null)
    if (total > 0 && detailSum === 0) {
      return { totalBouts: total, wins: null, draws: null, losses: null };
    }
    return { totalBouts: total, wins, draws, losses };
  });

  const inputClass =
    "border-input bg-background h-10 w-full rounded-md border px-3 text-sm";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    // 구조화 전적 값 명시 설정 (controlled 모드 — form input value가 React state에 있음)
    fd.set("totalBouts", String(record.totalBouts));
    fd.set("wins", record.wins == null ? "" : String(record.wins));
    fd.set("draws", record.draws == null ? "" : String(record.draws));
    fd.set("losses", record.losses == null ? "" : String(record.losses));

    if (mode === "create" && duplicates?.length && selectedLinkId) {
      fd.set("confirmDuplicateLink", "true");
      fd.set("linkFighterId", selectedLinkId);
    }

    const res =
      mode === "create"
        ? await createGymFighterDirectAction(null, fd)
        : await updateGymFighterAction(null, fd);

    setPending(false);

    if (!res.ok) {
      const dupes =
        res.error.details &&
        typeof res.error.details === "object" &&
        "duplicateCandidates" in res.error.details
          ? (res.error.details as { duplicateCandidates: DuplicateCandidate[] })
              .duplicateCandidates
          : null;
      if (dupes?.length) {
        setDuplicates(dupes);
        setError(res.error.message);
        return;
      }
      setError(res.error.message);
      return;
    }

    if (
      mode === "create" &&
      res.ok &&
      "loginCredentials" in res.data &&
      res.data.loginCredentials
    ) {
      setIssuedCredentials(res.data.loginCredentials);
      return;
    }

    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push("/gym/fighters");
    }
    router.refresh();
  }

  if (issuedCredentials) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">선수에게 전달할 로그인 정보</h2>
        <p className="text-muted-foreground text-xs">
          아래 비밀번호는 지금 한 번만 표시됩니다. 기존 비밀번호는 확인할 수
          없습니다.
        </p>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">아이디</dt>
            <dd className="font-mono font-medium">{issuedCredentials.loginId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">임시 비밀번호</dt>
            <dd className="font-mono font-medium">
              {issuedCredentials.temporaryPassword}
            </dd>
          </div>
        </dl>
        <Button
          type="button"
          onClick={() => {
            router.push(returnTo ?? "/gym/fighters");
            router.refresh();
          }}
        >
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-6">
      {mode === "edit" && fighterId ? (
        <input type="hidden" name="fighterId" value={fighterId} />
      ) : null}

      {duplicates?.length ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm"
          role="alert"
        >
          <p className="font-medium">중복 후보가 있습니다</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            동일한 이름·생년월일·성별(및 연락처)의 선수가 이미 있습니다. 기존
            선수에 소속을 연결하거나 정보를 수정해 주세요.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicates.map((d) => (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="dupPick"
                    checked={selectedLinkId === d.id}
                    onChange={() => setSelectedLinkId(d.id)}
                  />
                  <span>
                    {d.name}{" "}
                    <span className="text-muted-foreground font-mono text-xs">
                      {d.fighterCode}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">선수명 *</span>
          <input
            className={inputClass}
            name="name"
            required
            defaultValue={initial?.name ?? ""}
          />
        </label>
        <div className="space-y-1.5 text-sm">
          <span className="font-semibold">생년월일 *</span>
          <AppDateInput
            name="birthDate"
            required
            disallowFuture
            defaultValue={initial?.birthDate ?? ""}
            aria-label="생년월일"
          />
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">성별 *</span>
          <select
            className={inputClass}
            name="gender"
            required
            defaultValue={initial?.gender ?? ""}
          >
            <option value="">선택</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">휴대폰</span>
          <input
            className={inputClass}
            name="phone"
            inputMode="tel"
            placeholder="선택"
            defaultValue={initial?.phone ?? ""}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">체중(kg)</span>
          <input
            className={inputClass}
            name="weight"
            type="number"
            step="0.1"
            min="0"
            defaultValue={initial?.weight ?? ""}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">키(cm)</span>
          <input
            className={inputClass}
            name="height"
            type="number"
            step="0.1"
            min="0"
            defaultValue={initial?.height ?? ""}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">주 종목</span>
          <input
            className={inputClass}
            name="primarySport"
            placeholder="예: 킥복싱"
            defaultValue={initial?.primarySport ?? ""}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">보호자명</span>
          <input
            className={inputClass}
            name="guardianName"
            defaultValue={initial?.guardianName ?? ""}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">보호자 연락처</span>
          <input
            className={inputClass}
            name="guardianPhone"
            inputMode="tel"
            defaultValue={initial?.guardianPhone ?? ""}
          />
        </label>
        {mode === "edit" ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium">상태</span>
            <select
              className={inputClass}
              name="status"
              defaultValue={initial?.status ?? FighterStatus.active}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">체육관 메모</span>
          <textarea
            className={cn(inputClass, "min-h-[80px] py-2")}
            name="gymInternalMemo"
            rows={3}
            defaultValue={initial?.gymInternalMemo ?? ""}
          />
        </label>
        <div className="sm:col-span-2">
          <StructuredRecordFields
            idPrefix="gym-fighter-record"
            value={record}
            onChange={setRecord}
          />
        </div>
      </div>

      {mode === "create" ? (
        <div className="rounded-lg border p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={createLoginAccount}
              onChange={(e) => setCreateLoginAccount(e.target.checked)}
            />
            선수 로그인 계정도 같이 만들기
          </label>
          {createLoginAccount ? (
            <>
              <input type="hidden" name="createLoginAccount" value="true" />
              <label className="block space-y-1 text-sm">
                <span className="font-medium">로그인 아이디</span>
                <input
                  name="loginId"
                  required
                  className={inputClass}
                  minLength={4}
                  maxLength={20}
                  autoComplete="off"
                  title="4~20자, 영문 소문자·숫자·_·-"
                />
                <span className="text-muted-foreground text-xs">
                  4~20자, 영문 소문자·숫자·_·-
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="autoGeneratePassword"
                  value="true"
                  defaultChecked
                />
                초기 비밀번호 자동 생성
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">초기 비밀번호 (직접 입력 시)</span>
                <input
                  name="password"
                  type="password"
                  className={inputClass}
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : (
            <input type="hidden" name="createLoginAccount" value="false" />
          )}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs leading-relaxed">
        선수 등록 단계에서는 서명·보호자 전자동의가 필요하지 않습니다. 대회
        공식 신청 시 별도로 진행됩니다.
      </p>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : mode === "create" ? "선수 등록" : "저장"}
        </Button>
        <Link
          href={returnTo ?? "/gym/fighters"}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          취소
        </Link>
      </div>

      {mode === "edit" && fighterId ? (
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">소속 해제</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            소속만 해제하며 선수·과거 대회 신청 기록은 삭제되지 않습니다.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: "이 선수의 체육관 소속을 해제할까요?",
                  description: "목록에서 제외됩니다.",
                  variant: "danger",
                });
                if (!ok) return;
                setPending(true);
                const fd = new FormData();
                fd.set("fighterId", fighterId);
                const res = await releaseGymFighterAffiliationAction(null, fd);
                setPending(false);
                if (!res.ok) {
                  setError(res.error.message);
                  return;
                }
                router.push("/gym/fighters");
                router.refresh();
              })();
            }}
          >
            소속 해제
          </Button>
        </div>
      ) : null}
    </form>
  );
}

/** @deprecated import from `@/lib/fighters/gym-fighter-form-initial` (server-safe) */
export { gymFighterFormInitialFromEdit } from "@/lib/fighters/gym-fighter-form-initial";
