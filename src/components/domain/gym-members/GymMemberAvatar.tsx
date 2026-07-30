import { cn } from "@/lib/utils";

/**
 * 회원 프로필 사진 표시.
 * private 버킷이므로 `src`는 서버에서 발급한 signed read URL만 받는다.
 * 값이 없거나 만료된 경우 이니셜 fallback으로 렌더한다.
 */
export function GymMemberAvatar({
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
      // eslint-disable-next-line @next/next/no-img-element -- 만료되는 signed URL
      <img
        src={src}
        alt=""
        className={cn("size-10 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-matchon-surface text-sm font-medium text-matchon-text-secondary",
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
