import { sanitizePrintFilenamePart } from "@/lib/brackets/bracket-print-format";

export type WeighInSheetAthleteRow = {
  applicationId: string;
  fighterName: string;
  genderLabel: string;
  birthDateLabel: string;
  divisionCategoryLabel: string;
  weightClassLabel: string;
  applicationWeightLabel: string;
};

export type WeighInSheetGymGroup = {
  gymKey: string;
  gymName: string;
  athletes: WeighInSheetAthleteRow[];
};

export type WeighInSheetDocument = {
  eventId: string;
  eventTitle: string;
  eventDateLabel: string;
  printedAtLabel: string;
  documentTitle: string;
  groups: WeighInSheetGymGroup[];
};

export function buildWeighInSheetFilename(params: {
  eventTitle: string;
  printedAt: Date;
}): string {
  const y = params.printedAt.getFullYear();
  const m = String(params.printedAt.getMonth() + 1).padStart(2, "0");
  const d = String(params.printedAt.getDate()).padStart(2, "0");
  const ymd = `${y}${m}${d}`;
  const title = sanitizePrintFilenamePart(params.eventTitle);
  return `${title}_계체기록지_${ymd}.pdf`;
}

export function formatWeighInSheetApplicationWeightKg(
  kg: number | null | undefined,
): string {
  if (kg == null || !Number.isFinite(kg)) return "—";
  const rounded = Number.isInteger(kg) ? String(kg) : String(kg);
  return `${rounded}kg`;
}
