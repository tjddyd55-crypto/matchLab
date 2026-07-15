"use client";

import { useRef, useState } from "react";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/shared/SignaturePad";
import { cn } from "@/lib/utils";

export function MemberGymSignatureField({
  onChange,
  className,
}: {
  onChange: (dataUrl: string | null) => void;
  className?: string;
}) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function confirm() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      onChange(null);
      setConfirmed(false);
      return;
    }
    const blob = await pad.toBlob();
    if (!blob) {
      onChange(null);
      setConfirmed(false);
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("서명 읽기 실패"));
      reader.readAsDataURL(blob);
    });
    setConfirmed(true);
    onChange(dataUrl);
  }

  function clear() {
    padRef.current?.clear();
    setConfirmed(false);
    onChange(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-matchon-border bg-white",
          confirmed ? "ring-2 ring-matchon-primary/40" : null,
        )}
        style={{ touchAction: "none" }}
        onPointerDown={() => {
          if (confirmed) {
            setConfirmed(false);
            onChange(null);
          }
        }}
      >
        <SignaturePad ref={padRef} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-matchon-border px-3 py-1.5 text-xs font-semibold"
        >
          다시 쓰기
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          className="rounded-md bg-matchon-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          서명 완료
        </button>
        {confirmed ? (
          <span className="self-center text-xs text-matchon-primary">
            서명 완료됨
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, body] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/png";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}
