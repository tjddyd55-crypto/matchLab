"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useAnchoredPanelStyle(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelWidth = 280,
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const margin = 8;
      let left = rect.left;
      if (left + panelWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - panelWidth - margin);
      }
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const maxHeight = Math.min(240, Math.max(120, spaceBelow));
      setStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left,
        width: panelWidth,
        maxHeight,
        zIndex: 80,
        visibility: "visible",
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, open, panelWidth]);

  return style;
}

export function FilterAnchoredDropdownPanel({
  open,
  anchorRef,
  children,
  onClose,
  panelWidth = 280,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  onClose: () => void;
  panelWidth?: number;
}) {
  const style = useAnchoredPanelStyle(open, anchorRef, panelWidth);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" aria-hidden onClick={onClose} />
      <div
        style={style}
        className="overflow-y-auto rounded-md border bg-popover p-2 shadow-lg"
        role="dialog"
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

/** Multi-select filter button — portal panel (overflow 부모에 잘리지 않음) */
export function FilterMultiSelectButton({
  label,
  options,
  selected,
  onChange,
  formatOption,
  emptyHint = "선택 가능한 항목이 없습니다",
  className,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  formatOption?: (value: string) => string;
  emptyHint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const active = selected.length > 0;
  const listId = `filter-ms-${label}`;

  return (
    <div className="relative shrink-0" ref={anchorRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-9 gap-1 rounded-md px-2.5 text-xs", className)}
        aria-expanded={open}
        aria-controls={listId}
        disabled={options.length === 0}
        title={options.length === 0 ? emptyHint : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {active ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] tabular-nums">
            {selected.length}
          </span>
        ) : null}
      </Button>
      <FilterAnchoredDropdownPanel
        open={open && options.length > 0}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
      >
        <div id={listId} className="space-y-1">
          <div className="mb-1 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 flex-1 text-[11px]"
              onClick={() => onChange([...options])}
            >
              전체 선택
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 flex-1 text-[11px]"
              onClick={() => onChange([])}
            >
              전체 해제
            </Button>
          </div>
          <ul className="space-y-1">
            {options.map((option) => (
              <li key={option}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="size-3.5"
                    checked={selected.includes(option)}
                    onChange={() =>
                      onChange(
                        selected.includes(option)
                          ? selected.filter((item) => item !== option)
                          : [...selected, option],
                      )
                    }
                  />
                  <span className={cn("min-w-0 truncate")}>
                    {formatOption ? formatOption(option) : option}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </FilterAnchoredDropdownPanel>
    </div>
  );
}
