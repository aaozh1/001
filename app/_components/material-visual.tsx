/* eslint-disable @next/next/no-img-element */
import { Swatch } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { categoryTexture } from "@/lib/materials/categories";

// The material's face: real product photo when one exists, procedural swatch
// otherwise. One component so every surface upgrades the moment a photo is
// uploaded. (Plain <img>: files are local, already sized-capped, and
// next/image can't optimise dynamic /api/files paths without a loader.)
export function MaterialVisual({
  image,
  swatchHex,
  category,
  alt,
  className,
}: {
  image: string | null | undefined;
  swatchHex: string | null | undefined;
  category: string;
  alt: string;
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={alt}
        loading="lazy"
        className={cn("block aspect-[9/5] w-full rounded-card object-cover", className)}
      />
    );
  }
  return (
    <Swatch
      color={swatchHex ?? "#c9c2b4"}
      texture={categoryTexture(category)}
      className={className}
    />
  );
}
