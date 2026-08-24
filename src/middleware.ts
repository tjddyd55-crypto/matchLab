import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DESKTOP_LOGIN_PATH,
  DESKTOP_REQUEST_HEADER,
  isMatchonDesktopRequestHeaders,
  resolveDesktopUnauthRedirectPath,
} from "@/lib/desktop/auth-boundary";

/**
 * 세션 쿠키 갱신 + Desktop Manager 미인증 navigation boundary.
 * 역할·DB 조회는 레이아웃·Server Action에서 처리한다.
 * 웹 브라우저 public homepage는 desktop UA/header가 없으면 변경하지 않는다.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDesktop = isMatchonDesktopRequestHeaders({
    headerValue: request.headers.get(DESKTOP_REQUEST_HEADER),
    userAgent: request.headers.get("user-agent"),
  });

  if (isDesktop && !user) {
    const redirectPath = resolveDesktopUnauthRedirectPath(
      request.nextUrl.pathname,
    );
    if (redirectPath) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = redirectPath;
      loginUrl.search = "";
      const redirectResponse = NextResponse.redirect(loginUrl);
      // 세션 refresh 중 set된 쿠키를 redirect에도 유지
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      response = redirectResponse;
    }
  }

  if (request.nextUrl.pathname.startsWith("/password-reset/admin-link")) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  if (
    isDesktop &&
    request.nextUrl.pathname === DESKTOP_LOGIN_PATH
  ) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
