"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GymMemberFormSection({
  title,
  badge,
  badgeClassName,
  children,
  className,
  subtleBg,
}: {
  title: string;
  badge?: string;
  badgeClassName?: string;
  children: ReactNode;
  className?: string;
  subtleBg?: boolean;
}) {
  return (
    <section
      className={cn(
        "space-y-3",
        subtleBg &&
          "rounded-lg border border-matchon-border bg-matchon-surface/40 p-3 md:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-matchon-text-primary">
          {title}
        </h2>
        {badge ? (
          <span
            className={cn(
              "rounded-full bg-matchon-primary-light px-2 py-0.5 text-[11px] font-medium text-matchon-primary",
              badgeClassName,
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className="border-b border-matchon-border" />
      {children}
    </section>
  );
}

export function GymMemberCompactGrid({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid gap-3", colClass, className)}>{children}</div>
  );
}

export function GymMemberFieldLabel({
  label,
  required,
  helpText,
}: {
  label: string;
  required?: boolean;
  helpText?: string;
}) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs font-medium text-matchon-text-secondary">
        {label}
        {required ? " *" : ""}
      </span>
      {helpText ? (
        <p className="text-[11px] text-matchon-text-secondary/90">{helpText}</p>
      ) : null}
    </div>
  );
}

export function GymMemberStickyActionBar({
  pending,
  submitLabel = "저장",
}: {
  pending?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-matchon-border bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:-mx-0 md:rounded-lg md:border md:px-4">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-lg border border-matchon-border px-4 text-sm font-medium"
          onClick={() => window.history.back()}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-9 items-center rounded-lg bg-matchon-primary px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "저장 중…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
