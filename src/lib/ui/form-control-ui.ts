/**
 * MATCHON 업무형 Form Control SSOT (compact density).
 *
 * PC: 36px(default) / 32px(compact)
 * Mobile: touch usable 40px (h-10 md:h-9)
 *
 * Button size는 `@/components/ui/button` cva 와 이 토큰을 맞춘다.
 * Public hero / login CTA 는 별도 예외 토큰을 사용한다.
 */

/** 기본 컨트롤 높이 — Input / Select / Button default */
export const formControlHeightClass =
  "box-border h-10 min-h-10 md:h-9 md:min-h-9";

/** compact — row action / toolbar sm */
export const formControlHeightCompactClass =
  "box-border h-9 min-h-9 md:h-8 md:min-h-8";

/** icon button 정사각 */
export const formControlIconSizeClass = "size-9 md:size-8";

export const formControlRadiusClass = "rounded-lg";

export const formControlTextClass = "text-sm";

export const formControlPaddingXClass = "px-3";

export const formControlBorderFocusClass =
  "border border-matchon-border bg-white shadow-sm placeholder:text-matchon-text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30";

/** Input / Select 기본 */
export const formControlFieldClass = [
  formControlHeightClass,
  "w-full",
  formControlRadiusClass,
  formControlPaddingXClass,
  formControlTextClass,
  formControlBorderFocusClass,
].join(" ");

/** compact field (inline row) */
export const formControlFieldCompactClass = [
  formControlHeightCompactClass,
  "w-full",
  formControlRadiusClass,
  formControlPaddingXClass,
  formControlTextClass,
  formControlBorderFocusClass,
].join(" ");

/** Select — Input과 동일 높이 강제 */
export const formControlSelectClass = formControlFieldClass;

export const formControlSelectCompactClass = formControlFieldCompactClass;

/** Textarea */
export const formControlTextareaClass = [
  "box-border min-h-[80px] w-full",
  formControlRadiusClass,
  "px-3 py-2",
  formControlTextClass,
  formControlBorderFocusClass,
].join(" ");

export const formControlTextareaCompactClass = [
  "box-border min-h-[72px] w-full",
  formControlRadiusClass,
  "px-3 py-2",
  formControlTextClass,
  formControlBorderFocusClass,
].join(" ");

export const formControlTextareaTallClass = [
  "box-border min-h-[120px] w-full",
  formControlRadiusClass,
  "px-3 py-2",
  formControlTextClass,
  formControlBorderFocusClass,
].join(" ");

/** Label */
export const formControlLabelClass =
  "text-sm font-medium text-matchon-text-primary";

export const formControlLabelMutedClass =
  "text-sm font-medium text-matchon-text-secondary";

/** label ↔ field gap */
export const formControlLabelGapClass = "gap-1.5";

export const formControlFieldStackClass = `flex flex-col ${formControlLabelGapClass}`;

/** form vertical rhythm */
export const formControlFormGapClass = "gap-3";

export const formControlSectionGapClass = "gap-4";

export const formControlInlineRowClass =
  "flex flex-wrap items-center gap-2";

/** checkbox row */
export const formControlCheckboxRowClass =
  "flex cursor-pointer items-center gap-2 text-sm";

/**
 * 업무형 저장 CTA — full-width 금지.
 * PC에서 inline compact button.
 */
export const formControlSaveButtonClass =
  "inline-flex w-auto shrink-0";

/** Login 전용 — 모바일 줌 방지·터치 (예외) */
export const formControlLoginInputClass = [
  "box-border h-11 min-h-11 w-full text-base",
  formControlRadiusClass,
  "px-3.5",
  formControlBorderFocusClass,
].join(" ");
