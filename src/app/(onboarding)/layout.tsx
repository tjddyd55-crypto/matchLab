import { AppShell } from "@/components/layout/AppShell";
import { OnboardingShell } from "@/components/layout/OnboardingShell";

export default function OnboardingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <OnboardingShell>{children}</OnboardingShell>
    </AppShell>
  );
}
