import Link from "next/link";
import type { ApplicationFormTemplateListItemVM } from "@/lib/services/application-form-template.service";
import { ApplicationFormTemplateArchiveButton } from "@/components/domain/application-form-templates/ApplicationFormTemplateArchiveButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApplicationFormTemplateListTable({
  templates,
  editPathPrefix,
  showScope = false,
  canEditAll = false,
}: {
  templates: ApplicationFormTemplateListItemVM[];
  editPathPrefix: string;
  showScope?: boolean;
  canEditAll?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">제목</th>
            {showScope ? (
              <th className="px-4 py-3 font-medium">범위</th>
            ) : null}
            <th className="px-4 py-3 font-medium">방식</th>
            <th className="px-4 py-3 font-medium">필드</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-3 font-medium">{t.title}</td>
              {showScope ? (
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {t.organizerId ? "내 템플릿" : "공용"}
                </td>
              ) : null}
              <td className="px-4 py-3">{t.formModeLabel}</td>
              <td className="px-4 py-3">{t.fieldCount}</td>
              <td className="px-4 py-3">{t.isActive ? "활성" : "보관"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {canEditAll || t.organizerId ? (
                    <>
                      <Link
                        href={`${editPathPrefix}/${t.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        편집
                      </Link>
                      <ApplicationFormTemplateArchiveButton
                        templateId={t.id}
                        title={t.title}
                        isActive={t.isActive}
                      />
                    </>
                  ) : (
                    <Link
                      href={`${editPathPrefix}/new?copyFrom=${t.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      복사
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
