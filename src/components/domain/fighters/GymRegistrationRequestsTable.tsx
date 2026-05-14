import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { GymRegistrationRequestListItem } from "@/lib/services/registration.service";
import { RegistrationStatusBadge } from "@/components/domain/fighters/RegistrationStatusBadge";
import { RegistrationRequestActions } from "@/components/domain/fighters/RegistrationRequestActions";
import { ConsentStatusBadge } from "@/components/domain/consents/ConsentStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function GymRegistrationRequestsTable({
  items,
}: {
  items: GymRegistrationRequestListItem[];
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>생년(마스킹)</TableHead>
            <TableHead>성별</TableHead>
            <TableHead>휴대폰</TableHead>
            <TableHead>동의</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>제출일</TableHead>
            <TableHead className="text-right">처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.birthYearMasked}</TableCell>
              <TableCell>{r.gender}</TableCell>
              <TableCell className="font-mono text-xs">{r.phoneMasked}</TableCell>
              <TableCell>
                <ConsentStatusBadge label={r.consentLabel} kind={r.consentKind} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  <RegistrationStatusBadge status={r.status} />
                  {r.duplicateReviewFlow ? (
                    <span className="text-amber-700 text-xs dark:text-amber-400">
                      중복 의심
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {format(parseISO(r.submittedAtIso), "yyyy.MM.dd HH:mm", {
                  locale: ko,
                })}
              </TableCell>
              <TableCell className="text-right">
                <RegistrationRequestActions
                  submissionId={r.id}
                  status={r.status}
                  consentCopyAbsoluteUrl={r.consentCopyAbsoluteUrl}
                  approvalBlockedByConsent={r.approvalBlockedByConsent}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
