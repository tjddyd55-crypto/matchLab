import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymMemberCustomFieldBuilder } from "@/components/domain/gym-members/GymMemberCustomFieldBuilder";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { GymSportTemplateSettingsPanel } from "@/components/domain/gym-members/GymSportTemplateSettingsPanel";
import { buttonVariants } from "@/components/ui/button";
import { gymMemberCustomFieldService } from "@/lib/services/gym-member-custom-field.service";
import { gymMemberProfileService } from "@/lib/services/gym-member-profile.service";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymMemberCustomFieldsPage() {
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

  const [fields, assignableTemplates, valueUsage] = await Promise.all([
    gymMemberCustomFieldService.listFields(actor, true),
    gymMemberProfileService.listAssignableTemplatesForGym(actor),
    gymMemberCustomFieldService.getValueUsageMap(actor),
  ]);

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <div className="min-w-0">
          <Link
            href="/gym/members"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← 전체 회원
          </Link>
          <h1 className={matchonPageTitleClass}>회원 추가 항목 설정</h1>
          <p className={matchonPageDescClass}>
            체육관별로 회원 등록·수정 화면에 표시할 추가 항목을 관리합니다.
          </p>
        </div>

        <GymSportTemplateSettingsPanel options={assignableTemplates} />

        <GymMemberCustomFieldBuilder
          initialFields={fields}
          valueUsage={valueUsage}
        />
      </div>
    </div>
  );
}
