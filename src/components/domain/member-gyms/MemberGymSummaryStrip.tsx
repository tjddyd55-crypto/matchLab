export function MemberGymSummaryStrip({
  items,
}: {
  items: { label: string; value: number | string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-matchon-border bg-white px-3 py-2"
        >
          <p className="text-[11px] text-matchon-text-secondary">{item.label}</p>
          <p className="text-lg font-bold tabular-nums text-matchon-text-primary">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
