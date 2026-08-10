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
      <p className="text-[10px] font-medium leading-tight text-matchon-text-secondary">
        {label}
      </p>
      <p className="text-lg font-bold tracking-tight tabular-nums text-matchon-text-primary md:text-xl">
        {value}
      </p>
    </>
  );

  const classes = cn(
    "flex min-h-0 flex-col justify-center gap-0.5 rounded-md border border-matchon-border bg-white px-2.5 py-2 transition-colors",
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
