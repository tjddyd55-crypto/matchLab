import { Video } from "lucide-react";

type Props = {
  photoRecordingEnabled: boolean;
  videoRecordingEnabled: boolean;
  liveStreamingEnabled: boolean;
  streamingNoticeText: string | null;
};

export function RecordingStreamingNotice({
  photoRecordingEnabled,
  videoRecordingEnabled,
  liveStreamingEnabled,
  streamingNoticeText,
}: Props) {
  const hasAnyRecording =
    photoRecordingEnabled || videoRecordingEnabled || liveStreamingEnabled;

  if (!hasAnyRecording) {
    return (
      <p className="text-muted-foreground text-sm">
        등록된 현장 사진·영상 촬영 및 라이브 스트리밍 안내가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
      <div className="flex items-center gap-2 font-medium">
        <Video className="size-4 shrink-0" aria-hidden />
        촬영·스트리밍 안내
      </div>
      <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
        {photoRecordingEnabled ? (
          <li>현장 사진 촬영이 진행될 수 있습니다.</li>
        ) : null}
        {videoRecordingEnabled ? (
          <li>현장 영상 녹화가 진행될 수 있습니다.</li>
        ) : null}
        {liveStreamingEnabled ? (
          <li className="text-foreground font-medium">
            라이브 스트리밍이 활성화되어 있습니다. 아래 안내를 확인해 주세요.
          </li>
        ) : null}
      </ul>
      {liveStreamingEnabled && streamingNoticeText ? (
        <p className="border-t pt-3 text-sm leading-relaxed whitespace-pre-wrap">
          {streamingNoticeText}
        </p>
      ) : null}
    </div>
  );
}
