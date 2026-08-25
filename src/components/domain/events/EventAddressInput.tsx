"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  isDaumPostcodeReady,
  loadDaumPostcodeScript,
} from "@/lib/daum-postcode-loader";
import { cn } from "@/lib/utils";

const EMBED_HEIGHT_PX = 420;

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
  const [isOpen, setIsOpen] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const fieldId = useId();
  const embedRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDaumPostcodeReady()) {
      setScriptReady(true);
      return;
    }
    let cancelled = false;
    setScriptLoading(true);
    void loadDaumPostcodeScript()
      .then(() => {
        if (!cancelled) {
          setScriptReady(true);
          setScriptFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setScriptFailed(true);
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
        const road = data.roadAddress?.trim() ?? "";
        setPostalCode(data.zonecode ?? "");
        setRoadAddress(road);
        setJibunAddress(data.jibunAddress?.trim() ?? "");
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
    if (scriptFailed || !scriptReady) {
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

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-3">
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
            value={roadAddress}
            placeholder="주소를 검색해 주세요."
            className={cn(readOnlyInputClass, "sm:flex-1")}
            aria-readonly
            aria-invalid={Boolean(fieldError("roadAddress"))}
          />
          <button
            type="button"
            className={cn(
              "border-input bg-background inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-sm shadow-sm hover:bg-muted/50",
            )}
            aria-expanded={isOpen}
            onClick={() => void toggleSearch()}
          >
            {isOpen ? "주소 검색 닫기 ▲" : "주소 검색 ▼"}
          </button>
        </div>
        {isOpen ? (
          <div
            className="overflow-x-hidden rounded-md border bg-background"
            data-address-search-embed
          >
            {scriptLoading && !scriptReady ? (
              <p className="text-muted-foreground px-3 py-3 text-xs" role="status">
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
        {inlineError ? (
          <span className="text-muted-foreground text-xs" role="status">
            {inlineError}
          </span>
        ) : null}
        {fieldError("roadAddress") ? (
          <span className="text-destructive text-xs">
            {fieldError("roadAddress")}
          </span>
        ) : null}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground text-xs">상세 주소</span>
        <input
          ref={detailRef}
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
