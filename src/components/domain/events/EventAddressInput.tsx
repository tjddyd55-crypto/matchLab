"use client";

import { useId, useState } from "react";
import Script from "next/script";
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

function composeLine(parts: {
  roadAddress: string;
  detailAddress: string;
  locationName: string;
}): string {
  const road = parts.roadAddress.trim();
  const detail = parts.detailAddress.trim();
  const name = parts.locationName.trim();
  const base = [road, detail].filter(Boolean).join(", ");
  if (name && base) return `${name} — ${base}`;
  return name || base || "";
}

export function EventAddressInput({
  initial,
  namePrefix = "",
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
}) {
  const pk = (k: string) => (namePrefix ? `${namePrefix}${k}` : k);

  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [roadAddress, setRoadAddress] = useState(initial?.roadAddress ?? "");
  const [jibunAddress, setJibunAddress] = useState(initial?.jibunAddress ?? "");
  const [detailAddress, setDetailAddress] = useState(
    initial?.detailAddress ?? "",
  );
  const [locationName, setLocationName] = useState(
    initial?.locationName ?? "",
  );
  const [composedLocation, setComposedLocation] = useState(
    initial?.location?.trim() ??
      composeLine({
        roadAddress: initial?.roadAddress ?? "",
        detailAddress: initial?.detailAddress ?? "",
        locationName: initial?.locationName ?? "",
      }),
  );

  const applyComposed = (next: {
    roadAddress: string;
    detailAddress: string;
    locationName: string;
  }) => {
    setComposedLocation(composeLine(next));
  };

  const fieldId = useId();

  const openSearch = () => {
    if (typeof window === "undefined" || !window.daum?.Postcode) {
      window.alert("주소 검색 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const road = data.roadAddress?.trim() ?? "";
        setPostalCode(data.zonecode ?? "");
        setRoadAddress(road);
        setJibunAddress(data.jibunAddress?.trim() ?? "");
        applyComposed({
          roadAddress: road,
          detailAddress,
          locationName,
        });
      },
    }).open();
  };

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-3">
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      <input type="hidden" name={pk("postalCode")} value={postalCode} readOnly />
      <input type="hidden" name={pk("jibunAddress")} value={jibunAddress} readOnly />
      <input type="hidden" name={pk("roadAddress")} value={roadAddress} readOnly />
      <input type="hidden" name={pk("location")} value={composedLocation} readOnly />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">개최 장소</span>
        <button
          type="button"
          className={cn(
            "border-input bg-background inline-flex h-9 items-center rounded-md border px-3 text-sm shadow-sm",
          )}
          onClick={openSearch}
        >
          다음 우편번호로 주소 검색
        </button>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground text-xs">장소명 (선택)</span>
        <input
          id={`${fieldId}-loc-name`}
          value={locationName}
          onChange={(e) => {
            const v = e.target.value;
            setLocationName(v);
            applyComposed({ roadAddress, detailAddress, locationName: v });
          }}
          name={pk("locationName")}
          maxLength={200}
          placeholder="예: OO 체육관"
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>

      <div className="text-muted-foreground space-y-1 text-xs">
        <div>
          <span className="font-medium text-foreground">우편번호</span>{" "}
          {postalCode || "—"}
        </div>
        <div>
          <span className="font-medium text-foreground">도로명</span>{" "}
          {roadAddress || "주소 검색으로 선택해 주세요."}
        </div>
        {jibunAddress ? (
          <div>
            <span className="font-medium text-foreground">지번</span> {jibunAddress}
          </div>
        ) : null}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground text-xs">상세 주소</span>
        <input
          value={detailAddress}
          onChange={(e) => {
            const v = e.target.value;
            setDetailAddress(v);
            applyComposed({ roadAddress, detailAddress: v, locationName });
          }}
          name={pk("detailAddress")}
          maxLength={300}
          placeholder="동·호수·층 등"
          className={cn(
            "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-sm",
          )}
        />
      </label>

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        저장 시 도로명 주소와 상세 주소가 조합되어 장소 정보로 저장됩니다. 공개
        전까지 비워 두어도 되며, 공개(OPEN) 전에는 주소가 필요합니다.
      </p>
    </div>
  );
}
