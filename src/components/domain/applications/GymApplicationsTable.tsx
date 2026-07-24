"use client";

import Link from "next/link";
import type { ApplicationStatus, PaymentStatus } from "@/generated/prisma";
import { ApplicationPaymentSummary } from "@/components/domain/applications/ApplicationPaymentSummary";
import { PaymentInstructionCard } from "@/components/domain/payments/PaymentInstructionCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPublicDate, formatPublicDateTime } from "@/lib/date-display";
import { Button } from "@/components/ui/button";
import { matchonCompactTableWrapClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export type GymApplicationListItemVM = {
  id: string;
  eventId: string;
  eventTitle: string;
  divisionLabel: string;
  fighterName: string;
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  appliedAt: string | null;
  createdAt: string;
  registrationEndDate: string;
  organizerDepositPerAthlete: number | null;
  gymAthleteFeeGuidance: number | null;
  hasPublicBrackets?: boolean;
  paymentInstruction: {
    feeAmount: number;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    depositorRule: string | null;
    paymentDueDate: string | null;
  } | null;
};

export function GymApplicationsTable({
  items,
}: {
  items: GymApplicationListItemVM[];
}) {
  const nf = new Intl.NumberFormat("ko-KR");

  return (
    <div className={cn(matchonCompactTableWrapClass, "hidden md:block")}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>대회</TableHead>
            <TableHead>선수</TableHead>
            <TableHead>경기구분</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>대진표</TableHead>
            <TableHead>신청일</TableHead>
            <TableHead className="text-right">입금 안내</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-[220px]">
                <div className="font-medium">{row.eventTitle}</div>
                <div className="text-muted-foreground text-xs">
                  접수 마감 {formatPublicDate(row.registrationEndDate)}
                </div>
              </TableCell>
              <TableCell>{row.fighterName}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                <div>{row.divisionLabel}</div>
                <div className="mt-1 text-[11px] leading-snug">
                  주최 입금{" "}
                  {row.organizerDepositPerAthlete != null
                    ? `${nf.format(row.organizerDepositPerAthlete)}원/인`
                    : "—"}
                  {" · "}
                  선수 안내{" "}
                  {row.gymAthleteFeeGuidance != null
                    ? `${nf.format(row.gymAthleteFeeGuidance)}원`
                    : "미설정"}
                </div>
              </TableCell>
              <TableCell>
                <ApplicationPaymentSummary
                  applicationStatus={row.applicationStatus}
                  paymentStatus={row.paymentStatus}
                />
              </TableCell>
              <TableCell className="text-xs">
                {row.hasPublicBrackets ? (
                  <Link
                    href={`/gym/brackets?eventId=${encodeURIComponent(row.eventId)}`}
                    className="font-medium text-matchon-primary underline-offset-2 hover:underline"
                  >
                    대진표 확인
                  </Link>
                ) : (
                  <span className="text-matchon-text-secondary">미공개</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {row.appliedAt
                  ? formatPublicDateTime(row.appliedAt)
                  : formatPublicDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                {row.paymentInstruction ? (
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button size="sm" variant="outline" type="button">
                          다시 보기
                        </Button>
                      }
                    />
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{row.eventTitle}</DialogTitle>
                      </DialogHeader>
                      <PaymentInstructionCard {...row.paymentInstruction} />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
