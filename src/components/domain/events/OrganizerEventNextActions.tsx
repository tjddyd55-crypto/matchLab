"use client";

import Link from "next/link";
import type { EventSetupNextAction } from "@/lib/organizer-event-setup";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OrganizerEventNextActions({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions: EventSetupNextAction[];
}) {
  if (actions.length === 0) return null;

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? (
          <p className="text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
        ) : null}
      </div>

      <ol className="mt-4 space-y-3">
        {actions.map((action, index) => {
          const external = action.href.startsWith("/events/");
          return (
            <li
              key={action.stepId}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {index + 1}. {action.title}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {action.description}
                </p>
              </div>
              <Link
                href={action.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "w-full shrink-0 justify-center sm:w-auto",
                )}
              >
                {action.actionLabel}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
