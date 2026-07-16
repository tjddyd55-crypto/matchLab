import Link from "next/link";
import { notFound } from "next/navigation";
import { AssociationApplicationAttachmentsList } from "@/components/domain/association-applications/AssociationApplicationAttachmentsList";
import { AssociationApplicationReviewActions } from "@/components/domain/association-applications/AssociationApplicationReviewActions";
import { AdminPageHeader } from "@/components/domain/admin/AdminPageHeader";
import { requireActor } from "@/lib/auth/actor";
import { associationApplicationService } from "@/lib/services/association-application.service";
import {
  adminContentCardClass,
  adminPageContainerClass,
  adminPageStackClass,
} from "@/lib/ui/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminAssociationApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const actor = await requireActor();
  const { applicationId } = await params;
  let row;
  try {
    row = await associationApplicationService.getForAdmin(actor, applicationId);
  } catch {
    notFound();
  }

  return (
    <div className={adminPageContainerClass}>
      <div className={adminPageStackClass}>
        <AdminPageHeader title={row.associationName} description="협회 가입 신청 상세" />
        <div className={`${adminContentCardClass} space-y-3 text-sm`}>
          <p>
            <span className="font-semibold">상태:</span> {row.status}
          </p>
          <p>
            <span className="font-semibold">대표자:</span> {row.representativeName}
          </p>
          <p>
            <span className="font-semibold">담당자:</span> {row.contactName} /{" "}
            {row.contactPhone} / {row.contactEmail}
          </p>
          <p>
            <span className="font-semibold">주소:</span>{" "}
            {[row.address, row.addressDetail].filter(Boolean).join(" ") || "-"}
          </p>
          <p>
            <span className="font-semibold">웹사이트:</span> {row.website || "-"}
          </p>
          <p className="whitespace-pre-wrap">
            <span className="font-semibold">소개:</span>
            <br />
            {row.description || "-"}
          </p>
          <AssociationApplicationAttachmentsList
            attachments={row.attachments.map((a) => ({
              id: a.id,
              attachmentType: a.attachmentType,
              originalFileName: a.originalFileName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
            }))}
          />
          <AssociationApplicationReviewActions
            applicationId={row.id}
            canReview={
              row.status === "pending" || row.status === "under_review"
            }
          />
          <p>
            <Link
              href="/admin/association-applications"
              className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
            >
              ← 목록
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
