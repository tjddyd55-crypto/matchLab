import { notFound } from "next/navigation";
import { requireActor, redirectUnlessDashboardRole } from "@/lib/auth/actor";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { adminContentCardClass, adminPageContainerClass, adminPageStackClass } from "@/lib/ui/admin-ui";
import { loadMatchonMessagingConfig } from "@/lib/matchon-messaging";
import { matchonMessagingDiagnosticsService } from "@/server/messaging/services/matchon-messaging-diagnostics.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Flag({ label, value }: { label: string; value: boolean | string | number | null }) {
  const display =
    typeof value === "boolean" ? (value ? "true" : "false") : value == null ? "—" : String(value);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-matchon-border py-2 text-sm last:border-0">
      <span className="text-matchon-text-secondary">{label}</span>
      <span className="font-mono font-medium text-matchon-text-primary">{display}</span>
    </div>
  );
}

export default async function AdminMessagingDiagnosticsPage() {
  const actor = await requireActor();
  redirectUnlessDashboardRole(actor, ["admin"]);

  const config = loadMatchonMessagingConfig();
  if (!config.adminUiEnabled) notFound();

  const d = await matchonMessagingDiagnosticsService.getDiagnostics();

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader
          title="메시징 진단"
          description="MATCHON 전용 메시징 설정 상태입니다. credential 원문은 표시되지 않습니다."
        />
        <div className={cn(adminContentCardClass, "p-4")}>
          <Flag label="messaging enabled" value={d.messagingEnabled} />
          <Flag label="dry run" value={d.dryRun} />
          <Flag label="allow real send" value={d.allowRealSend} />
          <Flag label="admin UI enabled" value={d.adminUiEnabled} />
          <Flag label="gym UI enabled" value={d.gymUiEnabled} />
          <Flag label="SMS provider enabled" value={d.smsProviderEnabled} />
          <Flag label="SMS API key 존재" value={d.smsApiKeyPresent} />
          <Flag label="SMS user ID 존재" value={d.smsUserIdPresent} />
          <Flag label="SMS sender 존재" value={d.smsSenderPresent} />
          <Flag label="Kakao provider enabled" value={d.kakaoProviderEnabled} />
          <Flag label="Kakao API key 존재" value={d.kakaoApiKeyPresent} />
          <Flag label="Kakao user ID 존재" value={d.kakaoUserIdPresent} />
          <Flag label="Kakao sender key 존재" value={d.kakaoSenderKeyPresent} />
          <Flag label="Kakao channel ID 존재" value={d.kakaoChannelIdPresent} />
          <Flag label="template 총수" value={d.templateTotal} />
          <Flag label="승인 template 수" value={d.templateApproved} />
          <Flag label="fingerprint mismatch 수" value={d.fingerprintMismatchCount} />
          <Flag label="마지막 dry-run" value={d.lastDryRunAt} />
          <Flag label="마지막 blocked" value={d.lastBlockedAt} />
          <Flag label="마지막 provider 오류 요약" value={d.lastProviderErrorSummary} />
          <Flag label="transport 호출 가능" value={d.transportCallable} />
          <Flag label="SMS fallback enabled" value={d.smsFallbackEnabled} />
        </div>
      </div>
    </div>
  );
}
