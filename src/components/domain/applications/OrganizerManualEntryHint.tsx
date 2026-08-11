export function OrganizerManualEntryHint({
  show,
  entrySource,
}: {
  show?: boolean;
  entrySource?: "organizer_manual" | "external_link" | null;
}) {
  if (entrySource === "external_link") {
    return (
      <p className="text-muted-foreground text-[10px] leading-tight">외부링크</p>
    );
  }
  if (!show && entrySource !== "organizer_manual") return null;
  return (
    <p className="text-muted-foreground text-[10px] leading-tight">
      주최자 직접등록
    </p>
  );
}
