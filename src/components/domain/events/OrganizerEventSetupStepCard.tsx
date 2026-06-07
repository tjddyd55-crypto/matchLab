"use client";

import Link from "next/link";
import type { EventSetupStep } from "@/lib/organizer-event-setup";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function statusIcon(status: EventSetupStep["status"]): string {
  switch (status) {
    case "complete":
      return "✅";
    case "needed":
      return "⚠️";
    case "recommended":
      return "💡";
    case "review":
      return "⬜";
  }
}

function statusTone(status: EventSetupStep["status"]): string {
  switch (status) {
    case "complete":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "needed":
      return "border-amber-500/40 bg-amber-500/10";
    case "recommended":
      return "border-sky-500/30 bg-sky-500/5";
    case "review":
      return "border-border bg-card";
  }
}

export function OrganizerEventSetupStepCard({ step }: { step: EventSetupStep }) {
  const external = step.href.startsWith("/events/");

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 shadow-sm",
        statusTone(step.status),
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none" aria-hidden>
          {statusIcon(step.status)}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{step.title}</h3>
            <span className="text-muted-foreground text-xs">
              {step.statusLabel}
            </span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      <Link
        href={step.href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(
          buttonVariants({
            variant: step.status === "complete" ? "outline" : "default",
            size: "sm",
          }),
          "w-full justify-center sm:w-auto",
        )}
      >
        {step.actionLabel}
      </Link>
    </article>
  );
}
