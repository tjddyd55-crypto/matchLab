import type { Metadata } from "next";
import { headers } from "next/headers";
import { ExternalRegistrationPublicForm } from "@/components/domain/applications/ExternalRegistrationPublicForm";
import { ExternalRegistrationStatusScreen } from "@/components/domain/applications/ExternalRegistrationStatusScreen";
import { BRAND_NAME } from "@/lib/brand";
import { formatPublicDate } from "@/lib/date-display";
import { checkExternalRegistrationResolveRateLimit } from "@/lib/external-registration/rate-limit";
import { externalRegistrationLinkService } from "@/lib/services/external-registration-link.service";

export const dynamic = "force-dynamic";

const FALLBACK_TITLE = `선수 등록 | ${BRAND_NAME}`;
const FALLBACK_DESCRIPTION =
  "외부 체육관 선수 등록 링크입니다. 참가 선수를 여러 명 한 번에 신청할 수 있습니다.";

function robotsNoIndex(): Metadata["robots"] {
  return { index: false, follow: false };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  try {
    const resolved =
      await externalRegistrationLinkService.resolvePublicToken(token);
    if (!resolved.ok) {
      return {
        title: { absolute: FALLBACK_TITLE },
        description: FALLBACK_DESCRIPTION,
        robots: robotsNoIndex(),
      };
    }

    const title = `${resolved.event.title} 선수 등록 | ${BRAND_NAME}`;
    const description = `${resolved.event.title} 외부 체육관 선수 등록 페이지입니다. 참가 선수를 여러 명 한 번에 신청할 수 있습니다.`;

    return {
      title: { absolute: title },
      description,
      robots: robotsNoIndex(),
      openGraph: {
        title,
        description,
        siteName: BRAND_NAME,
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: { absolute: FALLBACK_TITLE },
      description: FALLBACK_DESCRIPTION,
      robots: robotsNoIndex(),
    };
  }
}

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
      <ExternalRegistrationStatusScreen
        title="잠시 후 다시 시도해 주세요"
        description="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  const resolved =
    await externalRegistrationLinkService.resolvePublicToken(token);

  if (!resolved.ok) {
    const title =
      resolved.reason === "revoked"
        ? "사용할 수 없는 등록 링크입니다"
        : resolved.reason === "expired"
          ? "만료된 등록 링크입니다"
          : "유효하지 않은 등록 링크입니다";
    const description =
      resolved.reason === "revoked"
        ? "주최자가 이 링크의 사용을 중지했습니다. 자세한 내용은 대회 주최자에게 문의해 주세요."
        : resolved.reason === "expired"
          ? "이 등록 링크는 만료되었습니다. 자세한 내용은 대회 주최자에게 문의해 주세요."
          : "링크가 올바르지 않거나 더 이상 사용할 수 없습니다. 자세한 내용은 대회 주최자에게 문의해 주세요.";

    return (
      <ExternalRegistrationStatusScreen
        title={title}
        description={description}
      />
    );
  }

  return (
    <ExternalRegistrationPublicForm
      token={token}
      eventTitle={resolved.event.title}
      eventDateLabel={formatPublicDate(resolved.event.eventDate)}
      locationLabel={resolved.event.locationLabel}
      registrationEndLabel={resolved.event.registrationEndLabel}
      closedReason={resolved.closedReason}
      divisions={resolved.divisions}
    />
  );
}
