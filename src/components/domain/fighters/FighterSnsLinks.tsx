import { ExternalLink } from "lucide-react";
import { snsPlatformLabel } from "@/lib/validators/sns-url";

type SnsEntry = {
  platform: "instagram" | "youtube" | "tiktok";
  url: string;
};

export function FighterSnsLinks({
  instagram,
  youtube,
  tiktok,
  variant = "buttons",
}: {
  instagram?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  variant?: "buttons" | "inline";
}) {
  const entries: SnsEntry[] = [];
  if (instagram?.trim()) entries.push({ platform: "instagram", url: instagram });
  if (youtube?.trim()) entries.push({ platform: "youtube", url: youtube });
  if (tiktok?.trim()) entries.push({ platform: "tiktok", url: tiktok });

  if (entries.length === 0) return null;

  if (variant === "inline") {
    return (
      <ul className="flex flex-wrap gap-2">
        {entries.map((e) => (
          <li key={e.platform}>
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
            >
              {snsPlatformLabel(e.platform)}
              <ExternalLink className="size-3.5 opacity-60" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((e) => (
        <a
          key={e.platform}
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ring-foreground/10 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-sm font-medium ring-1 transition-colors hover:bg-muted"
        >
          {snsPlatformLabel(e.platform)}
          <ExternalLink className="size-3.5 opacity-50" aria-hidden />
        </a>
      ))}
    </div>
  );
}
