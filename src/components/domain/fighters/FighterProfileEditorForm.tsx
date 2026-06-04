"use client";

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

  const inputClass =
    "border-input h-9 w-full rounded-md border px-3 text-sm";

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border p-4 text-sm space-y-2 bg-muted/30">
        <p>
          <span className="text-muted-foreground">소속</span> {editor.gymName ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">지역</span> {editor.regionLabel}
        </p>
        <p>
          <span className="text-muted-foreground">성별·연령부</span>{" "}
          {editor.gender} · {editor.ageGroup}
        </p>
        <p>
          <span className="text-muted-foreground">체급·종목</span>{" "}
          {editor.weightLabel}
          {editor.primarySport ? ` · ${editor.primarySport}` : ""}
        </p>
        <p>
          <span className="text-muted-foreground">전적</span> {editor.recordSummary}
        </p>
      </section>

      <FighterProfileImageUpload
        fighterId={editor.fighterId}
        initialImageUrl={editor.profileImageUrl}
        imageUrl={profileImage?.url ?? ""}
        imagePath={profileImage?.path ?? ""}
        onImageChange={setProfileImage}
      />

      <label className="block space-y-1 text-sm">
        <span className="font-medium">표시 이름</span>
        <input
          name="displayName"
          defaultValue={editor.displayName}
          required
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">자기소개</span>
        <textarea
          name="bio"
          rows={4}
          defaultValue={editor.bio}
          className={`${inputClass} min-h-[80px] py-2`}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span>Instagram</span>
          <input
            name="snsInstagram"
            defaultValue={editor.snsInstagram}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>YouTube</span>
          <input
            name="snsYoutube"
            defaultValue={editor.snsYoutube}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>TikTok</span>
          <input
            name="snsTiktok"
            defaultValue={editor.snsTiktok}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublic"
          value="true"
          defaultChecked={editor.isPublic}
        />
        공개 프로필로 표시
      </label>
      <input type="hidden" name="slug" value={editor.slug} />

      {editor.publicProfileUrl ? (
        <p className="text-muted-foreground text-xs">
          공개 URL: {editor.publicProfileUrl}
        </p>
      ) : null}

      {state?.ok === false ? (
        <p className="text-destructive text-sm">{state.error.message}</p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-primary text-sm">저장되었습니다.</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
