import { requireActor } from "@/lib/auth/actor";
import { fighterAccountService } from "@/lib/services/fighter-account.service";

export const dynamic = "force-dynamic";

export default async function FighterPendingPage() {
  const actor = await requireActor();
  const gate = await fighterAccountService.getFighterRegistrationGate(actor);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold">체육관 승인 대기</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        {gate.kind === "pending"
          ? `${gate.gymName}에 등록 요청이 접수되었습니다. 체육관에서 승인하면 대시보드를 이용할 수 있습니다.`
          : "등록 요청 상태를 확인할 수 없습니다."}
      </p>
    </div>
  );
}
