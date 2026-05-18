import Image from "next/image";
import type { PublicEventDetailDTO } from "@/lib/dto/public";

export function PublicEventGallery({
  images,
}: {
  images: PublicEventDetailDTO["galleryImages"];
}) {
  if (images.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">현장·상세 사진</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {images.map((im) => (
          <li
            key={im.id}
            className="flex flex-col gap-2 overflow-hidden rounded-xl border bg-card shadow-sm"
          >
            <div className="relative aspect-[4/3] w-full bg-muted">
              <Image
                src={im.imageUrl}
                alt={im.caption ?? "대회 상세 이미지"}
                fill
                className="object-cover"
                sizes="(max-width:768px)100vw,50vw"
                unoptimized
              />
            </div>
            {im.caption ? (
              <p className="text-muted-foreground px-3 pb-3 text-xs leading-relaxed">
                {im.caption}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
