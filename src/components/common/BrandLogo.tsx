import Image from "next/image";
import Link from "next/link";
import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_PATH,
  BRAND_NAME,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: {
    img: "h-7 w-auto max-w-[7rem]",
    text: "text-sm font-semibold",
  },
  md: {
    img: "h-8 w-auto max-w-[8rem] md:h-9",
    text: "text-base font-semibold",
  },
  lg: {
    img: "h-10 w-auto max-w-[10rem]",
    text: "text-lg font-semibold",
  },
} as const;

type BrandLogoProps = {
  size?: keyof typeof sizeClasses;
  showText?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = "md",
  showText = false,
  className,
  href,
  priority = false,
}: BrandLogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={BRAND_LOGO_PATH}
        alt={BRAND_LOGO_ALT}
        width={160}
        height={48}
        className={cn("object-contain", sizeClasses[size].img)}
        priority={priority}
      />
      {showText ? (
        <span className={cn("tracking-tight", sizeClasses[size].text)}>
          {BRAND_NAME}
        </span>
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
