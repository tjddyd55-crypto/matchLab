import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FighterAvatar } from "@/components/shared/FighterAvatar";
import type { PublicFighterCardDTO } from "@/lib/dto/public";

export function MatchCard({
  red,
  blue,
  title,
}: {
  red: PublicFighterCardDTO | null;
  blue: PublicFighterCardDTO | null;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title ?? "경기"}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {red ? (
            <>
              <FighterAvatar src={red.profileImageUrl} name={red.displayName} />
              <span className="truncate text-sm font-medium">{red.displayName}</span>
            </>
          ) : (
            <span className="text-muted-foreground text-sm">TBD</span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">VS</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {blue ? (
            <>
              <span className="truncate text-sm font-medium">{blue.displayName}</span>
              <FighterAvatar src={blue.profileImageUrl} name={blue.displayName} />
            </>
          ) : (
            <span className="text-muted-foreground text-sm">TBD</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
