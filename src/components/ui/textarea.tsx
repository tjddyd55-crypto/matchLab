import * as React from "react";

import { cn } from "@/lib/utils";
import {
  formControlTextareaClass,
  formControlTextareaCompactClass,
  formControlTextareaRowsDefault,
  formControlTextareaTallClass,
} from "@/lib/ui/form-control-ui";

type TextareaProps = React.ComponentProps<"textarea"> & {
  /** `compact` / `tall` 은 의도적으로 작거나 큰 입력용 */
  variant?: "default" | "compact" | "tall";
};

function Textarea({
  className,
  variant = "default",
  rows,
  ...props
}: TextareaProps) {
  const variantClass =
    variant === "compact"
      ? formControlTextareaCompactClass
      : variant === "tall"
        ? formControlTextareaTallClass
        : formControlTextareaClass;

  return (
    <textarea
      data-slot="textarea"
      rows={rows ?? formControlTextareaRowsDefault}
      className={cn(variantClass, className)}
      {...props}
    />
  );
}

export { Textarea, formControlTextareaRowsDefault };
