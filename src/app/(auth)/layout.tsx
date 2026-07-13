import { MatchonLogo } from "@/components/common/MatchonLogo";
import { authPageCardClass, authPageShellClass } from "@/lib/ui/auth-ui";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={authPageShellClass}>
      <MatchonLogo href="/" size="lg" variant="light" className="mb-6" />
      <div className={authPageCardClass}>{children}</div>
    </div>
  );
}
