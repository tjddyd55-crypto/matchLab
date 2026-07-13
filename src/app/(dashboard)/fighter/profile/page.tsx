import { requireActor } from "@/lib/auth/actor";
import { requireFighterDashboardReady } from "@/lib/auth/fighter-dashboard-gate";
import { fighterProfileService } from "@/lib/services/fighter-profile.service";
import { FighterProfileEditorForm } from "@/components/domain/fighters/FighterProfileEditorForm";
import { matchonPageHeaderStackClass } from "@/lib/ui/matchon-shell-ui";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FighterProfilePage() {
  const actor = await requireActor();
  await requireFighterDashboardReady(actor);
  const editor = await fighterProfileService.getEditor(actor);

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-4xl")}>
        <header className={matchonPageHeaderStackClass}>
          <h1 className={matchonPageTitleClass}>내 프로필</h1>
          <p className={matchonPageDescClass}>
            프로필 사진, 자기소개, SNS 링크, 공개 설정을 관리합니다.
          </p>
        </header>
        <FighterProfileEditorForm editor={editor} />
      </div>
    </div>
  );
}
