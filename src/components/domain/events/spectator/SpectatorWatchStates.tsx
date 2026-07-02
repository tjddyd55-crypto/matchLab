import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SpectatorWatchNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandLogo size="sm" showText />
      <h1 className="text-xl font-bold">대회를 찾을 수 없습니다.</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        주소가 올바른지 확인해 주세요. QR 코드를 다시 스캔하거나 주최 측에 문의해
        주세요.
      </p>
      <Link href="/events" className={cn(buttonVariants({ variant: "secondary" }))}>
        대회 목록
      </Link>
    </div>
  );
}

export function SpectatorWatchAccessClosed({
  title,
  message,
  slug,
}: {
  title: string;
  message: string;
  slug: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandLogo size="sm" showText />
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
      <Link
        href={`/events/${slug}`}
        className={cn(buttonVariants({ variant: "secondary" }))}
      >
        대회 안내 보기
      </Link>
    </div>
  );
}
