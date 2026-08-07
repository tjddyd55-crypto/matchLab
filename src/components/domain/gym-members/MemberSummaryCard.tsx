import { cn } from "@/lib/utils";

export function MemberSummaryCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[10px] border border-matchon-border bg-white p-3.5",
        className,
      )}
    >
      <p className="text-[11px] font-medium text-matchon-text-secondary">
        {label}
      </p>
      <p className="mt-1 truncate text-[15px] font-bold text-matchon-text-primary">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 truncate text-xs text-matchon-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
