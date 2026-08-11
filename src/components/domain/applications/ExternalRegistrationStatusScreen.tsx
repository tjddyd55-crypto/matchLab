type Props = {
  title: string;
  description: string;
  eventTitle?: string | null;
};

/** 외부 등록 invalid/closed/rate-limit 전용 상태 화면 */
export function ExternalRegistrationStatusScreen({
  title,
  description,
  eventTitle,
}: Props) {
  return (
    <section className="space-y-4">
      {eventTitle ? (
        <p className="text-muted-foreground text-sm font-medium">{eventTitle}</p>
      ) : null}
      <div className="rounded-xl border border-border/70 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {description}
        </p>
        <p className="text-muted-foreground mt-4 text-xs">
          문제가 계속되면 대회 주최자에게 문의해 주세요.
        </p>
      </div>
    </section>
  );
}
