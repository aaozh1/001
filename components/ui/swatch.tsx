import { cn } from "@/lib/ui/cn";
import { texture, type TextureKind } from "@/lib/ui/texture";

export interface SwatchProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Base color, #rrggbb. */
  color: string;
  /** Material texture overlay (defaults to a flat color). */
  texture?: TextureKind;
  /** Optional caption shown at the bottom of the swatch. */
  label?: string;
}

// Color/material swatch — the CSS-texture stand-in for product photos
// (prototype `.swatch` + texture engine). Reused by the Material Board later.
export function Swatch({
  color,
  texture: kind = "solid",
  label,
  className,
  style,
  ...props
}: SwatchProps) {
  return (
    <div
      className={cn(
        "relative h-[110px] w-full overflow-hidden rounded-card",
        className,
      )}
      style={{ ...texture(color, kind), ...style }}
      {...props}
    >
      {label && (
        <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-black/45 px-2 py-0.5 text-[13.75px] font-medium text-white">
          {label}
        </span>
      )}
    </div>
  );
}
