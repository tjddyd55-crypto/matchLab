import { requireActor } from "@/lib/auth/actor";
import { fighterAccountService } from "@/lib/services/fighter-account.service";

export const dynamic = "force-dynamic";

export default async function FighterRejectedPage() {
  const actor = await requireActor();
  const gate = await fighterAccountService.getFighterRegistrationGate(actor);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold">등록 요청 반려</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        {gate.kind === "rejected"
          ? `${gate.gymName}에서 등록 요청이 반려되었습니다. 체육관에 문의해 주세요.`
          : "등록 상태를 확인할 수 없습니다."}
      </p>
    </div>
  );
}
