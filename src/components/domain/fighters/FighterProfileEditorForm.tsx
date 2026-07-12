"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateFighterProfileAction } from "@/features/fighter-profile/actions";
import { FighterProfileImageUpload } from "@/components/domain/fighters/FighterProfileImageUpload";
import { FeedbackMessage } from "@/components/shared/FeedbackMessage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FighterProfileEditorDTO } from "@/lib/services/fighter-profile.service";
import {
  fighterDashboardFieldInputClass,
  fighterDashboardFieldTextareaClass,
} from "@/lib/ui/fighter-dashboard-ui";

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

  const savedPublicUrl =
    state?.ok === true ? state.data.publicProfileUrl : null;

  return (
    <form action={formAction} className="space-y-6">
      <Card variant="muted">
        <CardContent className="space-y-2 pt-6 text-sm leading-relaxed text-muted-foreground">
          <p>기본 선수 정보는 소속 체육관에서 관리합니다.</p>
          <p>프로필 사진, 자기소개, SNS 링크는 선수가 직접 수정할 수 있습니다.</p>
          <p>공개 프로필을 켜면 공개 선수 페이지에서 표시될 수 있습니다.</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Card className="w-full shrink-0 lg:w-56">
          <CardHeader>
            <CardTitle className="text-sm">프로필 사진</CardTitle>
          </CardHeader>
          <CardContent>
            <FighterProfileImageUpload
              fighterId={editor.fighterId}
              initialImageUrl={editor.profileImageUrl}
              imageUrl={profileImage?.url ?? ""}
              imagePath={profileImage?.path ?? ""}
              onImageChange={setProfileImage}
            />
          </CardContent>
        </Card>

        <div className="min-w-0 flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본 정보 (읽기 전용)</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">공개 프로필 편집</CardTitle>
              <CardDescription>
                표시 이름, 소개, SNS 링크를 수정할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">표시 이름</span>
                <input
                  name="displayName"
                  defaultValue={editor.displayName}
                  required
                  className={fighterDashboardFieldInputClass}
                  placeholder="공개 프로필에 표시할 이름"
                />
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">자기소개</span>
                <textarea
                  name="bio"
                  rows={4}
                  defaultValue={editor.bio}
                  className={fighterDashboardFieldTextareaClass}
                  placeholder="간단한 소개를 작성해 주세요."
                />
              </label>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">SNS 링크</legend>
                <p className="text-muted-foreground text-xs">
                  https:// 로 시작하는 전체 URL을 입력해 주세요.
                </p>
                <div className="grid gap-3">
                  <label className="block space-y-1.5 text-sm">
                    <span>Instagram</span>
                    <input
                      name="snsInstagram"
                      defaultValue={editor.snsInstagram}
                      className={fighterDashboardFieldInputClass}
                      placeholder="https://instagram.com/..."
                      inputMode="url"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span>YouTube</span>
                    <input
                      name="snsYoutube"
                      defaultValue={editor.snsYoutube}
                      className={fighterDashboardFieldInputClass}
                      placeholder="https://youtube.com/..."
                      inputMode="url"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span>TikTok</span>
                    <input
                      name="snsTiktok"
                      defaultValue={editor.snsTiktok}
                      className={fighterDashboardFieldInputClass}
                      placeholder="https://tiktok.com/..."
                      inputMode="url"
                    />
                  </label>
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">공개 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isPublic"
                  value="true"
                  checked={isPublicChecked}
                  onChange={(e) => setIsPublicChecked(e.target.checked)}
                  className="mt-1"
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
                <FeedbackMessage tone="info" className="text-xs">
                  공개 프로필이 비활성화되어 있습니다.
                </FeedbackMessage>
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
            </CardContent>
          </Card>

          <input type="hidden" name="slug" value={editor.slug} />
        </div>
      </div>

      {state?.ok === false ? (
        <FeedbackMessage tone="error" role="alert">
          {state.error.message}
        </FeedbackMessage>
      ) : null}
      {state?.ok === true ? (
        <FeedbackMessage tone="success">
          <span className="font-medium">저장되었습니다.</span>
          {savedPublicUrl ? (
            <span className="mt-1 block font-normal">
              <Link
                href={savedPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                공개 프로필 보기
              </Link>
            </span>
          ) : (
            <span className="text-muted-foreground mt-1 block text-xs font-normal">
              공개 프로필이 비활성화되어 있습니다.
            </span>
          )}
        </FeedbackMessage>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        size="field"
        className="w-full sm:w-auto"
      >
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
