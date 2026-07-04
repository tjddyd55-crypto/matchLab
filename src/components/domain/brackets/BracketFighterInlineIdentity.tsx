import { cn } from "@/lib/utils";

export function formatFighterInlineIdentity(
  gymName?: string | null,
  fighterName?: string | null,
): string {
  const gym = gymName?.trim();
  const fighter = fighterName?.trim();
  if (gym && fighter) return `${gym} · ${fighter}`;
  if (fighter) return fighter;
  if (gym) return gym;
  return "";
}

/** 체육관명 · 선수명 한 줄 표시 */
export function BracketFighterInlineIdentity({
  fighterName,
  gymName,
  fallbackText = "선수 미정",
  truncate = true,
  className,
}: {
  fighterName?: string | null;
  gymName?: string | null;
  fallbackText?: string;
  truncate?: boolean;
  className?: string;
}) {
  const text = formatFighterInlineIdentity(gymName, fighterName);

  return (
    <p
      className={cn(
        "text-sm font-semibold leading-tight",
        truncate && "truncate",
        !text && "text-muted-foreground font-normal",
        className,
      )}
    >
      {text || fallbackText}
    </p>
  );
}
