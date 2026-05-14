import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FighterAvatar } from "@/components/shared/FighterAvatar";
import type { PublicFighterCardDTO } from "@/lib/dto/public";

export function FighterCard({ fighter }: { fighter: PublicFighterCardDTO }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <FighterAvatar src={fighter.profileImageUrl} name={fighter.displayName} />
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate text-base">{fighter.displayName}</CardTitle>
          <p className="text-muted-foreground truncate text-xs">
            {fighter.gymName ?? "소속 미상"} · {fighter.fighterCode}
          </p>
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-foreground font-semibold">{fighter.recordWin}</div>
          승
        </div>
        <div>
          <div className="text-foreground font-semibold">{fighter.recordLoss}</div>
          패
        </div>
        <div>
          <div className="text-foreground font-semibold">{fighter.recordDraw}</div>
          무
        </div>
      </CardContent>
    </Card>
  );
}
