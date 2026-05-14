export function formatAdminDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
