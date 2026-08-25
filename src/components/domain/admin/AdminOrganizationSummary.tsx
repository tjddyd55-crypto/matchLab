import {
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatsGridClass,
  matchonStatValueClass,
} from "@/lib/ui/admin-ui";

export type AdminOrganizationSummaryItem = {
  label: string;
  value: string;
};

export function AdminOrganizationSummary({
  items,
}: {
  items: AdminOrganizationSummaryItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className={matchonStatsGridClass}>
      {items.map((item) => (
        <div key={item.label} className={matchonStatCardClass}>
          <p className={matchonStatLabelClass}>{item.label}</p>
          <p className={matchonStatValueClass}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
