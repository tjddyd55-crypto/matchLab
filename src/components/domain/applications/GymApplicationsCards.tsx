"use client";

import Link from "next/link";
import { ApplicationPaymentSummary } from "@/components/domain/applications/ApplicationPaymentSummary";
import type { GymApplicationListItemVM } from "@/components/domain/applications/GymApplicationsTable";
import { PaymentInstructionCard } from "@/components/domain/payments/PaymentInstructionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPublicDate, formatPublicDateTime } from "@/lib/date-display";
import { matchonCardStackClass } from "@/lib/ui/matchon-layout";
import { matchonMobileCardListClass } from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";

export function GymApplicationsCards({
  items,
}: {
  items: GymApplicationListItemVM[];
}) {
  return (
    <div className={cn(matchonMobileCardListClass, matchonCardStackClass)}>
      {items.map((row) => (
        <Card key={row.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base leading-snug">
              {row.eventTitle}
            </CardTitle>
            <div className="text-muted-foreground text-xs">
              접수 마감 {formatPublicDate(row.registrationEndDate)}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">선수</span>
              <span className="font-medium">{row.fighterName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">경기구분</span>
              <span className="text-right text-xs">{row.divisionLabel}</span>
            </div>
            <ApplicationPaymentSummary
              applicationStatus={row.applicationStatus}
              paymentStatus={row.paymentStatus}
            />
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-muted-foreground">대진표</span>
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
            </div>
            <div className="text-muted-foreground text-xs">
              신청{" "}
              {row.appliedAt
                ? formatPublicDateTime(row.appliedAt)
                : formatPublicDateTime(row.createdAt)}
            </div>
            {row.paymentInstruction ? (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button type="button" variant="outline" size="field" className="w-full">
                      입금 안내 다시 보기
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
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
