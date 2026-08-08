import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { PermissionError } from "@/lib/auth/permission-error";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { gymMemberGroupService } from "@/lib/services/gym-member-group.service";
import { GymMemberEditForm } from "@/components/domain/gym-members/GymMemberEditForm";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { buttonVariants } from "@/components/ui/button";
import {
  matchonPageContainerClass,
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
} from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymMemberEditPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const actor = await requireActor();
  const { memberId } = await params;

  if (!actor.gymId) {
    return (
      <div className={matchonPageContainerClass}>
        <div className={matchonPageStackClass}>
          <GymProfileMissingBanner />
        </div>
      </div>
    );
  }

  let detail;
  let groups;
  let assignments;
  try {
    [detail, groups, assignments] = await Promise.all([
      gymMemberService.getMemberDetail(actor, memberId),
      gymMemberGroupService.listGroups(actor, false),
      gymMemberGroupService.listMemberAssignments(actor, memberId),
    ]);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    if (e instanceof AppError && e.code === "FORBIDDEN") notFound();
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { member } = detail;

  return (
    <div className={matchonPageContainerClass}>
      <div className={cn(matchonPageStackClass, "max-w-5xl")}>
        <div className="min-w-0">
          <Link
            href={`/gym/members/${member.id}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2",
            )}
          >
            ← {member.name}
          </Link>
          <h1 className={matchonPageTitleClass}>회원 정보 수정</h1>
          <p className={cn(matchonPageDescClass, "font-mono text-xs")}>
            {member.memberNumber}
          </p>
        </div>

        <GymMemberEditForm
          memberId={member.id}
          profileImageUrl={detail.profileImageUrl}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          initial={{
            name: member.name,
            phone: member.phone,
            joinedAt: member.joinedAt,
            birthDate: member.birthDate,
            gender: member.gender,
            email: member.email,
            postalCode: member.postalCode,
            address: member.address,
            addressDetail: member.addressDetail,
            emergencyContactName: member.emergencyContactName,
            emergencyContactPhone: member.emergencyContactPhone,
            guardianName: member.guardianName,
            guardianPhone: member.guardianPhone,
            primarySport: member.primarySport,
            rankName: member.rankName,
            memo: member.memo,
            smsOptOut: member.smsOptOut,
            groupIds: assignments.map((a) => a.groupId),
          }}
        />
      </div>
    </div>
  );
}
