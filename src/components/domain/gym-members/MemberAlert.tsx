import { cn } from "@/lib/utils";

export function MemberAlert({
  tone,
  children,
  className,
}: {
  tone: "warning" | "danger" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-xs font-medium sm:text-[12px]",
        tone === "warning" && "border-amber-500 bg-amber-50 text-amber-900",
        tone === "danger" && "border-matchon-danger bg-red-50 text-matchon-danger",
        tone === "info" &&
          "border-matchon-primary bg-matchon-primary-light text-matchon-primary-dark",
        className,
      )}
    >
      {children}
    </div>
  );
}
