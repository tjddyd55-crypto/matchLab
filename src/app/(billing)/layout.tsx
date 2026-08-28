import { BRAND_NAME } from "@/lib/brand";

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_40%)]">
      <div className="border-b border-matchon-border/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-lg items-center px-4">
          <span className="text-sm font-extrabold tracking-wide text-matchon-primary">
            {BRAND_NAME}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
