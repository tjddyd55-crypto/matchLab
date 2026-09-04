"use client";

import { useEffect, useId, useRef, useState } from "react";
import { scheduleEffectStateUpdate } from "@/lib/react/schedule-effect-state-update";
import {
  isDaumPostcodeReady,
  loadDaumPostcodeScript,
} from "@/lib/daum-postcode-loader";
import { cn } from "@/lib/utils";

const EMBED_HEIGHT_PX = 420;

/**
 * 우편번호·기본주소(검색)·상세주소 공통 필드.
 * - 팝업/새 창 없이 폼 내부 embed(접힘/펼침)
 * - 우편번호/기본주소: 검색 결과로만 채움 (스크립트 실패 시에만 직접 입력)
 * - 상세주소: 사용자 입력 · 주소 선택 후 자동 focus
 */
export function AddressSearchField({
  label = "주소",
  required,
  addressName,
  detailName,
  postalName,
  defaultAddress = "",
  defaultDetail = "",
  defaultPostal = "",
  className,
  inputClassName,
  error,
}: {
  label?: string;
  required?: boolean;
  addressName: string;
  detailName: string;
  postalName?: string;
  defaultAddress?: string;
  defaultDetail?: string;
  defaultPostal?: string;
  className?: string;
  inputClassName?: string;
  error?: string | null;
}) {
  const fieldId = useId();
  const detailRef = useRef<HTMLInputElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const [postal, setPostal] = useState(defaultPostal);
  const [base, setBase] = useState(defaultAddress);
  const [detail, setDetail] = useState(defaultDetail);
  const [isOpen, setIsOpen] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const inputClass = cn(
    "w-full rounded-md border border-matchon-border bg-white px-3 py-2.5 text-base text-matchon-text-primary shadow-sm",
    inputClassName,
  );
  const readOnlyClass = cn(
    inputClass,
    "bg-matchon-surface/60 read-only:opacity-100",
  );

  useEffect(() => {
    if (isDaumPostcodeReady()) {
      scheduleEffectStateUpdate(() => {
        setScriptReady(true);
      });
      return;
    }
    let cancelled = false;
    scheduleEffectStateUpdate(() => {
      setScriptLoading(true);
    });
    void loadDaumPostcodeScript()
      .then(() => {
        if (!cancelled) {
          setScriptReady(true);
          setScriptFailed(false);
          setInlineError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setScriptFailed(true);
          setScriptReady(false);
        }
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !scriptReady || scriptFailed) return;
    const el = embedRef.current;
    if (!el || !window.daum?.Postcode) return;

    el.replaceChildren();
    new window.daum.Postcode({
      oncomplete: (data) => {
        setPostal(data.zonecode ?? "");
        setBase(
          data.roadAddress?.trim() || data.jibunAddress?.trim() || "",
        );
        setIsOpen(false);
        setInlineError(null);
        window.setTimeout(() => detailRef.current?.focus(), 0);
      },
      width: "100%",
      height: EMBED_HEIGHT_PX,
    }).embed(el);
  }, [isOpen, scriptReady, scriptFailed]);

  async function toggleSearch() {
    if (isOpen) {
      setIsOpen(false);
      setInlineError(null);
      return;
    }
    setInlineError(null);
    if (scriptFailed) {
      setInlineError(
        "주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    if (!scriptReady) {
      setScriptLoading(true);
      try {
        await loadDaumPostcodeScript();
        setScriptReady(true);
        setScriptFailed(false);
        setIsOpen(true);
      } catch {
        setScriptFailed(true);
        setInlineError(
          "주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        setScriptLoading(false);
      }
      return;
    }
    setIsOpen(true);
  }

  async function retryLoad() {
    setInlineError(null);
    setScriptFailed(false);
    setScriptLoading(true);
    try {
      await loadDaumPostcodeScript();
      setScriptReady(true);
      setIsOpen(true);
    } catch {
      setScriptFailed(true);
      setInlineError(
        "주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setScriptLoading(false);
    }
  }

  const hasBase = Boolean(postal.trim() || base.trim());
  const searchLabel = isOpen
    ? "주소 검색 닫기"
    : hasBase
      ? "주소 다시 검색"
      : "주소 검색";

  return (
    <div className={cn("space-y-3", className)} data-address-search-field>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.9375rem] font-semibold text-matchon-text-primary">
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </span>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldId}-postal`}
          className="text-xs font-medium text-matchon-text-secondary"
        >
          우편번호
        </label>
        <div className="flex gap-2">
          <input
            id={`${fieldId}-postal`}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            readOnly={!scriptFailed}
            value={postal}
            onChange={(e) => setPostal(e.target.value)}
            placeholder="우편번호"
            aria-required={required || undefined}
            className={cn(readOnlyClass, "w-[7.5rem] shrink-0")}
          />
          <button
            type="button"
            onClick={() => void toggleSearch()}
            aria-expanded={isOpen}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-md border border-matchon-border bg-white px-3 text-sm font-semibold text-matchon-text-primary hover:bg-matchon-surface"
          >
            <span>{searchLabel}</span>
            <span aria-hidden className="text-xs text-matchon-text-secondary">
              {isOpen ? "▲" : "▼"}
            </span>
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          className="overflow-x-hidden rounded-md border border-matchon-border bg-white"
          data-address-search-embed
        >
          {scriptLoading && !scriptReady ? (
            <p
              className="px-3 py-4 text-sm text-matchon-text-secondary"
              role="status"
            >
              주소 검색을 준비하는 중입니다.
            </p>
          ) : null}
          <div
            ref={embedRef}
            className="w-full max-w-full"
            style={{ minHeight: scriptReady ? EMBED_HEIGHT_PX : undefined }}
          />
        </div>
      ) : null}

      {postalName ? (
        <input type="hidden" name={postalName} value={postal} />
      ) : null}
      <input type="hidden" name={addressName} value={base} />

      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldId}-base`}
          className="text-xs font-medium text-matchon-text-secondary"
        >
          기본 주소
        </label>
        <input
          id={`${fieldId}-base`}
          type="text"
          readOnly={!scriptFailed}
          value={base}
          onChange={(e) => setBase(e.target.value)}
          required={required}
          placeholder={
            scriptFailed
              ? "기본 주소를 입력해 주세요"
              : "주소를 검색해 주세요"
          }
          className={readOnlyClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldId}-detail`}
          className="text-xs font-medium text-matchon-text-secondary"
        >
          상세 주소
        </label>
        <input
          id={`${fieldId}-detail`}
          ref={detailRef}
          name={detailName}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="상세 주소를 입력해 주세요"
          autoComplete="address-line2"
          className={inputClass}
        />
      </div>

      {inlineError || scriptFailed ? (
        <div className="space-y-2" role="status">
          <p className="text-xs text-matchon-text-secondary">
            {inlineError ??
              "주소 검색을 불러오지 못했습니다. 우편번호와 기본 주소를 직접 입력해 주세요."}
          </p>
          {scriptFailed ? (
            <button
              type="button"
              onClick={() => void retryLoad()}
              className="text-sm font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              다시 시도
            </button>
          ) : null}
        </div>
      ) : scriptLoading && !scriptReady ? (
        <p className="text-xs text-matchon-text-secondary" role="status">
          주소 검색을 준비하는 중입니다.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
