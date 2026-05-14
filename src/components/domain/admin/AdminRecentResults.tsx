import type { AdminMatchResultListItemDTO } from "@/lib/dto/admin";
import { AdminResultsTable } from "@/components/domain/admin/AdminResultsTable";

export function AdminRecentResults({ rows }: { rows: AdminMatchResultListItemDTO[] }) {
  return <AdminResultsTable rows={rows} />;
}
