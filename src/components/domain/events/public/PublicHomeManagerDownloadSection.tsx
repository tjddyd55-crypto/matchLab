import { PublicManagerDownloadButton } from "@/components/domain/events/public/PublicManagerDownloadButton";
import { PUBLIC_CONTENT_CONTAINER_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { MatchonManagerDownloadInfo } from "@/lib/desktop/manager-download";
import { cn } from "@/lib/utils";

const managerPoints = [
  "전체 경기 편집",
  "경기장별 운영",
  "계체 확인",
  "PDF 출력",
  "경기 결과 관리",
] as const;

export function PublicHomeManagerDownloadSection({
  download,
}: {
  download: MatchonManagerDownloadInfo | null;
}) {
  return (
    <section
      id="manager"
      aria-labelledby="home-manager-download-title"
      className="bg-white py-14 md:py-20"
    >
      <div
        className={cn(
          PUBLIC_CONTENT_CONTAINER_CLASS,
          "grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]",
        )}
      >
        <div className="min-w-0 space-y-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary">
            MATCHON Manager
          </p>
          <h2
            id="home-manager-download-title"
            className="font-black text-[28px] tracking-tight text-matchon-text-primary md:text-[32px]"
          >
            현장에서는 MATCHON Manager로
          </h2>
          <p className="max-w-xl text-[15px] leading-relaxed text-matchon-text-secondary md:text-base">
            대회 당일에는 넓은 PC 화면에서 경기와 선수 정보를 빠르게
            관리하세요. 웹에서 준비한 대회를 Manager로 이어서 운영할 수
            있습니다.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {managerPoints.map((point) => (
              <li
                key={point}
                className="rounded-xl border border-matchon-border bg-matchon-surface px-3.5 py-2.5 text-[13px] font-semibold text-matchon-text-primary"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-matchon-border bg-matchon-primary-light/35 p-6 md:p-8">
          <p className="text-[13px] font-bold text-matchon-primary-dark">
            Windows용 PC 프로그램
          </p>
          <p className="mt-1 text-[20px] font-black text-matchon-text-primary">
            {download?.productName ?? "MATCHON Manager"}
          </p>
          <p className="mt-2 text-[13px] text-matchon-text-secondary">
            {download
              ? `${download.osLabel} · v${download.version}`
              : "버전 정보를 불러오는 중이거나 일시적으로 사용할 수 없습니다."}
          </p>
          <div className="mt-6">
            <PublicManagerDownloadButton
              download={download}
              className="w-full justify-center"
              label="Windows용 MATCHON Manager 다운로드"
              showVersion
            />
          </div>
        </div>
      </div>
    </section>
  );
}
