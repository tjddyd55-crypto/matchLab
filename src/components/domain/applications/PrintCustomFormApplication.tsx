"use client";

import type { OrganizerApplicationPrintVM } from "@/lib/services/application.service";
import { Button } from "@/components/ui/button";

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
  const appliedLabel = new Date(data.appliedAt).toLocaleString("ko-KR");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          인쇄
        </Button>
      </div>

      <article className="space-y-6 text-sm">
        <header className="border-b pb-4">
          <h1 className="text-xl font-semibold">{data.customFormSnapshot.templateTitle}</h1>
          <p className="text-muted-foreground mt-1">{data.eventTitle}</p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">선수명</dt>
              <dd className="font-medium">{data.fighterName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">체육관</dt>
              <dd>{data.gymName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">신청 부문</dt>
              <dd>{data.divisionLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">신청 상태</dt>
              <dd>
                {STATUS_LABELS[data.applicationStatus] ?? data.applicationStatus}
                {" · "}
                {PAYMENT_LABELS[data.paymentStatus] ?? data.paymentStatus}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">제출일</dt>
              <dd>{appliedLabel}</dd>
            </div>
          </dl>
        </header>

        <section>
          <h2 className="mb-3 text-base font-semibold">신청서 답변</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {data.customFormSnapshot.answers.map((row) => (
                <tr key={row.id} className="border-b">
                  <th className="w-1/3 py-2 pr-4 text-left align-top font-medium">
                    {row.label}
                    {row.readonly ? (
                      <span className="text-muted-foreground block text-xs font-normal">
                        (자동 입력)
                      </span>
                    ) : null}
                  </th>
                  <td className="py-2 whitespace-pre-wrap">{row.value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {data.agreementSnapshot ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">동의 내역</h2>
            <ul className="grid gap-1 text-sm">
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
                <li className="text-muted-foreground text-xs">
                  동의 시각:{" "}
                  {new Date(data.agreementSnapshot.agreedAt).toLocaleString("ko-KR")}
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          <p>주최자 확인용 출력 · {new Date().toLocaleString("ko-KR")}</p>
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
