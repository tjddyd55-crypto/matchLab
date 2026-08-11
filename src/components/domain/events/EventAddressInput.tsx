"use client";

import { useId, useState } from "react";
import Script from "next/script";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
          buildingName: string;
          apartment: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

const inputClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm";

const readOnlyInputClass =
  "border-input bg-muted/40 text-foreground h-9 w-full cursor-default rounded-md border px-3 text-sm shadow-sm read-only:opacity-100";

export function EventAddressInput({
  initial,
  namePrefix = "",
  fieldErrors,
}: {
  initial?: {
    postalCode?: string | null;
    roadAddress?: string | null;
    jibunAddress?: string | null;
    detailAddress?: string | null;
    locationName?: string | null;
    location?: string | null;
  };
  /** 폼에 필드명 접두사가 필요하면 지정 */
  namePrefix?: string;
  fieldErrors?: Record<string, string[]>;
}) {
  const { alert } = useAppConfirmDialog();
  const pk = (k: string) => (namePrefix ? `${namePrefix}${k}` : k);
  const fieldError = (name: string) => fieldErrors?.[name]?.[0];

  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [roadAddress, setRoadAddress] = useState(initial?.roadAddress ?? "");
  const [jibunAddress, setJibunAddress] = useState(initial?.jibunAddress ?? "");
  const [detailAddress, setDetailAddress] = useState(
    initial?.detailAddress ?? "",
  );
  const [locationName, setLocationName] = useState(
    initial?.locationName ?? "",
  );

  const fieldId = useId();

  const openSearch = () => {
    if (typeof window === "undefined" || !window.daum?.Postcode) {
      void alert({
        title: "알림",
        description:
          "주소 검색 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.",
      });
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const road = data.roadAddress?.trim() ?? "";
        setPostalCode(data.zonecode ?? "");
        setRoadAddress(road);
        setJibunAddress(data.jibunAddress?.trim() ?? "");
      },
    }).open();
  };

  const roadDisplay = roadAddress;

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-3">
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      <input type="hidden" name={pk("postalCode")} value={postalCode} />
      <input type="hidden" name={pk("jibunAddress")} value={jibunAddress} />
      <input type="hidden" name={pk("roadAddress")} value={roadAddress} />

      <div className="space-y-1">
        <span className="text-sm font-medium">개최 장소</span>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          주소는 검색으로 선택해 주세요. 상세 주소만 직접 입력해 주세요.
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground text-xs">장소명</span>
        <input
          id={`${fieldId}-loc-name`}
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          name={pk("locationName")}
          maxLength={200}
          placeholder="예: 올림픽공원 체조경기장, OO 체육관"
          className={inputClass}
          aria-invalid={Boolean(fieldError("locationName"))}
        />
        {fieldError("locationName") ? (
          <span className="text-destructive text-xs">
            {fieldError("locationName")}
          </span>
        ) : null}
      </label>

      <div className="space-y-1 text-sm">
        <span className="text-muted-foreground text-xs">주소</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            tabIndex={-1}
            value={roadDisplay}
            placeholder="주소 검색으로 선택해 주세요."
            className={cn(readOnlyInputClass, "sm:flex-1")}
            aria-readonly
            aria-invalid={Boolean(fieldError("roadAddress"))}
          />
          <button
            type="button"
            className={cn(
              "border-input bg-background inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-sm shadow-sm hover:bg-muted/50",
            )}
            onClick={openSearch}
          >
            주소 검색
          </button>
        </div>
        {fieldError("roadAddress") ? (
          <span className="text-destructive text-xs">
            {fieldError("roadAddress")}
          </span>
        ) : null}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground text-xs">상세 주소</span>
        <input
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          name={pk("detailAddress")}
          maxLength={300}
          placeholder="예: 1층, A동, 체육관 입구"
          className={inputClass}
          aria-invalid={Boolean(fieldError("detailAddress"))}
        />
        {fieldError("detailAddress") ? (
          <span className="text-destructive text-xs">
            {fieldError("detailAddress")}
          </span>
        ) : null}
      </label>
    </div>
  );
}
