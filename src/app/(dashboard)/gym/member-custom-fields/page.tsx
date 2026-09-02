import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { GymMemberCustomFieldBuilder } from "@/components/domain/gym-members/GymMemberCustomFieldBuilder";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { EnableKickboxingTemplatePanel } from "@/components/domain/gym-members/EnableKickboxingTemplatePanel";
import { buttonVariants } from "@/components/ui/button";
import { gymMemberCustomFieldService } from "@/lib/services/gym-member-custom-field.service";
import { gymMemberProfileService } from "@/lib/services/gym-member-profile.service";
import { prisma } from "@/lib/prisma";
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

  const [fields, formCtx, gym, valueUsage] = await Promise.all([
    gymMemberCustomFieldService.listFields(actor, true),
    gymMemberProfileService.getGymFormContext(actor),
    prisma.gym.findUnique({
      where: { id: actor.gymId },
      select: { memberSportTemplateId: true },
    }),
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

        {!gym?.memberSportTemplateId ? (
          <EnableKickboxingTemplatePanel />
        ) : formCtx.sportTemplate ? (
          <p className="rounded-lg border border-matchon-border bg-matchon-surface/50 px-3 py-2 text-sm text-matchon-text-secondary">
            종목 템플릿:{" "}
            <span className="font-medium text-matchon-text-primary">
              {formCtx.sportTemplate.name}
            </span>
            · 종목 필드는 시스템 템플릿으로 관리됩니다.
          </p>
        ) : null}

        <GymMemberCustomFieldBuilder
          initialFields={fields}
          valueUsage={valueUsage}
        />
      </div>
    </div>
  );
}
