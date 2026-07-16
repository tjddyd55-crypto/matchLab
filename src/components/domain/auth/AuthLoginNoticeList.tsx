import { authLoginNoticeListClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export type AuthLoginNoticeListProps = {
  items: readonly string[];
  className?: string;
};

export function AuthLoginNoticeList({
  items,
  className,
}: AuthLoginNoticeListProps) {
  if (items.length === 0) return null;
  return (
    <ul className={cn(authLoginNoticeListClass, className)}>
      {items.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
