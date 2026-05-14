import { AppShell } from "@/components/layout/AppShell";
import { PublicShell } from "@/components/layout/PublicShell";

export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <PublicShell>{children}</PublicShell>
    </AppShell>
  );
}
