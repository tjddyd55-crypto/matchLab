import { MatchonLogo } from "@/components/common/MatchonLogo";

/**
 * 외부 체육관 등록 전용 lightweight layout.
 * PublicNav(로그인/회원가입/대회공고)를 렌더하지 않는다.
 */
export default function ExternalRegistrationGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-matchon-surface text-matchon-text-primary min-h-dvh">
      <header className="border-border/60 border-b bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <MatchonLogo size="md" variant="light" />
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}
