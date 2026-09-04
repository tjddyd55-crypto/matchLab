"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** 우측 슬라이드 패널 형태의 상세 Drawer (Dialog shell 기반). */
export function DrawerPanel({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible>
      <DialogContent
        layout="shell"
        showCloseButton
        className={cn(
          "fixed top-0 right-0 left-auto h-full max-h-none w-full max-w-md translate-x-0 translate-y-0 rounded-none rounded-l-xl border-l sm:max-w-md",
          "data-open:slide-in-from-right data-closed:slide-out-to-right",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle className="break-words pr-8">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="break-words">
              {description}
            </DialogDescription>
          ) : null}
          {headerExtra ? (
            <div className="mt-2 flex flex-wrap gap-1.5">{headerExtra}</div>
          ) : null}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
