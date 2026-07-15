"use client";

import { useId, useRef, useState } from "react";
import Script from "next/script";
import { cn } from "@/lib/utils";

/**
 * 우편번호·기본주소(검색)·상세주소.
 * Window.daum 타입은 EventAddressInput과 동일 선언을 사용한다.
 */
export function AddressSearchField({
  label,
  required,
  addressName,
  detailName,
  postalName,
  defaultAddress = "",
  defaultDetail = "",
  defaultPostal = "",
  className,
}: {
  label: string;
  required?: boolean;
  addressName: string;
  detailName: string;
  postalName?: string;
  defaultAddress?: string;
  defaultDetail?: string;
  defaultPostal?: string;
  className?: string;
}) {
  const fieldId = useId();
  const detailRef = useRef<HTMLInputElement>(null);
  const [postal, setPostal] = useState(defaultPostal);
  const [base, setBase] = useState(defaultAddress);
  const [detail, setDetail] = useState(defaultDetail);
  const [scriptFailed, setScriptFailed] = useState(false);

  const openSearch = () => {
    if (typeof window === "undefined" || !window.daum?.Postcode) {
      window.alert(
        scriptFailed
          ? "주소 검색을 불러오지 못했습니다. 주소를 직접 입력해 주세요."
          : "주소 검색을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.",
      );
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

  return (
    <div className={cn("space-y-2", className)}>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
        onError={() => setScriptFailed(true)}
      />
      {postalName ? (
        <input type="hidden" name={postalName} value={postal} />
      ) : null}
      <input type="hidden" name={addressName} value={base} />

      <div className="flex items-end justify-between gap-2">
        <span className="text-xs font-medium">
          {label}
          {required ? " *" : ""}
        </span>
        <button
          type="button"
          onClick={openSearch}
          className="rounded-md border border-matchon-border px-2.5 py-1 text-xs font-semibold"
        >
          주소 검색
        </button>
      </div>

      <div className="flex gap-2">
        <input
          id={`${fieldId}-postal`}
          readOnly={!scriptFailed}
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
          placeholder="우편번호"
          className="w-28 rounded-md border border-matchon-border px-3 py-2 text-sm"
        />
        <input
          readOnly={!scriptFailed}
          value={base}
          onChange={(e) => setBase(e.target.value)}
          required={required}
          placeholder="기본 주소"
          className="min-w-0 flex-1 rounded-md border border-matchon-border px-3 py-2 text-sm"
        />
      </div>
      <input
        ref={detailRef}
        name={detailName}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="상세 주소"
        className="w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
      />
      {scriptFailed ? (
        <p className="text-[11px] text-matchon-text-secondary">
          주소 검색이 불가합니다. 직접 입력해 주세요.
        </p>
      ) : null}
    </div>
  );
}
