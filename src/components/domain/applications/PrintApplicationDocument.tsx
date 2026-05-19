"use client";

import { Button } from "@/components/ui/button";

export function PrintApplicationDocument({
  title,
  eventTitle,
  gymName,
  fighterName,
  previewValues,
}: {
  title: string;
  eventTitle: string;
  gymName: string;
  fighterName: string;
  previewValues: Record<string, string>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          인쇄
        </Button>
      </div>
      <article className="space-y-4 text-sm">
        <header className="border-b pb-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1">{eventTitle}</p>
          <p className="mt-2">
            {gymName} · {fighterName}
          </p>
        </header>
        <table className="w-full border-collapse">
          <tbody>
            {Object.entries(previewValues).map(([id, value]) => (
              <tr key={id} className="border-b">
                <th className="w-1/3 py-2 pr-4 text-left font-medium">{id}</th>
                <td className="py-2">{value || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
