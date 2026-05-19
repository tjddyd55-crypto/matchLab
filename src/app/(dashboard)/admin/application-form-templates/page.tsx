import Link from "next/link";
import { requireActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors/app-error";
import { applicationFormTemplateService } from "@/lib/services/application-form-template.service";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminApplicationFormTemplatesPage() {
  const actor = await requireActor();

  let templates: Awaited<
    ReturnType<typeof applicationFormTemplateService.listTemplates>
  > = [];
  let loadError: string | null = null;

  try {
    templates = await applicationFormTemplateService.listTemplates(actor);
  } catch (e) {
    if (e instanceof AppError) {
      loadError = e.message;
    } else {
      throw e;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle />
        <Link
          href="/admin/application-form-templates/new"
          className={cn(buttonVariants(), "shrink-0")}
        >
          새 템플릿
        </Link>
      </div>

      {loadError ? (
        <EmptyState title="템플릿을 불러올 수 없습니다" description={loadError} />
      ) : templates.length === 0 ? (
        <EmptyState
          title="등록된 신청서 템플릿이 없습니다"
          description="새 템플릿을 만들어 대회에 연결할 수 있습니다."
          action={
            <Link
              href="/admin/application-form-templates/new"
              className={buttonVariants()}
            >
              새 템플릿
            </Link>
          }
        />
      ) : (
        <TemplateTable templates={templates} />
      )}
    </div>
  );
}

function PageTitle() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        신청서 PDF 템플릿
      </h1>
      <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
        주최측 공식 신청서 양식(PDF)과 필드 좌표 JSON을 관리합니다. 대회 상세에서
        템플릿을 연결하면 체육관 공식 신청 흐름이 활성화됩니다.
      </p>
    </div>
  );
}

function TemplateTable({
  templates,
}: {
  templates: Awaited<
    ReturnType<typeof applicationFormTemplateService.listTemplates>
  >;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">제목</th>
            <th className="px-4 py-3 font-medium">주최자</th>
            <th className="px-4 py-3 font-medium">필드</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">수정</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-3 font-medium">{t.title}</td>
              <td className="text-muted-foreground px-4 py-3">
                {t.organizerName ?? "전체 공용"}
              </td>
              <td className="px-4 py-3">{t.fieldCount}</td>
              <td className="px-4 py-3">{t.isActive ? "활성" : "비활성"}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/application-form-templates/${t.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  편집
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
