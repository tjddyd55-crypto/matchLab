"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  SalesEntryModal,
  type SalesEntryProductOption,
} from "@/components/domain/gym-sales/SalesEntryModal";
import { GymMemberManualAttendanceDialog } from "@/components/domain/gym-members/GymMemberManualAttendanceDialog";
import { cn } from "@/lib/utils";

export function GymMemberOpsActionBar({
  memberId,
  memberName,
  canWriteMembers,
  canManageSales,
  products,
  selfRegistrationHref,
}: {
  memberId: string;
  memberName: string;
  canWriteMembers: boolean;
  canManageSales: boolean;
  products: SalesEntryProductOption[];
  selfRegistrationHref?: string | null;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {canWriteMembers ? (
          <Link
            href={`/gym/members/${memberId}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-9",
            )}
          >
            수정
          </Link>
        ) : null}
        {canWriteMembers ? (
          <Link
            href={`/gym/members/${memberId}?tab=membership&op=sale`}
            className={cn(buttonVariants({ size: "sm" }), "min-h-9")}
          >
            이용권 등록
          </Link>
        ) : null}
        {canManageSales ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={() => setPaymentOpen(true)}
          >
            결제
          </Button>
        ) : null}
        {canWriteMembers ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={() => setAttendanceOpen(true)}
          >
            출석 처리
          </Button>
        ) : null}
        {selfRegistrationHref ? (
          <Link
            href={selfRegistrationHref}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "min-h-9",
            )}
          >
            가입 신청서
          </Link>
        ) : null}
      </div>

      {canManageSales ? (
        <SalesEntryModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          members={[{ id: memberId, name: memberName }]}
          products={products}
          defaultMemberId={memberId}
        />
      ) : null}

      {canWriteMembers ? (
        <GymMemberManualAttendanceDialog
          open={attendanceOpen}
          onOpenChange={setAttendanceOpen}
          memberId={memberId}
          memberName={memberName}
        />
      ) : null}
    </>
  );
}
