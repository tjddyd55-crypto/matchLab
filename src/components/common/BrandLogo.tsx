import { MatchonLogo } from "@/components/common/MatchonLogo";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
  /** @deprecated MatchonLogo variant 사용 권장 */
  variant?: "light" | "dark";
};

/** @deprecated MatchonLogo를 직접 사용하세요. */
export function BrandLogo({
  size = "md",
  showText = false,
  className,
  href,
  variant = "light",
}: BrandLogoProps) {
  return (
    <MatchonLogo
      variant={showText ? variant : "icon"}
      size={size}
      className={className}
      href={href}
    />
  );
}
