import { getOptimizedImageUrl } from "../../lib/imageUtils";
import { cn } from "../../lib/utils";

/**
 * Avatar hosts that return a generated initials image with its own baked-in
 * background. Those ignore the workspace theme, so we render themed initials
 * ourselves instead of showing a stale default-colored circle.
 */
const GENERATED_AVATAR_HOSTS = ["ui-avatars.com"];

export function isGeneratedAvatar(src?: string | null): boolean {
  if (!src) return false;
  const lower = src.toLowerCase();
  return GENERATED_AVATAR_HOSTS.some((host) => lower.includes(host));
}

export function getInitials(name?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const SIZES = {
  xs: { box: "h-7 w-7", text: "text-[10px]", pixels: 64 },
  sm: { box: "h-8 w-8", text: "text-xs", pixels: 64 },
  md: { box: "h-10 w-10", text: "text-sm", pixels: 96 },
  lg: { box: "h-14 w-14", text: "text-lg", pixels: 128 },
  xl: { box: "h-24 w-24 sm:h-28 sm:w-28", text: "text-3xl", pixels: 256 },
} as const;

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  imageClassName?: string;
  bordered?: boolean;
}

/**
 * Single avatar primitive: real uploads render as images, everything else
 * (missing photo or an auto-generated placeholder) renders initials on the
 * company's primary color so avatars follow the workspace theme.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
  imageClassName,
  bordered = false,
}: AvatarProps) {
  const dimensions = SIZES[size];
  const showPhoto = Boolean(src) && !isGeneratedAvatar(src);

  if (showPhoto && src) {
    return (
      <img
        src={getOptimizedImageUrl(src, dimensions.pixels, dimensions.pixels)}
        alt={name || "Avatar"}
        loading="lazy"
        className={cn(
          "shrink-0 rounded-full object-cover",
          dimensions.box,
          bordered && "border border-border",
          className,
          imageClassName
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        dimensions.box,
        dimensions.text,
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
