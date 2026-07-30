import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/actor";
import { GymProfileMissingBanner } from "@/components/domain/gym/GymProfileMissingBanner";
import { GymGroupClassDetailApp } from "@/components/domain/gym-group-classes/GymGroupClassDetailApp";
import type { SerializableGymGroupClassVM } from "@/components/domain/gym-group-classes/GymGroupClassListApp";
import { resolveGymPortalAccess } from "@/lib/gym-portal-access";
import { AppError } from "@/lib/errors/app-error";
import { gymGroupClassService } from "@/lib/services/gym-group-class.service";
import { gymMemberService } from "@/lib/services/gym-member.service";
import { formatPhoneNumber } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import {
  matchonPageContainerClass,
  matchonPageStackClass,
} from "@/lib/ui/matchon-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GymGroupClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
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

  const { classId } = await params;
  const access = await resolveGymPortalAccess(actor);
  const isOwner = access.isOwner || actor.role === "admin";

  let detail;
  try {
    detail = await gymGroupClassService.getClass(actor, classId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  const { startsAt, endsAt, ...classRest } = detail.class;
  void startsAt;
  void endsAt;
  const gymClass: SerializableGymGroupClassVM = classRest;

  const participants = detail.participants.map((p) => ({
    ...p,
    respondedAt: p.respondedAt.toISOString(),
    cancelledAt: p.cancelledAt?.toISOString() ?? null,
  }));

  let staffOptions: Array<{
    id: string;
    name: string;
    title: string | null;
    colorKey: string | null;
  }> = [];
  if (isOwner) {
    const rows = await prisma.gymStaff.findMany({
      where: { gymId: access.gymId, deletedAt: null, isActive: true },
      select: { id: true, name: true, title: true, colorKey: true },
      orderBy: { name: "asc" },
    });
    staffOptions = rows;
  } else if (access.gymStaffId) {
    const self = await prisma.gymStaff.findFirst({
      where: { id: access.gymStaffId, gymId: access.gymId },
      select: { id: true, name: true, title: true, colorKey: true },
    });
    if (self) staffOptions = [self];
  }

  const membersPage = await gymMemberService.listMembers(actor, {
    pageSize: 100,
  });
  const memberOptions = membersPage.items.map((m) => ({
    id: m.id,
    name: m.name,
    memberNumber: m.memberNumber,
    phoneMasked: (() => {
      const digits = m.phone.replace(/\D/g, "");
      return digits.length >= 4
        ? `***-****-${digits.slice(-4)}`
        : formatPhoneNumber(m.phone);
    })(),
    status: m.status,
    profileImageUrl: m.profileImageUrl,
    primaryStaffName: null,
    planLabel: m.planName
      ? `${m.planName} · ${m.membershipStatusLabel}`
      : m.membershipStatusLabel,
  }));

  return (
    <div className={matchonPageContainerClass}>
      <div className={matchonPageStackClass}>
        <Link
          href="/gym/group-classes"
          className={cn(buttonVariants({ variant: "link", size: "sm" }), "w-fit px-0")}
        >
          ← 그룹수업 목록
        </Link>
        <GymGroupClassDetailApp
          gymClass={gymClass}
          participants={participants}
          canManage={detail.canManage}
          staffOptions={staffOptions}
          memberOptions={memberOptions}
          fixedStaffId={isOwner ? null : access.gymStaffId}
        />
      </div>
    </div>
  );
}
