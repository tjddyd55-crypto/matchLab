import { cn } from "@/lib/utils";

export function FighterAvatar({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const initial = name.trim().charAt(0) || "?";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 동적 스토리지 URL
      <img
        src={src}
        alt=""
        className={cn("size-10 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full text-sm font-medium",
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
