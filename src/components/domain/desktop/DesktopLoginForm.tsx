"use client";

import { useState } from "react";
import { AuthLoginForm } from "@/components/domain/auth/AuthLoginForm";
import { DesktopSupportInquiryModal } from "@/components/domain/desktop/DesktopSupportInquiryModal";
import { signInWithPasswordDesktopAction } from "@/features/auth/actions";
import type { DesktopSupportInquiryCategoryCode } from "@/lib/desktop/support-inquiry";
import { authLoginFooterClass } from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

/**
 * MATCHON Manager PC 로그인 — 심플 폼 + 비밀번호 찾기/문의 액션.
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
              "mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1",
            )}
          >
            <button
              type="button"
              className="text-sm font-medium text-matchon-primary underline-offset-2 hover:underline"
              onClick={() => openInquiry("password_help")}
            >
              비밀번호 찾기
            </button>
            <span className="text-matchon-border" aria-hidden>
              |
            </span>
            <button
              type="button"
              className="text-sm font-medium text-matchon-primary underline-offset-2 hover:underline"
              onClick={() => openInquiry("general")}
            >
              관리자에게 문의하기
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
