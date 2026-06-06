import type { CustomFormSnapshot } from "@/lib/application-form/custom-form";

export function OrganizerCustomFormAnswersSection({
  snapshot,
}: {
  snapshot: CustomFormSnapshot;
}) {
  if (snapshot.answers.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/15 p-4">
      <div>
        <p className="text-sm font-medium">신청서 답변</p>
        <p className="text-muted-foreground text-xs">
          {snapshot.templateTitle} ·{" "}
          {snapshot.capturedAt
            ? new Date(snapshot.capturedAt).toLocaleString("ko-KR")
            : "—"}
        </p>
      </div>
      <dl className="grid gap-3">
        {snapshot.answers.map((row) => (
          <div key={row.id} className="grid gap-0.5 text-sm">
            <dt className="text-muted-foreground text-xs">
              {row.label}
              {row.readonly ? " (자동)" : ""}
            </dt>
            <dd className="whitespace-pre-wrap">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
