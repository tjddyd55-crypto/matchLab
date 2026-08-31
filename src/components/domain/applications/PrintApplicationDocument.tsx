"use client";

import { MatchonLogo } from "@/components/common/MatchonLogo";
import { Button } from "@/components/ui/button";

export function PrintApplicationDocument({
  title,
  eventTitle,
  gymName,
  fighterName,
  originalPdfFileName,
  previewValues,
  hasGeneratedPdf,
}: {
  title: string;
  eventTitle: string;
  gymName: string;
  fighterName: string;
  originalPdfFileName: string;
  previewValues: Record<string, string>;
  hasGeneratedPdf: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl bg-white px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <MatchonLogo variant="light" size="sm" />
        {/* PDF overlay 완료본이 있으면 문서 상세의 PDF를 사용 — snapshot 인쇄만 예외 유지 */}
        {!hasGeneratedPdf ? (
          <Button type="button" onClick={() => window.print()}>
            인쇄
          </Button>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-matchon-text-secondary print:hidden">
        {hasGeneratedPdf
          ? "완료 PDF가 생성되었습니다. 문서 상세에서 PDF 파일을 열어 주세요."
          : "PDF overlay가 아직 생성되지 않아 현재 화면을 출력할 수 있습니다."}
      </p>
      <article className="space-y-4 text-sm">
        <header className="border-b border-matchon-border pb-4">
          <MatchonLogo variant="light" size="sm" className="mb-3 hidden print:inline-flex" />
          <h1 className="text-xl font-bold text-matchon-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-matchon-text-secondary">{eventTitle}</p>
          <p className="mt-2 text-sm text-matchon-text-primary">
            {gymName} · {fighterName}
          </p>
          <p className="mt-2 text-xs text-matchon-text-secondary">
            원본 PDF: {originalPdfFileName}
          </p>
        </header>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {Object.entries(previewValues).map(([id, value]) => (
              <tr key={id} className="border-b border-matchon-border">
                <th className="w-1/3 py-2 pr-4 text-left font-semibold text-matchon-text-primary">
                  {id}
                </th>
                <td className="py-2 text-matchon-text-primary">{value || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
