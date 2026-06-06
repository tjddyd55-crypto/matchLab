import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventSubpageHeader({
  slug,
  title,
  eventTitle,
  description,
}: {
  slug: string;
  title: string;
  eventTitle: string;
  description?: string;
}) {
  return (
    <header className="mb-2 space-y-2">
      <Link
        href={`/events/${slug}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        ← 행사 안내
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm">{eventTitle}</p>
      {description ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      ) : null}
    </header>
  );
}
