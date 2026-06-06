"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateFighterProfileAction } from "@/features/fighter-profile/actions";
import type { FighterProfileEditorDTO } from "@/lib/services/fighter-profile.service";
import { Button } from "@/components/ui/button";
import { FighterProfileImageUpload } from "@/components/domain/fighters/FighterProfileImageUpload";

export function FighterProfileEditorForm({
  editor,
}: {
  editor: FighterProfileEditorDTO;
}) {
  const [state, formAction, pending] = useActionState(
    updateFighterProfileAction,
    null,
  );

  const [profileImage, setProfileImage] = useState<{
    url: string;
    path: string;
  } | null>(() => {
    const url = editor.profileImageUrl?.trim();
    const path = editor.profileImagePath?.trim();
    if (url) return { url, path: path ?? "" };
    return null;
  });

  const [isPublicChecked, setIsPublicChecked] = useState(editor.isPublic);

  const inputClass =
    "border-input h-9 w-full rounded-md border px-3 text-sm";

  const savedPublicUrl =
    state?.ok === true ? state.data.publicProfileUrl : null;

  return (
    <form action={formAction} className="space-y-8">
      <section className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
        <p>기본 선수 정보는 소속 체육관에서 관리합니다.</p>
        <p className="mt-1">
          프로필 사진, 자기소개, SNS 링크는 선수가 직접 수정할 수 있습니다.
        </p>
        <p className="mt-1">
          공개 프로필을 켜면 공개 선수 페이지에서 표시될 수 있습니다.
        </p>
      </section>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {/* 좌측(모바일 상단): 프로필 사진 */}
        <div className="w-full shrink-0 md:w-56">
          <FighterProfileImageUpload
            fighterId={editor.fighterId}
            initialImageUrl={editor.profileImageUrl}
            imageUrl={profileImage?.url ?? ""}
            imagePath={profileImage?.path ?? ""}
            onImageChange={setProfileImage}
          />
        </div>

        {/* 우측(모바일 하단): 입력 폼 */}
        <div className="min-w-0 flex-1 space-y-5">
          <section className="space-y-3 rounded-lg border p-4 text-sm">
            <h2 className="font-medium">기본 정보 (읽기 전용)</h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">이름</dt>
                <dd className="font-medium">{editor.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">소속 체육관</dt>
                <dd>{editor.gymName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">지역</dt>
                <dd>{editor.regionLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">성별 · 연령부</dt>
                <dd>
                  {editor.gender} · {editor.ageGroup}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">체급/체중</dt>
                <dd>{editor.weightLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">주종목</dt>
                <dd>{editor.primarySport ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs">전적</dt>
                <dd className="font-medium tabular-nums">{editor.recordSummary}</dd>
              </div>
            </dl>
          </section>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">표시 이름</span>
            <input
              name="displayName"
              defaultValue={editor.displayName}
              required
              className={inputClass}
              placeholder="공개 프로필에 표시할 이름"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">자기소개</span>
            <textarea
              name="bio"
              rows={4}
              defaultValue={editor.bio}
              className={`${inputClass} min-h-[80px] py-2`}
              placeholder="간단한 소개를 작성해 주세요."
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">SNS 링크</legend>
            <p className="text-muted-foreground text-xs">
              https:// 로 시작하는 전체 URL을 입력해 주세요.
            </p>
            <div className="grid gap-3 sm:grid-cols-1">
              <label className="block space-y-1 text-sm">
                <span>Instagram</span>
                <input
                  name="snsInstagram"
                  defaultValue={editor.snsInstagram}
                  className={inputClass}
                  placeholder="https://instagram.com/..."
                  inputMode="url"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>YouTube</span>
                <input
                  name="snsYoutube"
                  defaultValue={editor.snsYoutube}
                  className={inputClass}
                  placeholder="https://youtube.com/..."
                  inputMode="url"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>TikTok</span>
                <input
                  name="snsTiktok"
                  defaultValue={editor.snsTiktok}
                  className={inputClass}
                  placeholder="https://tiktok.com/..."
                  inputMode="url"
                />
              </label>
            </div>
          </fieldset>

          <div className="space-y-2 rounded-lg border p-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublic"
                value="true"
                checked={isPublicChecked}
                onChange={(e) => setIsPublicChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">공개 프로필로 표시</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  켜면 /fighters/ 경로에서 누구나 볼 수 있습니다. 주최자 공개
                  풀(isPublicToOrganizers)과는 별도 설정입니다.
                </span>
              </span>
            </label>
            {!isPublicChecked ? (
              <p className="text-muted-foreground text-xs">
                공개 프로필이 비활성화되어 있습니다.
              </p>
            ) : editor.publicProfileUrl ? (
              <p className="text-xs">
                <Link
                  href={editor.publicProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  공개 프로필 미리보기
                </Link>
              </p>
            ) : null}
          </div>

          <input type="hidden" name="slug" value={editor.slug} />
        </div>
      </div>

      {state?.ok === false ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok === true ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">
            저장되었습니다.
          </p>
          {savedPublicUrl ? (
            <p className="mt-1">
              <Link
                href={savedPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                공개 프로필 보기
              </Link>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">
              공개 프로필이 비활성화되어 있습니다.
            </p>
          )}
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
