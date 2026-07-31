import { MatchonLogo } from "@/components/common/MatchonLogo";
import {
  authLoginCardClass,
  authLoginDescClass,
  authLoginShellClass,
  authLoginTitleClass,
  AUTH_LOGIN_LOGO_SIZE,
} from "@/lib/ui/auth-login-ui";

export function DesktopPreparing({
  title = "MATCHON Manager",
  message = "관리자 환경을 준비하고 있습니다.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className={authLoginShellClass}>
      <div className={authLoginCardClass}>
        <div className="mb-6 flex justify-center">
          <MatchonLogo size={AUTH_LOGIN_LOGO_SIZE} variant="light" />
        </div>
        <div className="space-y-2 text-center">
          <h1 className={authLoginTitleClass}>{title}</h1>
          <p className={authLoginDescClass}>{message}</p>
        </div>
      </div>
    </div>
  );
}
