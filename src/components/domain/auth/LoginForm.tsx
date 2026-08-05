"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLoginForm } from "@/components/domain/auth/AuthLoginForm";
import { DesktopSupportInquiryModal } from "@/components/domain/desktop/DesktopSupportInquiryModal";
import { signInWithPasswordAction } from "@/features/auth/actions";
import type { DesktopSupportInquiryCategoryCode } from "@/lib/desktop/support-inquiry";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

/**
 * 일반 로그인 — AuthLoginForm SSOT + 일반 auth action.
 */
export function LoginForm({
  defaultLoginId,
  activatedBanner,
}: {
  defaultLoginId?: string;
  activatedBanner?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [identifier, setIdentifier] = useState(defaultLoginId ?? "");
  const [defaultCategory, setDefaultCategory] =
    useState<DesktopSupportInquiryCategoryCode>("general");

  function openInquiry(category: DesktopSupportInquiryCategoryCode) {
    setDefaultCategory(category);
    setModalOpen(true);
  }

  return (
    <>
      <AuthLoginForm
        identifierName="identifier"
        identifierLabel="아이디"
        defaultIdentifier={defaultLoginId}
        identifierPlaceholder="아이디를 입력하세요"
        action={signInWithPasswordAction}
        onIdentifierChange={setIdentifier}
        banner={
          activatedBanner ? (
            <p
              className="rounded-lg border border-matchon-primary/30 bg-matchon-primary-light/40 px-3 py-2.5 text-[0.9375rem] leading-relaxed text-matchon-text-primary"
              role="status"
            >
              회원사 계정이 활성화되었습니다.
              <br />
              설정한 아이디와 비밀번호로 로그인해 주세요.
            </p>
          ) : null
        }
        secondaryNote="관리자, 주최자, 체육관, 선수 모두 발급받은 아이디로 로그인합니다."
        footer={
          <div className={cn(authLoginFooterClass, "space-y-2")}>
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <Link
                href="/join"
                className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
              >
                회원가입
              </Link>
              <span className="text-matchon-border" aria-hidden>
                |
              </span>
              <Link
                href="/password-reset"
                className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
              >
                비밀번호 찾기
              </Link>
            </p>
            <button
              type="button"
              className="text-xs font-medium text-matchon-text-secondary underline-offset-2 hover:underline"
              onClick={() => openInquiry("password_help")}
            >
              등록된 휴대폰을 사용할 수 없나요? 관리자에게 문의
            </button>
            <p className="text-[0.8125rem] leading-relaxed">
              선수·직원 계정은 체육관에서 받은 설정 링크로 아이디와 비밀번호를
              만들 수 있습니다.{" "}
              <Link
                href="/fighter/forgot-password"
                className="font-semibold text-matchon-primary underline-offset-2 hover:underline"
              >
                선수 안내
              </Link>
            </p>
          </div>
        }
      />
      <DesktopSupportInquiryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultCategory={defaultCategory}
        initialLoginId={identifier}
        roleHint="web_login"
      />
    </>
  );
}
