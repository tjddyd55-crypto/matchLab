export function OrganizerManualEntryHint({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <p className="text-muted-foreground text-[10px] leading-tight">
      주최자 직접등록
    </p>
  );
}
