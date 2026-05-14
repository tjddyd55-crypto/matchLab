import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  variant = "secondary",
  className,
}: {
  label: ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}) {
  return (
    <Badge variant={variant} className={cn("font-normal", className)}>
      {label}
    </Badge>
  );
}
