"use client";

import type { DivisionTemplateItemInput } from "@/lib/validators/division-template.validator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY_ROW: DivisionTemplateItemInput = {
  sportType: "",
  ruleType: "",
  gender: "",
  ageGroup: "",
  weightClass: "",
  skillLevel: "",
};

export function DivisionTemplateItemsEditor({
  items,
  onChange,
}: {
  items: DivisionTemplateItemInput[];
  onChange: (next: DivisionTemplateItemInput[]) => void;
}) {
  const updateRow = (
    idx: number,
    patch: Partial<DivisionTemplateItemInput>,
  ) => {
    const next = items.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs leading-relaxed">
          종목·부문은 필수입니다. 빈 행은 저장 시 제외됩니다.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...items, { ...EMPTY_ROW }])}
        >
          행 추가
        </Button>
      </div>
      <div className="space-y-2 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-2 py-2 font-medium">종목·부문</th>
              <th className="px-2 py-2 font-medium">룰</th>
              <th className="px-2 py-2 font-medium">성별</th>
              <th className="px-2 py-2 font-medium">연령</th>
              <th className="px-2 py-2 font-medium">체급</th>
              <th className="px-2 py-2 font-medium">실력</th>
              <th className="w-[72px] px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr key={idx} className="border-b align-middle">
                <td className="px-2 py-1">
                  <input
                    className={cn(
                      "border-input bg-background h-8 w-full rounded border px-1",
                    )}
                    value={row.sportType}
                    onChange={(e) =>
                      updateRow(idx, { sportType: e.target.value })
                    }
                    maxLength={120}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className={cn(
                      "border-input bg-background h-8 w-full rounded border px-1",
                    )}
                    value={row.ruleType ?? ""}
                    onChange={(e) =>
                      updateRow(idx, { ruleType: e.target.value || null })
                    }
                    maxLength={120}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className={cn(
                      "border-input bg-background h-8 w-full rounded border px-1",
                    )}
                    value={row.gender ?? ""}
                    onChange={(e) =>
                      updateRow(idx, { gender: e.target.value || null })
                    }
                    maxLength={80}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className={cn(
                      "border-input bg-background h-8 w-full rounded border px-1",
                    )}
                    value={row.ageGroup ?? ""}
                    onChange={(e) =>
                      updateRow(idx, { ageGroup: e.target.value || null })
                    }
                    maxLength={120}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className={cn(
                      "border-input bg-background h-8 w-full rounded border px-1",
                    )}
                    value={row.weightClass ?? ""}
                    onChange={(e) =>
                      updateRow(idx, { weightClass: e.target.value || null })
                    }
                    maxLength={120}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className={cn(
                      "border-input bg-background h-8 w-full rounded border px-1",
                    )}
                    value={row.skillLevel ?? ""}
                    onChange={(e) =>
                      updateRow(idx, { skillLevel: e.target.value || null })
                    }
                    maxLength={120}
                  />
                </td>
                <td className="px-2 py-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => removeRow(idx)}
                  >
                    삭제
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
