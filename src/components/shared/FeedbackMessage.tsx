import { cn } from "@/lib/utils";

export type FeedbackTone = "success" | "error" | "warning" | "info";

const toneClasses: Record<FeedbackTone, string> = {
  success:
    "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
  error:
    "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15",
  warning:
    "border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100",
  info: "border-primary/30 bg-[var(--matchon-primary-light)] text-[var(--matchon-primary-dark)]",
};

export function FeedbackMessage({
  tone,
  children,
  className,
  role = "status",
}: {
  tone: FeedbackTone;
  children: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <p
      role={role}
      className={cn(
        "rounded-lg border px-4 py-2.5 text-sm leading-relaxed",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
