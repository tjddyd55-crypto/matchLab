import { Card, CardContent } from "@/components/ui/card";

export function ApplicationAgreementChecklist({
  streamingAgreementRequired,
  streamingNoticeText,
}: {
  streamingAgreementRequired: boolean;
  streamingNoticeText: string | null;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">
        필수 동의 (신청 시 스냅샷으로 저장됩니다)
      </legend>
      <label className="flex cursor-pointer gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm hover:bg-muted/30">
        <input
          type="checkbox"
          name="rulesAgreed"
          className="mt-0.5 size-5 accent-primary"
          required
        />
        대회 규정 및 안내를 확인했으며 이를 준수합니다.
      </label>
      <label className="flex cursor-pointer gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm hover:bg-muted/30">
        <input
          type="checkbox"
          name="privacyAgreed"
          className="mt-0.5 size-5 accent-primary"
          required
        />
        개인정보 수집·이용에 동의합니다.
      </label>
      <label className="flex cursor-pointer gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm hover:bg-muted/30">
        <input
          type="checkbox"
          name="resultDisclosureAgreed"
          className="mt-0.5 size-5 accent-primary"
          required
        />
        경기 결과 공개·전적 반영에 동의합니다.
      </label>
      <label className="flex cursor-pointer gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm hover:bg-muted/30">
        <input
          type="checkbox"
          name="photoVideoAgreed"
          className="mt-0.5 size-5 accent-primary"
          required
        />
        대회 중 사진·영상 촬영이 진행될 수 있음을 확인했습니다.
      </label>

      {streamingAgreementRequired ? (
        <Card variant="muted" className="py-3">
          <CardContent className="space-y-3 px-3">
            <div className="text-sm font-medium">촬영·스트리밍 동의 (필수)</div>
            {streamingNoticeText ? (
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {streamingNoticeText}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                본 대회는 라이브 스트리밍 또는 녹화 송출이 포함될 수 있습니다.
              </p>
            )}
            <label className="flex cursor-pointer gap-3 text-sm">
              <input
                type="checkbox"
                name="streamingAgreed"
                className="mt-0.5 size-5 accent-primary"
                required={streamingAgreementRequired}
              />
              안내를 확인했으며 송출·녹화에 동의합니다.
            </label>
          </CardContent>
        </Card>
      ) : null}
    </fieldset>
  );
}
