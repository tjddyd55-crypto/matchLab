"use client";

import { createContext, useContext } from "react";

const OnsiteOpsTokenContext = createContext<string | null>(null);

export function OnsiteOpsTokenProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return (
    <OnsiteOpsTokenContext.Provider value={token}>
      {children}
    </OnsiteOpsTokenContext.Provider>
  );
}

export function useOnsiteOpsToken(): string | null {
  return useContext(OnsiteOpsTokenContext);
}

export function appendOnsiteOpsToken(
  formData: FormData,
  opsToken: string | null | undefined,
): FormData {
  if (opsToken?.trim()) {
    formData.set("opsToken", opsToken.trim());
  }
  return formData;
}
