import type { Metadata } from "next";
import { IntakeFormPublicForm } from "@/components/domain/intake-forms/IntakeFormPublicForm";
import { BRAND_NAME } from "@/lib/brand";
import { intakeFormPublicService } from "@/lib/services/intake-form.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}): Promise<Metadata> {
  const { publicToken } = await params;
  const loaded = await intakeFormPublicService.loadPublicForm(
    decodeURIComponent(publicToken),
  );
  const title = loaded
    ? `${loaded.form.title} | ${BRAND_NAME}`
    : `신청 폼 | ${BRAND_NAME}`;
  return {
    title: { absolute: title },
    robots: { index: false, follow: false },
  };
}

export default async function PublicIntakeFormPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken: raw } = await params;
  const token = decodeURIComponent(raw);
  const loaded = await intakeFormPublicService.loadPublicForm(token);
  if (!loaded) notFound();

  const blockedMessage =
    loaded.availability.kind !== "open"
      ? (loaded.availability as { message: string }).message
      : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <p className="mb-6 text-center text-sm font-bold text-matchon-text-secondary">
        {BRAND_NAME}
      </p>
      <IntakeFormPublicForm
        publicToken={token}
        title={loaded.form.title}
        description={loaded.form.description}
        fields={loaded.fields}
        canSubmit={loaded.canSubmit}
        blockedMessage={blockedMessage}
      />
    </main>
  );
}
