import Link from "next/link";
import type { FighterUnifiedPublicProfile } from "@/lib/fighter-unified-profile/types";

export function FighterPublicProfileLink({
  profile,
  className,
}: {
  profile: FighterUnifiedPublicProfile;
  className?: string;
}) {
  if (!profile.href) return null;
  return (
    <Link
      href={profile.href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "text-sm font-medium text-matchon-primary underline underline-offset-2"
      }
    >
      공개 프로필 보기
    </Link>
  );
}
