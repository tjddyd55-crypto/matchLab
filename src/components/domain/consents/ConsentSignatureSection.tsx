"use client";

import type { RefObject } from "react";

import type { SignaturePadHandle } from "@/components/shared/SignaturePad";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { Button } from "@/components/ui/button";

export function ConsentSignatureSection({
  padRef,
}: {
  padRef: RefObject<SignaturePadHandle | null>;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-medium text-sm">법정대리인 서명</h3>
      <SignaturePad ref={padRef} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => padRef.current?.clear()}
      >
        서명 지우기
      </Button>
    </section>
  );
}
