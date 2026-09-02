import { buildJudgeScoreSheetRoundLabels } from "@/lib/judge-score-sheet/format";
import type { JudgeScoreSheetDocumentDto } from "@/lib/judge-score-sheet/types";

function CornerCard({
  side,
  name,
  gymName,
}: {
  side: "RED" | "BLUE";
  name: string;
  gymName: string;
}) {
  return (
    <div
      className={
        side === "RED"
          ? "judge-score-sheet-corner judge-score-sheet-corner--red"
          : "judge-score-sheet-corner judge-score-sheet-corner--blue"
      }
    >
      <div className="judge-score-sheet-corner-badge">{side}</div>
      <div className="judge-score-sheet-corner-name">{name}</div>
      <div className="judge-score-sheet-corner-gym">{gymName}</div>
    </div>
  );
}

export function JudgeScoreSheetDocumentView({
  doc,
}: {
  doc: JudgeScoreSheetDocumentDto;
}) {
  if (doc.pages.length === 0) {
    return (
      <div className="judge-score-sheet-document">
        <p className="judge-score-sheet-empty">
          출력할 경기가 없습니다. (양쪽 선수 배정·취소되지 않은 경기만 포함)
        </p>
      </div>
    );
  }

  return (
    <div className="judge-score-sheet-document">
      {doc.pages.map((page, index) => {
        const roundLabels = buildJudgeScoreSheetRoundLabels(
          page.match.roundCount,
        );
        return (
          <article
            key={`${page.judgeNumber}-${page.match.matchId}-${index}`}
            className="judge-score-sheet-sheet"
          >
            <header className="judge-score-sheet-top">
              <h1 className="judge-score-sheet-judge-title">
                {page.judgeTitle}
              </h1>
              <p className="judge-score-sheet-event-name">{doc.eventName}</p>
            </header>

            <div className="judge-score-sheet-meta">
              <div className="judge-score-sheet-meta-item">
                <span className="judge-score-sheet-meta-label">경기번호</span>
                <div className="judge-score-sheet-meta-value">
                  {page.match.matchNoLabel}
                </div>
              </div>
              <div className="judge-score-sheet-meta-item">
                <span className="judge-score-sheet-meta-label">장소</span>
                <div className="judge-score-sheet-meta-value">
                  {page.match.venueName ?? "—"}
                </div>
              </div>
              <div className="judge-score-sheet-meta-item">
                <span className="judge-score-sheet-meta-label">체급/부문</span>
                <div className="judge-score-sheet-meta-value">
                  {page.match.divisionLabel ?? "—"}
                </div>
              </div>
            </div>

            <div className="judge-score-sheet-corners">
              <CornerCard
                side="RED"
                name={page.match.red.name}
                gymName={page.match.red.gymName}
              />
              <CornerCard
                side="BLUE"
                name={page.match.blue.name}
                gymName={page.match.blue.gymName}
              />
            </div>

            <div className="judge-score-sheet-manual">
              <div className="judge-score-sheet-write-line">
                <span className="judge-score-sheet-write-label">심판 이름</span>
              </div>
              <div className="judge-score-sheet-write-line">
                <span className="judge-score-sheet-write-label">서명</span>
              </div>
            </div>

            <table className="judge-score-sheet-table">
              <thead>
                <tr>
                  <th>라운드</th>
                  <th>RED 점수</th>
                  <th>BLUE 점수</th>
                  <th>RED 감점</th>
                  <th>BLUE 감점</th>
                </tr>
              </thead>
              <tbody>
                {roundLabels.map((label) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td aria-label={`${label} RED 점수`} />
                    <td aria-label={`${label} BLUE 점수`} />
                    <td aria-label={`${label} RED 감점`} />
                    <td aria-label={`${label} BLUE 감점`} />
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="judge-score-sheet-decision">
              <div className="judge-score-sheet-decision-title">판정</div>
              <div className="judge-score-sheet-decision-options">
                <span className="judge-score-sheet-check">
                  <span className="judge-score-sheet-checkbox" aria-hidden />
                  RED 승
                </span>
                <span className="judge-score-sheet-check">
                  <span className="judge-score-sheet-checkbox" aria-hidden />
                  BLUE 승
                </span>
                <span className="judge-score-sheet-check">
                  <span className="judge-score-sheet-checkbox" aria-hidden />
                  무승부
                </span>
              </div>
            </div>

            <div className="judge-score-sheet-notes">
              <div className="judge-score-sheet-notes-title">특이사항</div>
              <div className="judge-score-sheet-notes-lines">
                <div className="judge-score-sheet-notes-line" />
                <div className="judge-score-sheet-notes-line" />
                <div className="judge-score-sheet-notes-line" />
              </div>
            </div>

            <footer className="judge-score-sheet-footer">{doc.footerNote}</footer>
          </article>
        );
      })}
    </div>
  );
}
