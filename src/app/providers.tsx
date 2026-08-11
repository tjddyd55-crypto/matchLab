"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { AppConfirmDialogProvider } from "@/components/shared/app-confirm-dialog";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AppConfirmDialogProvider>{children}</AppConfirmDialogProvider>
    </QueryClientProvider>
  );
}
