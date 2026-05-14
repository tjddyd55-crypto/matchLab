import type { AdminApplicationListItemDTO } from "@/lib/dto/admin";
import { AdminApplicationsTable } from "@/components/domain/admin/AdminApplicationsTable";

export function AdminRecentApplications({
  rows,
}: {
  rows: AdminApplicationListItemDTO[];
}) {
  return <AdminApplicationsTable rows={rows} />;
}
