import { Badge } from "@/components/ui/badge";

export type FighterProfileStatus =
  | "no_account"
  | "no_profile"
  | "draft"
  | "public"
  | "private";

export function resolveFighterProfileStatus(input: {
  userId: string | null;
  hasFighterProfile: boolean;
  profileIsPublic: boolean;
}): FighterProfileStatus {
  if (!input.userId) return "no_account";
  if (!input.hasFighterProfile) return "no_profile";
  return input.profileIsPublic ? "public" : "private";
}

const STATUS_CONFIG: Record<
  FighterProfileStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  no_account: { label: "계정 발급 필요", variant: "outline" },
  no_profile: { label: "프로필 미작성", variant: "secondary" },
  draft: { label: "작성됨", variant: "secondary" },
  public: { label: "공개 ON", variant: "default" },
  private: { label: "공개 OFF", variant: "outline" },
};

export function FighterProfileStatusBadge({
  status,
  className,
}: {
  status: FighterProfileStatus;
  className?: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}
