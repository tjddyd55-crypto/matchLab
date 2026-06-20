import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { ApplicationFormTemplateListTable } from "@/components/domain/application-form-templates/ApplicationFormTemplateListTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BASE_PATH = "/organizer/application-form-templates";

export default async function OrganizerApplicationFormTemplatesPage() {
  const actor = await requireActor();

  let templates: Awaited<
    ReturnType<typeof applicationFormTemplateService.listTemplates>
  > = [];
  let loadError: string | null = null;

  try {
    templates = await applicationFormTemplateService.listTemplates(actor, {
      activeOnly: false,
    });
  } catch (e) {
    if (e instanceof AppError) {
      loadError = e.message;
    } else {
      throw e;
    }
  }

  const myTemplates = templates.filter((t) => t.organizerId);
  const globalTemplates = templates.filter((t) => !t.organizerId);

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            신청서 템플릿
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
            자주 사용하는 신청서 양식을 만들어 대회에 연결할 수 있습니다. 공용
            템플릿을 복사해 내 대회에 맞게 수정할 수도 있습니다.
          </p>
        </div>
        <Link href={`${BASE_PATH}/new`} className={cn(buttonVariants(), "shrink-0")}>
          새 템플릿
        </Link>
      </div>

      {loadError ? (
        <EmptyState title="템플릿을 불러올 수 없습니다" description={loadError} />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">내 템플릿</h2>
            {myTemplates.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm">
                아직 만든 템플릿이 없습니다. 새 템플릿을 만들거나 공용 템플릿을
                복사해 보세요.
              </p>
            ) : (
              <ApplicationFormTemplateListTable
                templates={myTemplates}
                editPathPrefix={BASE_PATH}
                showScope
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">공용 템플릿</h2>
            {globalTemplates.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm">
                사용 가능한 공용 템플릿이 없습니다.
              </p>
            ) : (
              <ApplicationFormTemplateListTable
                templates={globalTemplates}
                editPathPrefix={BASE_PATH}
                showScope
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
