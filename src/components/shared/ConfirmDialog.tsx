"use client";

/**
 * ConfirmDialog SSOT — Dialog 기본 dismissible=false 를 그대로 사용한다.
 * overlay / outside press 로 닫히지 않으며, 취소·확인·X·Escape 만 닫는다.
 *
 * Imperative API (권장): `useAppConfirmDialog()` from `@/components/shared/app-confirm-dialog`
 * Declarative trigger 패턴이 필요할 때만 이 컴포넌트를 사용한다.
 */
import type { ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm?: () => void | Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="whitespace-pre-line">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <DialogClose
            type="button"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={() => void onConfirm?.()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
