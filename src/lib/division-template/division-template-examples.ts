import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import type { DivisionTemplateSportType } from "@/lib/division-template/division-template-constants";
import { parseQuickWeightClassInput } from "@/lib/division-template/division-template-parse";

function rowsForSection(
  sportType: string,
  ageGroup: string,
  gender: "male" | "female",
  quickText: string,
  startOrder: number,
): DivisionTemplateItemInput[] {
  return parseQuickWeightClassInput(quickText, {
    sportType,
    ageGroup,
    gender,
    startOrder,
  });
}

function buildSportExampleRows(sportType: DivisionTemplateSportType): DivisionTemplateItemInput[] {
  const rows: DivisionTemplateItemInput[] = [];
  let order = 0;

  const sections: Array<{
    ageGroup: string;
    male: string;
    female: string;
  }> = [
    {
      ageGroup: "초등부",
      male: "핀급 -30kg / 라이트플라이급 -32kg / 플라이급 -34kg / 밴텀급 -36kg / 헤비급 +44kg",
      female:
        "핀급 -30kg / 라이트플라이급 -32kg / 플라이급 -34kg / 밴텀급 -36kg / 헤비급 +44kg",
    },
    {
      ageGroup: "중등부",
      male: "라이트플라이급 -45kg / 플라이급 -48kg / 밴텀급 -51kg / 페더급 -54kg / 라이트급 -57kg / 웰터급 -63.5kg / 미들급 -75kg / 헤비급 +91kg",
      female:
        "라이트플라이급 -42kg / 플라이급 -45kg / 밴텀급 -48kg / 페더급 -51kg / 라이트급 -54kg / 웰터급 -60kg / 헤비급 +75kg",
    },
    {
      ageGroup: "고등부",
      male: "라이트플라이급 -48kg / 플라이급 -51kg / 밴텀급 -54kg / 페더급 -57kg / 라이트급 -60kg / 웰터급 -67kg / 미들급 -75kg / 헤비급 +91kg",
      female:
        "라이트플라이급 -45kg / 플라이급 -48kg / 밴텀급 -51kg / 페더급 -54kg / 라이트급 -57kg / 웰터급 -63kg / 헤비급 +81kg",
    },
    {
      ageGroup: "대학·일반부",
      male: "라이트플라이급 -52kg / 플라이급 -56kg / 밴텀급 -60kg / 페더급 -65kg / 라이트급 -70kg / 웰터급 -77kg / 미들급 -84kg / 헤비급 +91kg",
      female:
        "라이트플라이급 -48kg / 플라이급 -52kg / 밴텀급 -56kg / 페더급 -60kg / 라이트급 -65kg / 웰터급 -70kg / 헤비급 +81kg",
    },
  ];

  for (const section of sections) {
    rows.push(
      ...rowsForSection(sportType, section.ageGroup, "male", section.male, order),
    );
    order += section.male.split("/").length;
    rows.push(
      ...rowsForSection(
        sportType,
        section.ageGroup,
        "female",
        section.female,
        order,
      ),
    );
    order += section.female.split("/").length;
  }

  return rows;
}

export const DIVISION_TEMPLATE_EXAMPLE_META: Record<
  Exclude<DivisionTemplateSportType, "custom">,
  { title: string; description: string }
> = {
  muaythai: {
    title: "무에타이 체급표 (예시)",
    description:
      "무에타이 종목 기준 예시 체급입니다. 실제 대회 규정에 맞게 수정해 사용하세요.",
  },
  kickboxing: {
    title: "킥복싱 체급표 (예시)",
    description:
      "킥복싱 종목 기준 예시 체급입니다. 실제 대회 규정에 맞게 수정해 사용하세요.",
  },
  boxing: {
    title: "복싱 체급표 (예시)",
    description:
      "복싱 종목 기준 예시 체급입니다. 실제 대회 규정에 맞게 수정해 사용하세요.",
  },
};

export function getDivisionTemplateExampleRows(
  sport: Exclude<DivisionTemplateSportType, "custom">,
): DivisionTemplateItemInput[] {
  return buildSportExampleRows(sport);
}

export function getDivisionTemplateExampleBundle(
  sport: Exclude<DivisionTemplateSportType, "custom">,
): {
  title: string;
  description: string;
  sportType: DivisionTemplateSportType;
  items: DivisionTemplateItemInput[];
} {
  return {
    ...DIVISION_TEMPLATE_EXAMPLE_META[sport],
    sportType: sport,
    items: getDivisionTemplateExampleRows(sport),
  };
}
