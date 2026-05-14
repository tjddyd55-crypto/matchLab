export function ApplicationAgreementChecklist({
  streamingAgreementRequired,
  streamingNoticeText,
}: {
  streamingAgreementRequired: boolean;
  streamingNoticeText: string | null;
}) {
  return (
    <fieldset className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <legend className="px-1 text-sm font-medium">
        필수 동의 (신청 시 스냅샷으로 저장됩니다)
      </legend>
      <label className="flex cursor-pointer gap-2 text-sm">
        <input
          type="checkbox"
          name="rulesAgreed"
          className="mt-1 size-4 accent-primary"
          required
        />
        대회 규정 및 안내를 확인했으며 이를 준수합니다.
      </label>
      <label className="flex cursor-pointer gap-2 text-sm">
        <input
          type="checkbox"
          name="privacyAgreed"
          className="mt-1 size-4 accent-primary"
          required
        />
        개인정보 수집·이용에 동의합니다.
      </label>
      <label className="flex cursor-pointer gap-2 text-sm">
        <input
          type="checkbox"
          name="resultDisclosureAgreed"
          className="mt-1 size-4 accent-primary"
          required
        />
        경기 결과 공개·전적 반영에 동의합니다.
      </label>
      <label className="flex cursor-pointer gap-2 text-sm">
        <input
          type="checkbox"
          name="photoVideoAgreed"
          className="mt-1 size-4 accent-primary"
          required
        />
        대회 중 사진·영상 촬영이 진행될 수 있음을 확인했습니다.
      </label>

      {streamingAgreementRequired ? (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/15 p-3">
          <div className="text-sm font-medium text-amber-950 dark:text-amber-100">
            촬영·스트리밍 동의 (필수)
          </div>
          {streamingNoticeText ? (
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {streamingNoticeText}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              본 대회는 라이브 스트리밍 또는 녹화 송출이 포함될 수 있습니다.
            </p>
          )}
          <label className="mt-3 flex cursor-pointer gap-2 text-sm">
            <input
              type="checkbox"
              name="streamingAgreed"
              className="mt-1 size-4 accent-primary"
              required={streamingAgreementRequired}
            />
            안내를 확인했으며 송출·녹화에 동의합니다.
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
