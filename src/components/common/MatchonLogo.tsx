import Link from "next/link";
import { BRAND_LOGO_ALT } from "@/lib/brand";
import { cn } from "@/lib/utils";

const sizeConfig = {
  sm: {
    icon: "h-[18px] w-[14px]",
    wordmark: "text-[12.5px] tracking-[-0.38px]",
    gap: "gap-1.5",
  },
  md: {
    icon: "h-[22px] w-[17px]",
    wordmark: "text-base tracking-[-0.48px]",
    gap: "gap-2",
  },
  lg: {
    icon: "h-7 w-[22px]",
    wordmark: "text-xl tracking-[-0.6px]",
    gap: "gap-2.5",
  },
} as const;

type MatchonLogoProps = {
  variant?: "light" | "dark" | "icon";
  size?: keyof typeof sizeConfig;
  className?: string;
  href?: string;
  priority?: boolean;
};

function MatchonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M11 1.625L20.625 7.125V20.875L11 26.375L1.375 20.875V7.125L11 1.625Z"
        className="fill-matchon-primary"
      />
      <path
        d="M6.1875 10.5625L11 8.5L15.8125 10.5625V17.4375L11 19.5L6.1875 17.4375V10.5625Z"
        fill="white"
      />
      <path
        d="M8.9375 12.9688L11 11.9375L13.0625 12.9688V15.0312L11 16.0625L8.9375 15.0312V12.9688Z"
        className="fill-matchon-primary"
      />
    </svg>
  );
}

function MatchonWordmark({
  variant,
  className,
}: {
  variant: "light" | "dark";
  className?: string;
}) {
  if (variant === "dark") {
    return (
      <span
        className={cn(
          "font-black leading-none text-white",
          className,
        )}
      >
        MATCHON
      </span>
    );
  }

  return (
    <span className={cn("font-black leading-none", className)}>
      <span className="text-matchon-text-primary">MATCH</span>
      <span className="text-matchon-primary">ON</span>
    </span>
  );
}

export function MatchonLogo({
  variant = "light",
  size = "md",
  className,
  href,
}: MatchonLogoProps) {
  const config = sizeConfig[size];
  const content = (
    <span
      className={cn(
        "inline-flex items-center",
        config.gap,
        className,
      )}
      aria-label={BRAND_LOGO_ALT}
    >
      <MatchonIcon className={config.icon} />
      {variant !== "icon" ? (
        <MatchonWordmark variant={variant} className={config.wordmark} />
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
