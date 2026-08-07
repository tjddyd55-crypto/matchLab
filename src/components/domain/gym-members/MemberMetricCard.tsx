import Link from "next/link";
import { cn } from "@/lib/utils";

export function MemberMetricCard({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: number | string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium text-matchon-text-secondary">
        {label}
      </p>
      <p className="text-[22px] font-bold tracking-tight text-matchon-text-primary">
        {value}
      </p>
      {href ? (
        <p className="text-[10px] text-matchon-primary">목록 필터 →</p>
      ) : null}
    </>
  );

  const classes = cn(
    "flex min-h-[88px] flex-col gap-1 rounded-[10px] border border-matchon-border bg-white p-3.5 transition-colors",
    href &&
      "hover:border-matchon-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${label} ${value}`}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
