import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        /** 경기상태 SSOT — src/lib/ui/match-status-ui.ts */
        matchWaiting:
          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
        matchReady:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
        matchOngoing:
          "border-primary bg-primary font-semibold text-primary-foreground",
        matchFinished:
          "border-emerald-400 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-emerald-50",
        matchCancelled:
          "border-rose-400 bg-rose-600 text-white dark:border-rose-800 dark:bg-rose-800 dark:text-rose-50",
        matchUnknown:
          "border-border bg-muted text-muted-foreground",
        /** 경기결과/현장결과 SSOT — src/lib/ui/field-status-ui.ts */
        resultPending:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
        resultPassed:
          "border-emerald-400 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-emerald-50",
        resultFailedContinue:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
        resultFailedHandicap:
          "border-amber-400 bg-amber-100 font-semibold text-amber-950 dark:border-amber-600 dark:bg-amber-900/60 dark:text-amber-50",
        resultFailedCancelled:
          "border-rose-400 bg-rose-600 text-white dark:border-rose-800 dark:bg-rose-800 dark:text-rose-50",
        resultDisqualified:
          "border-rose-500 bg-rose-700 text-white dark:border-rose-800 dark:bg-rose-900 dark:text-rose-50",
        resultConfirmed:
          "border-primary bg-primary font-semibold text-primary-foreground",
        resultUnknown:
          "border-border bg-muted text-muted-foreground",
        /** 신청/입금 SSOT — src/lib/ui/application-status-ui.ts */
        applicationApproved:
          "border-emerald-400 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-emerald-50",
        applicationPending:
          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
        applicationCancelled:
          "border-rose-400 bg-rose-600 text-white dark:border-rose-800 dark:bg-rose-800 dark:text-rose-50",
        paymentPaid:
          "border-primary bg-primary font-semibold text-primary-foreground",
        paymentUnpaid:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
        /** 대전방식 SSOT — src/lib/ui/bout-format-ui.ts */
        boutTournament:
          "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100",
        boutOneMatch:
          "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100",
        boutPublicSparring:
          "border-primary bg-primary/10 font-semibold text-primary dark:bg-primary/20",
        /** 계체 SSOT — src/lib/ui/field-status-ui.ts */
        weighPending:
          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
        weighPassed:
          "border-emerald-400 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-emerald-50",
        weighFailed:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
        weighDisqualified:
          "border-rose-400 bg-rose-600 text-white dark:border-rose-800 dark:bg-rose-800 dark:text-rose-50",
        /** @deprecated matchOngoing 사용 */
        matchInProgress:
          "border-primary bg-primary font-semibold text-primary-foreground",
        /** @deprecated matchReady 사용 */
        matchDelayed:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
