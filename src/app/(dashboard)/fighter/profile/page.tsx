import { requireActor } from "@/lib/auth/actor";
import { requireFighterDashboardReady } from "@/lib/auth/fighter-dashboard-gate";
import { fighterProfileService } from "@/lib/services/fighter-profile.service";
import { FighterProfileEditorForm } from "@/components/domain/fighters/FighterProfileEditorForm";

export const dynamic = "force-dynamic";

export default async function FighterProfilePage() {
  const actor = await requireActor();
  await requireFighterDashboardReady(actor);
  const editor = await fighterProfileService.getEditor(actor);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">내 프로필</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          공개 프로필에 표시할 소개와 SNS를 수정할 수 있습니다.
        </p>
      </div>
      <FighterProfileEditorForm editor={editor} />
    </div>
  );
}
