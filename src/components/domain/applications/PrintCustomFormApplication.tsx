"use client";

import type { OrganizerApplicationPrintVM } from "@/lib/services/application.service";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import { Button } from "@/components/ui/button";
import { formatPublicDateTime } from "@/lib/date-display";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "미입금",
  paid: "입금완료",
  refunded: "환불",
};

export function PrintCustomFormApplication({
  data,
}: {
  data: OrganizerApplicationPrintVM;
}) {
  const appliedLabel = formatPublicDateTime(data.appliedAt);

  return (
    <div className="mx-auto max-w-3xl bg-white px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <MatchonLogo variant="light" size="sm" />
        <Button type="button" onClick={() => window.print()}>
          인쇄
        </Button>
      </div>

      <article className="space-y-6 text-sm">
        <header className="border-b border-matchon-border pb-4">
          <MatchonLogo variant="light" size="sm" className="mb-3 hidden print:inline-flex" />
          <h1 className="text-xl font-bold text-matchon-text-primary">
            {data.customFormSnapshot.templateTitle}
          </h1>
          <p className="mt-1 text-matchon-text-secondary">{data.eventTitle}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-matchon-text-secondary">선수명</dt>
              <dd className="font-medium text-matchon-text-primary">{data.fighterName}</dd>
            </div>
            <div>
              <dt className="text-xs text-matchon-text-secondary">체육관</dt>
              <dd className="text-matchon-text-primary">{data.gymName}</dd>
            </div>
            <div>
              <dt className="text-xs text-matchon-text-secondary">신청 경기구분</dt>
              <dd className="text-matchon-text-primary">{data.divisionLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-matchon-text-secondary">신청 상태</dt>
              <dd className="text-matchon-text-primary">
                {STATUS_LABELS[data.applicationStatus] ?? data.applicationStatus}
                {" · "}
                {PAYMENT_LABELS[data.paymentStatus] ?? data.paymentStatus}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-matchon-text-secondary">제출일</dt>
              <dd className="text-matchon-text-primary">{appliedLabel}</dd>
            </div>
          </dl>
        </header>

        <section>
          <h2 className="mb-3 text-base font-bold text-matchon-text-primary">신청서 답변</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {data.customFormSnapshot.answers.map((row) => (
                <tr key={row.id} className="border-b border-matchon-border">
                  <th className="w-1/3 py-2 pr-4 text-left align-top font-semibold text-matchon-text-primary">
                    {row.label}
                    {row.readonly ? (
                      <span className="block text-xs font-normal text-matchon-text-secondary">
                        (자동 입력)
                      </span>
                    ) : null}
                  </th>
                  <td className="whitespace-pre-wrap py-2 text-matchon-text-primary">
                    {row.value || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {data.agreementSnapshot ? (
          <section>
            <h2 className="mb-3 text-base font-bold text-matchon-text-primary">동의 내역</h2>
            <ul className="grid gap-1 text-sm text-matchon-text-primary">
              <AgreementRow label="대회 규정 동의" ok={data.agreementSnapshot.rulesAgreed} />
              <AgreementRow label="개인정보 동의" ok={data.agreementSnapshot.privacyAgreed} />
              <AgreementRow
                label="결과 공개 동의"
                ok={data.agreementSnapshot.resultDisclosureAgreed}
              />
              <AgreementRow
                label="사진·영상 동의"
                ok={data.agreementSnapshot.photoVideoAgreed}
              />
              {data.agreementSnapshot.streamingRequired ? (
                <AgreementRow
                  label="스트리밍 동의"
                  ok={data.agreementSnapshot.streamingAgreed}
                />
              ) : null}
              {data.agreementSnapshot.agreedAt ? (
                <li className="text-xs text-matchon-text-secondary">
                  동의 시각: {formatPublicDateTime(data.agreementSnapshot.agreedAt)}
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <footer className="border-t border-matchon-border pt-4 text-xs text-matchon-text-secondary">
          <p>주최자 확인용 출력</p>
          <p className="mt-1">본 문서는 시스템에 저장된 제출 스냅샷을 기준으로 합니다.</p>
        </footer>
      </article>
    </div>
  );
}

function AgreementRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li>
      {label}: {ok ? "동의함" : "미동의"}
    </li>
  );
}
