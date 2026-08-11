import { ExternalRegistrationPublicForm } from "@/components/domain/applications/ExternalRegistrationPublicForm";
import { externalRegistrationLinkService } from "@/lib/services/external-registration-link.service";
import { formatPublicDate } from "@/lib/date-display";
import { checkExternalRegistrationResolveRateLimit } from "@/lib/external-registration/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ExternalEventRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";
  const rate = checkExternalRegistrationResolveRateLimit(ip);
  if (!rate.ok) {
    return (
      <main className="mx-auto min-h-dvh max-w-3xl px-4 py-8">
        <p className="text-destructive text-sm">
          요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </main>
    );
  }

  const resolved =
    await externalRegistrationLinkService.resolvePublicToken(token);

  if (!resolved.ok) {
    const message =
      resolved.reason === "revoked"
        ? "사용이 중지된 등록 링크입니다."
        : resolved.reason === "expired"
          ? "만료된 등록 링크입니다."
          : "유효하지 않은 등록 링크입니다.";
    return (
      <main className="mx-auto min-h-dvh max-w-3xl px-4 py-8">
        <h1 className="text-lg font-semibold">외부 체육관 선수 신청</h1>
        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6 sm:py-8">
      <ExternalRegistrationPublicForm
        token={token}
        eventTitle={resolved.event.title}
        eventDateLabel={formatPublicDate(resolved.event.eventDate)}
        locationLabel={resolved.event.locationLabel}
        registrationEndLabel={resolved.event.registrationEndLabel}
        closedReason={resolved.closedReason}
        divisions={resolved.divisions}
      />
    </main>
  );
}
