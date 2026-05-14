import type { AdminAuditLogListItemDTO } from "@/lib/dto/admin";
import { AdminAuditLogsTable } from "@/components/domain/admin/AdminAuditLogsTable";

export function AdminRecentAuditLogs({ rows }: { rows: AdminAuditLogListItemDTO[] }) {
  return <AdminAuditLogsTable rows={rows} />;
}
