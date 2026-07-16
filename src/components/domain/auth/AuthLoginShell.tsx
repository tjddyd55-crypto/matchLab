import type { ReactNode } from "react";
import { MatchonLogo } from "@/components/common/MatchonLogo";
import {
  AUTH_LOGIN_LOGO_SIZE,
  authLoginCardClass,
  authLoginDescClass,
  authLoginEyebrowClass,
  authLoginHeaderStackClass,
  authLoginLogoWrapClass,
  authLoginShellClass,
  authLoginTitleClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export type AuthLoginShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** description 아래 보조 문구 (대회명 등) */
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * 로그인 화면 공통 shell — 중앙 로고 + card + header/footer.
 * variant(default/judge)는 색·크기를 가르지 않고 텍스트/children만 다르게 전달한다.
 */
export function AuthLoginShell({
  eyebrow,
  title,
  description,
  subtitle,
  footer,
  children,
  className,
}: AuthLoginShellProps) {
  return (
    <div className={cn(authLoginShellClass, className)}>
      <div className={authLoginCardClass}>
        <div className={authLoginLogoWrapClass}>
          <MatchonLogo href="/" size={AUTH_LOGIN_LOGO_SIZE} variant="light" />
        </div>
        <header className={authLoginHeaderStackClass}>
          {eyebrow ? <p className={authLoginEyebrowClass}>{eyebrow}</p> : null}
          <h1 className={authLoginTitleClass}>{title}</h1>
          {subtitle}
          {description ? (
            <p className={authLoginDescClass}>{description}</p>
          ) : null}
        </header>
        {children}
        {footer}
      </div>
    </div>
  );
}
