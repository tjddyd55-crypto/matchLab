"use client";

import { Button } from "@/components/ui/button";
import type { BuiltInFormSnapshot } from "@/lib/built-in-form/built-in-form-types";

export function PrintApplicationDocument({
  title,
  eventTitle,
  gymName,
  fighterName,
  originalPdfFileName,
  previewValues,
  hasGeneratedPdf,
  isBuiltInForm,
  builtInSnapshot,
}: {
  title: string;
  eventTitle: string;
  gymName: string;
  fighterName: string;
  originalPdfFileName: string | null;
  previewValues: Record<string, string>;
  hasGeneratedPdf: boolean;
  isBuiltInForm?: boolean;
  builtInSnapshot?: BuiltInFormSnapshot | null;
}) {
  const rows = isBuiltInForm && builtInSnapshot
    ? Object.entries(builtInSnapshot.values).map(([id, value]) => ({
        label: builtInSnapshot.fieldLabels[id] ?? id,
        value,
      }))
    : Object.entries(previewValues).map(([id, value]) => ({
        label: id,
        value,
      }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          인쇄
        </Button>
      </div>
      <p className="text-muted-foreground mb-4 text-xs print:hidden">
        {isBuiltInForm
          ? "이 신청서는 자체 웹 신청폼으로 제출되었습니다. 공식 PDF 원본은 없습니다."
          : hasGeneratedPdf
            ? "완료 PDF가 생성되었습니다. 문서 상세에서 PDF 파일을 열 수 있습니다."
            : "PDF overlay가 아직 생성되지 않은 경우 현재 화면을 출력할 수 있습니다."}
      </p>
      <article className="space-y-4 text-sm">
        <header className="border-b pb-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1">{eventTitle}</p>
          <p className="mt-2">
            {gymName} · {fighterName}
          </p>
          {!isBuiltInForm && originalPdfFileName ? (
            <p className="text-muted-foreground mt-2 text-xs">
              원본 PDF: {originalPdfFileName}
            </p>
          ) : null}
        </header>
        <table className="w-full border-collapse">
          <tbody>
            {rows.map(({ label, value }) => (
              <tr key={label} className="border-b">
                <th className="w-1/3 py-2 pr-4 text-left font-medium">{label}</th>
                <td className="py-2">{value || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
