"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMatchCourtFormAction } from "@/features/event-courts/actions";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import {
  matchCourtSaveButtonClass,
  matchCourtSelectClass,
  matchCourtSelectFluidClass,
  matchOperationalControlsRowClass,
} from "@/lib/ui/match-grid-layout";
import { organizerBracketFieldInputClass } from "@/lib/ui/organizer-bracket-ui";
import { cn } from "@/lib/utils";

function resolveCourtSelectState(
  courtId: string | null,
  courts: EventCourtVM[],
  activeCourts: EventCourtVM[],
): {
  selectValue: string;
  hint: string | null;
} {
  const assigned = courtId ? courts.find((c) => c.id === courtId) : null;

  if (assigned?.isActive) {
    return { selectValue: assigned.id, hint: null };
  }

  if (assigned && !assigned.isActive) {
    return {
      selectValue: activeCourts.length === 1 ? (activeCourts[0]?.id ?? "") : "",
      hint: `현재 «${assigned.name}»(비활성)에 배정되어 있습니다. 활성 경기장을 선택해 저장하세요.`,
    };
  }

  if (!courtId) {
    return {
      selectValue: activeCourts.length === 1 ? (activeCourts[0]?.id ?? "") : "",
      hint:
        activeCourts.length > 1
          ? "경기장 미배정 — 활성 경기장을 선택해 주세요."
          : null,
    };
  }

  return {
    selectValue: activeCourts.length === 1 ? (activeCourts[0]?.id ?? "") : "",
    hint: "알 수 없는 경기장 배정입니다. 활성 경기장을 다시 선택해 주세요.",
  };
}

function isSelectableValue(value: string, activeCourts: EventCourtVM[]): boolean {
  return value === "" || activeCourts.some((c) => c.id === value);
}

export function MatchCourtControls({
  eventId,
  matchId,
  bracketId,
  courts,
  courtId,
  courtOrder,
  hasOfficialResults = false,
  inline = false,
  immediate = false,
  hideCourtOrder = false,
  unwrapped = false,
  hideLabels = false,
  compactRow = false,
  organizerMemo,
  savedOrganizerMemo = null,
  hideSaveButton = false,
  onSaveControlsChange,
  extraFormFields,
  extraDirty = false,
  beforeSave,
}: {
  eventId: string;
  matchId: string;
  bracketId?: string;
  courts: EventCourtVM[];
  courtId: string | null;
  courtOrder: number | null;
  hasOfficialResults?: boolean;
  inline?: boolean;
  immediate?: boolean;
  hideCourtOrder?: boolean;
  /** true면 wrapper 없이 경기장 라벨을 부모 grid의 셀로 직접 렌더한다(immediate 전용). */
  unwrapped?: boolean;
  /** compact control row — 경기장 label 숨김, select+버튼 h-8 */
  hideLabels?: boolean;
  compactRow?: boolean;
  /** 저장 시 함께 반영할 운영 메모 (부모 controlled) */
  organizerMemo?: string;
  savedOrganizerMemo?: string | null;
  /** true면 저장 버튼을 렌더하지 않음 (부모가 우측 슬롯에 배치) */
  hideSaveButton?: boolean;
  onSaveControlsChange?: (controls: {
    save: () => void;
    pending: boolean;
    disabled: boolean;
  }) => void;
  /** 저장 FormData에 추가할 필드 (경기구분 등) */
  extraFormFields?: Record<string, string>;
  extraDirty?: boolean;
  /** false 반환 시 저장 중단. object면 extra FormData 병합 */
  beforeSave?: () => Promise<boolean | { extraFields: Record<string, string> }>;
}) {
  const router = useRouter();
  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts],
  );
  const resolved = useMemo(
    () => resolveCourtSelectState(courtId, courts, activeCourts),
    [courtId, courts, activeCourts],
  );

  const [pending, startTransition] = useTransition();
  const [localCourtId, setLocalCourtId] = useState(resolved.selectValue);
  const [localOrder, setLocalOrder] = useState(
    courtOrder != null ? String(courtOrder) : "",
  );
  const [message, setMessage] = useState<string | null>(null);

  const selectValue = isSelectableValue(localCourtId, activeCourts)
    ? localCourtId
    : resolved.selectValue;

  const courtDirty =
    selectValue !== resolved.selectValue ||
    localOrder !== (courtOrder != null ? String(courtOrder) : "");
  const memoDirty =
    organizerMemo !== undefined &&
    organizerMemo !== (savedOrganizerMemo ?? "");
  const isDirty = courtDirty || memoDirty || extraDirty;

  useEffect(() => {
    setLocalCourtId(resolved.selectValue);
    setLocalOrder(courtOrder != null ? String(courtOrder) : "");
  }, [resolved.selectValue, courtOrder, matchId]);

  function save(nextCourtId?: string, nextOrder?: string) {
    const court = nextCourtId ?? selectValue;
    const order = nextOrder ?? localOrder;
    if (!court) {
      setMessage("경기장을 선택해 주세요.");
      return;
    }
    if (!activeCourts.some((c) => c.id === court)) {
      setMessage("활성 경기장을 선택해 주세요.");
      return;
    }
    setMessage(null);

    startTransition(async () => {
      let mergeFields: Record<string, string> = { ...(extraFormFields ?? {}) };
      if (beforeSave) {
        const result = await beforeSave();
        if (!result) return;
        if (typeof result === "object") {
          mergeFields = { ...mergeFields, ...result.extraFields };
        }
      }
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("matchId", matchId);
      if (bracketId) fd.set("bracketId", bracketId);
      fd.set("courtId", court);
      fd.set("courtOrder", order);
      if (organizerMemo !== undefined) {
        fd.set("organizerMemo", organizerMemo);
      }
      for (const [key, value] of Object.entries(mergeFields)) {
        fd.set(key, value);
      }
      const res = await setMatchCourtFormAction(fd);
      if (!res.ok) {
        setMessage(res.error.message);
        return;
      }
      setMessage(immediate ? null : "저장됨");
      router.refresh();
    });
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  const saveDisabled = pending || !selectValue || !isDirty;

  useEffect(() => {
    if (!onSaveControlsChange) return;
    onSaveControlsChange({
      save: () => saveRef.current(),
      pending,
      disabled: saveDisabled,
    });
  }, [onSaveControlsChange, pending, saveDisabled, extraDirty, extraFormFields]);

  function handleCourtChange(value: string) {
    setLocalCourtId(value);
    if (immediate) {
      save(value, localOrder);
    }
  }

  if (activeCourts.length === 0) {
    return (
      <p className="text-muted-foreground text-[10px]">
        활성 경기장이 없습니다. 기본설정에서 경기장을 먼저 생성해 주세요.
      </p>
    );
  }

  function renderCourtSelect(className?: string) {
    const selectedCourtName =
      activeCourts.find((c) => c.id === selectValue)?.name ?? undefined;
    return (
      <select
        className={cn(
          compactRow ? matchCourtSelectClass : matchCourtSelectFluidClass,
          "shrink-0",
          className,
        )}
        aria-label="경기장"
        title={selectedCourtName}
        value={selectValue}
        onChange={(e) => handleCourtChange(e.target.value)}
        required
      >
        {activeCourts.length > 1 && !selectValue ? (
          <option value="">경기장 선택</option>
        ) : null}
        {activeCourts.map((c) => (
          <option key={c.id} value={c.id} title={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    );
  }

  if (unwrapped) {
    return (
      <>
        {hideLabels ? (
          renderCourtSelect()
        ) : (
          <label className="flex min-w-0 flex-col gap-0.5 text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">
              경기장
            </span>
            {renderCourtSelect()}
          </label>
        )}
        {resolved.hint ? (
          <p className="text-amber-800 col-span-full text-[10px] dark:text-amber-200">
            {resolved.hint}
          </p>
        ) : null}
        {hasOfficialResults ? (
          <p className="text-amber-800 col-span-full text-[10px] dark:text-amber-200">
            결과 확정 경기 — 경기장만 변경됩니다.
          </p>
        ) : null}
        {message ? (
          <FeedbackMessage
            tone={message === "저장됨" ? "success" : "error"}
            className="col-span-full text-[10px]"
          >
            {message}
          </FeedbackMessage>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={cn(
        inline
          ? compactRow
            ? matchOperationalControlsRowClass
            : "flex flex-wrap items-end gap-2"
          : "flex flex-col gap-2 rounded-md border bg-muted/20 p-2",
      )}
    >
      {resolved.hint && !compactRow ? (
        <p className="text-amber-800 w-full text-[10px] dark:text-amber-200">
          {resolved.hint}
        </p>
      ) : null}
      {hideLabels ? (
        renderCourtSelect()
      ) : (
        <label className="flex shrink-0 flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground text-[10px]">경기장</span>
          {renderCourtSelect()}
        </label>
      )}
      {!hideCourtOrder ? (
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground text-[10px]">경기장 순서</span>
          <input
            type="number"
            min={1}
            className={cn(organizerBracketFieldInputClass, "h-9 w-16 text-[11px]")}
            value={localOrder}
            onChange={(e) => setLocalOrder(e.target.value)}
            placeholder="—"
          />
        </label>
      ) : null}
      {!immediate && !hideSaveButton ? (
        <Button
          type="button"
          size="sm"
          className={matchCourtSaveButtonClass}
          disabled={pending || !selectValue || !isDirty}
          onClick={() => save()}
        >
          {pending ? "저장 중…" : compactRow ? "저장" : "경기장 저장"}
        </Button>
      ) : pending && !hideSaveButton ? (
        <p className="text-muted-foreground text-[10px]">저장 중…</p>
      ) : null}
      {hasOfficialResults && !compactRow ? (
        <p className="text-amber-800 text-[10px] dark:text-amber-200">
          결과 확정 경기 — 경기장만 변경됩니다.
        </p>
      ) : null}
      {message ? (
        <FeedbackMessage
          tone={message === "저장됨" ? "success" : "error"}
          className="text-[10px]"
        >
          {message}
        </FeedbackMessage>
      ) : null}
    </div>
  );
}
