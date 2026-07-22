import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";
import { loadMatchonMessagingConfig } from "@/lib/matchon-messaging";
import { matchonMessagingService } from "@/server/messaging/services/matchon-messaging.service";
import { maskMatchonPhone } from "@/server/messaging/utils/matchon-phone";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMessagingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const config = loadMatchonMessagingConfig();
  if (!config.adminUiEnabled) notFound();

  const { id } = await searchParams;
  const rows = await matchonMessagingService.listDispatches({ take: 50 });
  const detail = id ? await matchonMessagingService.getDispatch(id) : null;

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="발송 이력"
          description="MATCHON 메시징 dispatch/recipient 스냅샷입니다."
        />

        <div className={cn(adminContentCardClass, "overflow-x-auto p-0")}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-matchon-border bg-matchon-surface text-xs text-matchon-text-secondary">
              <tr>
                <th className="px-3 py-2">생성일</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">owner</th>
                <th className="px-3 py-2">channel</th>
                <th className="px-3 py-2">요청</th>
                <th className="px-3 py-2">성공</th>
                <th className="px-3 py-2">실패</th>
                <th className="px-3 py-2">dryRun</th>
                <th className="px-3 py-2">status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-matchon-border">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.createdAt.toISOString().slice(0, 19)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/messaging/history?id=${r.id}`}
                      className="font-mono text-xs text-matchon-primary underline"
                    >
                      {r.id.slice(0, 10)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.ownerType}</td>
                  <td className="px-3 py-2">{r.channel}</td>
                  <td className="px-3 py-2">{r.requestedCount}</td>
                  <td className="px-3 py-2">{r.successCount}</td>
                  <td className="px-3 py-2">{r.failureCount}</td>
                  <td className="px-3 py-2">{r.dryRun ? "Y" : "N"}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-matchon-text-secondary" colSpan={9}>
                    이력이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {detail ? (
          <div className={cn(adminContentCardClass, "space-y-3 p-4")}>
            <h2 className="text-sm font-semibold">상세 · {detail.id}</h2>
            <p className="text-sm text-matchon-text-secondary">
              subject: {detail.subjectSnapshot || "—"}
            </p>
            <pre className="overflow-x-auto rounded-lg bg-matchon-surface p-3 text-xs whitespace-pre-wrap">
              {detail.bodySnapshot}
            </pre>
            <ul className="space-y-2 text-sm">
              {detail.recipients.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-matchon-border px-3 py-2"
                >
                  <div className="flex flex-wrap gap-2">
                    <span>{maskMatchonPhone(r.normalizedPhone)}</span>
                    <span>{r.status}</span>
                    <span className="text-matchon-text-secondary">
                      {r.providerCode || "—"}
                    </span>
                  </div>
                  {r.excludedReason ? (
                    <p className="text-xs text-amber-800">{r.excludedReason}</p>
                  ) : null}
                  {r.providerMessage ? (
                    <p className="text-xs text-matchon-text-secondary">
                      {r.providerMessage}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
