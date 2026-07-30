import { requireActor } from "@/lib/auth/actor";
import { GymMemberPortalOwnerManager } from "@/components/domain/gym-member-portal/GymMemberPortalOwnerManager";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { gymMemberPortalService } from "@/lib/services/gym-member-portal.service";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";

export const dynamic = "force-dynamic";

export default async function GymMemberPortalOwnerPage() {
  const actor = await requireActor();
  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  let state: Awaited<
    ReturnType<typeof gymMemberPortalService.getOwnerPortalState>
  > | null = null;
  let errorMessage: string | null = null;
  try {
    state = await gymMemberPortalService.getOwnerPortalState(actor);
  } catch (e) {
    errorMessage =
      e instanceof AppError || e instanceof PermissionError
        ? e.message
        : "접근할 수 없습니다.";
  }

  if (!state) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <h1 className={matchonPageTitleClass}>회원 전용 페이지</h1>
          <p className="text-sm text-red-600">
            {errorMessage ?? "접근할 수 없습니다."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <h1 className={matchonPageTitleClass}>회원 전용 페이지</h1>
          <p className={matchonPageDescClass}>
            회원에게 전달할 전용 링크를 만들고 QR로 공유할 수 있습니다.
          </p>
        </div>
        <GymMemberPortalOwnerManager
          gymName={state.gymName}
          initialPortal={state.portal}
        />
      </div>
    </div>
  );
}
