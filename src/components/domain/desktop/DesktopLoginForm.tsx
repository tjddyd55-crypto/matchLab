"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLoginForm } from "@/components/domain/auth/AuthLoginForm";
import { DesktopSupportInquiryModal } from "@/components/domain/desktop/DesktopSupportInquiryModal";
import { signInWithPasswordDesktopAction } from "@/features/auth/actions";
import type { DesktopSupportInquiryCategoryCode } from "@/lib/desktop/support-inquiry";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

/**
 * MATCHON Manager PC 로그인 — 웹과 동일한 회원가입·비밀번호 찾기 route.
 * 휴대폰을 쓸 수 없는 경우만 관리자 문의 모달로 연결한다.
 */
export function DesktopLoginForm() {
  const [modalOpen, setModalOpen] = useState(false);
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
        identifierPlaceholder="아이디를 입력하세요"
        action={signInWithPasswordDesktopAction}
        footer={
          <div
            className={cn(
              authLoginFooterClass,
              "mt-1 flex flex-col items-center gap-2",
            )}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <Link
                href="/join"
                className="text-sm font-medium text-matchon-primary underline-offset-2 hover:underline"
              >
                회원가입
              </Link>
              <span className="text-matchon-border" aria-hidden>
                |
              </span>
              <Link
                href="/password-reset"
                className="text-sm font-medium text-matchon-primary underline-offset-2 hover:underline"
              >
                비밀번호 찾기
              </Link>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-matchon-text-secondary underline-offset-2 hover:underline"
              onClick={() => openInquiry("password_help")}
            >
              등록된 휴대폰을 사용할 수 없나요? 관리자에게 문의
            </button>
          </div>
        }
      />
      <DesktopSupportInquiryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultCategory={defaultCategory}
      />
    </>
  );
}
