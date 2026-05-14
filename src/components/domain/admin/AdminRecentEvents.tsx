import type { AdminEventListItemDTO } from "@/lib/dto/admin";
import { AdminEventsTable } from "@/components/domain/admin/AdminEventsTable";

export function AdminRecentEvents({ rows }: { rows: AdminEventListItemDTO[] }) {
  return <AdminEventsTable rows={rows} />;
}
