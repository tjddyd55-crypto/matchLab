import {
  adminPageDescClass,
  adminPageTitleClass,
} from "@/lib/ui/admin-ui";

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <h1 className={adminPageTitleClass}>{title}</h1>
      {description ? (
        <p className={adminPageDescClass}>{description}</p>
      ) : null}
    </div>
  );
}
