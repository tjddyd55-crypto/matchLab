/**
 * Auth route group — 배경만 제공.
 * 로고·카드는 AuthLoginShell(로그인) 또는 페이지가 직접 구성한다.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
