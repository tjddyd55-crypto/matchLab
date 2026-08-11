"use client";

import { useId, useRef, useState } from "react";
import Script from "next/script";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * 우편번호·기본주소(검색)·상세주소 공통 필드.
 * - 우편번호/기본주소: 검색 결과로만 채움 (스크립트 실패 시에만 직접 입력)
 * - 상세주소: 사용자 입력
 * Window.daum 타입은 EventAddressInput과 동일 선언을 사용한다.
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
  const { alert } = useAppConfirmDialog();
  const fieldId = useId();
  const detailRef = useRef<HTMLInputElement>(null);
  const [postal, setPostal] = useState(defaultPostal);
  const [base, setBase] = useState(defaultAddress);
  const [detail, setDetail] = useState(defaultDetail);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const inputClass = cn(
    "w-full rounded-md border border-matchon-border bg-white px-3 py-2.5 text-base text-matchon-text-primary shadow-sm",
    inputClassName,
  );
  const readOnlyClass = cn(inputClass, "bg-matchon-surface/60 read-only:opacity-100");

  const openSearch = () => {
    if (typeof window === "undefined") return;
    if (!window.daum?.Postcode) {
      void alert({
        title: "알림",
        description: scriptFailed
          ? "주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요."
          : "주소 검색을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setPostal(data.zonecode ?? "");
        setBase(data.roadAddress?.trim() || data.jibunAddress?.trim() || "");
        window.setTimeout(() => detailRef.current?.focus(), 0);
      },
    }).open();
  };

  const hasBase = Boolean(postal.trim() || base.trim());
  const searchLabel = hasBase ? "주소 다시 검색" : "주소 검색";

  return (
    <div className={cn("space-y-3", className)} data-address-search-field>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />

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
            onClick={openSearch}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-matchon-border bg-white px-3 text-sm font-semibold text-matchon-text-primary hover:bg-matchon-surface"
          >
            {searchLabel}
          </button>
        </div>
      </div>

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
              : "주소 검색을 이용해 주세요"
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

      {scriptFailed ? (
        <p className="text-xs text-matchon-text-secondary" role="status">
          주소 검색을 불러오지 못했습니다. 우편번호와 기본 주소를 직접 입력해
          주세요.
        </p>
      ) : !scriptReady ? (
        <p className="text-xs text-matchon-text-secondary">
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
