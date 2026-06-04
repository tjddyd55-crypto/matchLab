/** 체육관 주소에서 시·도 / 시·군·구만 추출 (상세주소 미노출) */

export type PublicRegionParts = {
  sido: string;
  sigungu: string;
  label: string;
};

const SIDO_PATTERNS = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "강원도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
  "제주도",
];

export function parseRegionFromGymAddress(
  address: string | null | undefined,
): PublicRegionParts {
  const raw = address?.trim() ?? "";
  if (!raw) {
    return { sido: "미상", sigungu: "", label: "미상" };
  }

  let sido = "";
  let rest = raw;
  for (const p of SIDO_PATTERNS) {
    if (raw.startsWith(p)) {
      sido = p;
      rest = raw.slice(p.length).trim();
      break;
    }
  }

  if (!sido) {
    const first = raw.split(/\s+/)[0] ?? raw;
    sido = first;
    rest = raw.slice(first.length).trim();
  }

  const sigungu = rest.split(/\s+/)[0] ?? "";
  const label = sigungu ? `${sido} ${sigungu}`.trim() : sido;

  return { sido, sigungu, label };
}
