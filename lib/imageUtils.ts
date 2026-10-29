/**
 * Utilities for analyzing images in the browser:
 * - Detecting background color
 * - Extracting the 2 major colors from a company logo (Primary & Secondary)
 * - Dynamically theming the HRM application
 * - Resetting to default theme when no company logo is uploaded
 */

// In-memory caches so we only analyze any image URL once per session
const bgColorCache = new Map<string, string | null>();
const twoColorCache = new Map<string, ExtractedBrandColors | null>();

/** Harbor & Pine — the product default used when a company has no custom branding. */
export const DEFAULT_BRAND_PRIMARY = "#0f766e";
export const DEFAULT_BRAND_SECONDARY = "#0284c7";

/** The old hard-coded default still present on settings records created before branding v2. */
const LEGACY_DEFAULT_PRIMARY = "#2563eb";

export type BrandingThemeSource = "default" | "logo" | "custom";

export interface BrandingSettingsLike {
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  themeSource?: BrandingThemeSource | null;
}

export interface ExtractedBrandColors {
  primary: string;   // 1st major brand color (Hex)
  secondary: string; // 2nd major brand color (Hex)
}

/**
 * Returns true for the built-in NexusHR logo assets. These are intentionally
 * excluded from brand-color extraction.
 */
export function isDefaultLogo(imageSrc?: string | null): boolean {
  if (!imageSrc) return false;
  const normalized = imageSrc.toLowerCase().trim();
  return (
    normalized === "/logo.png" ||
    normalized === "/favicon.png" ||
    normalized === "/favicon.ico" ||
    normalized.endsWith("favicon.png") ||
    normalized.endsWith("favicon.ico")
  );
}

/**
 * Validates and normalizes a hex color. Returns null for anything that is not
 * a 3- or 6-digit hex value, so an invalid saved value can never crash the
 * theme helpers.
 */
export function normalizeHexColor(value?: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((c) => c + c).join("")
    : match[1];
  return `#${hex.toLowerCase()}`;
}

/**
 * Resolves which branding strategy a company settings record uses.
 * Existing records (saved before `themeSource` existed) are inferred so that
 * previously customized colors keep working and logo-only companies keep their
 * automatic logo theme.
 */
export function resolveThemeSource(settings?: BrandingSettingsLike | null): BrandingThemeSource {
  if (!settings) return "default";

  if (
    settings.themeSource === "custom" ||
    settings.themeSource === "logo" ||
    settings.themeSource === "default"
  ) {
    return settings.themeSource;
  }

  // Legacy inference
  const primary = normalizeHexColor(settings.primaryColor);
  const secondary = normalizeHexColor(settings.secondaryColor);

  if (secondary) return "custom";
  if (primary && primary !== LEGACY_DEFAULT_PRIMARY && primary !== DEFAULT_BRAND_PRIMARY) {
    return "custom";
  }
  if (settings.logo && !isDefaultLogo(settings.logo)) return "logo";

  return "default";
}

/**
 * Returns the two colors that should actually be applied for a settings
 * record. Saved colors win; a deterministic harmony is derived when only a
 * primary color is available.
 */
export function getBrandColorsFromSettings(
  settings?: BrandingSettingsLike | null
): ExtractedBrandColors {
  const primary = normalizeHexColor(settings?.primaryColor) || DEFAULT_BRAND_PRIMARY;
  const secondary =
    normalizeHexColor(settings?.secondaryColor) || rotateHue(primary, 28);

  return { primary, secondary };
}

export interface BrandPalette {
  primary: string;           // Hex, e.g. "#0f766e"
  primaryHover: string;      // Darker shade for buttons & hover states
  primaryActive: string;     // Active press state
  primaryLight: string;      // 12% opacity tint for badges & active tabs
  primaryBorder: string;     // 28% opacity for borders & focus rings
  primaryGlow: string;       // 35% opacity for drop shadows & ambient glows
  textOnPrimary: string;     // White or dark text for accessibility
  secondary: string;         // 2nd brand color
  secondaryHover: string;
  secondaryLight: string;
  textOnSecondary: string;
  accent: string;            // Complementary / analogous accent color
  shades: {
    50: string;
    100: string;
    200: string;
    500: string;
    600: string;
    700: string;
    900: string;
  };
}

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Samples pixel points from the perimeter/corners of an image
 * and determines its dominant background color.
 */
export function detectImageBackgroundColor(imageSrc?: string | null): Promise<string | null> {
  if (!imageSrc || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (bgColorCache.has(imageSrc)) {
    return Promise.resolve(bgColorCache.get(imageSrc) ?? null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (!ctx) {
          cleanup();
          bgColorCache.set(imageSrc, null);
          return resolve(null);
        }

        const width = Math.min(img.naturalWidth || 64, 64);
        const height = Math.min(img.naturalHeight || 64, 64);
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const sampleCoords = [
          [0, 0],
          [width - 1, 0],
          [0, height - 1],
          [width - 1, height - 1],
          [Math.floor(width / 2), 0],
          [0, Math.floor(height / 2)],
          [width - 1, Math.floor(height / 2)],
          [Math.floor(width / 2), height - 1],
        ];

        const samples: RgbaColor[] = [];
        let transparentCount = 0;

        for (const [x, y] of sampleCoords) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          const a = pixel[3];

          if (a < 30) {
            transparentCount++;
          } else {
            samples.push({
              r: pixel[0],
              g: pixel[1],
              b: pixel[2],
              a: pixel[3],
            });
          }
        }

        if (transparentCount >= 4 || samples.length === 0) {
          cleanup();
          bgColorCache.set(imageSrc, null);
          return resolve(null);
        }

        const total = samples.reduce(
          (acc, cur) => ({
            r: acc.r + cur.r,
            g: acc.g + cur.g,
            b: acc.b + cur.b,
          }),
          { r: 0, g: 0, b: 0 }
        );

        const avgR = Math.round(total.r / samples.length);
        const avgG = Math.round(total.g / samples.length);
        const avgB = Math.round(total.b / samples.length);

        const detected = `rgb(${avgR}, ${avgG}, ${avgB})`;
        cleanup();
        bgColorCache.set(imageSrc, detected);
        resolve(detected);
      } catch {
        cleanup();
        bgColorCache.set(imageSrc, null);
        resolve(null);
      }
    };

    img.onerror = () => {
      cleanup();
      bgColorCache.set(imageSrc, null);
      resolve(null);
    };

    img.src = imageSrc;
  });
}

/**
 * Extracts the 2 major colors from a company logo image:
 * - primary: The most prominent, saturated brand color
 * - secondary: The second distinct major brand color (or harmonized contrast tone)
 * Returns null if no image is provided or if default placeholder logo is detected.
 */
export function extractTwoMajorLogoColors(imageSrc?: string | null): Promise<ExtractedBrandColors | null> {
  if (!imageSrc || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  // If using default placeholder logo, do not extract custom branding
  if (isDefaultLogo(imageSrc)) {
    return Promise.resolve(null);
  }

  if (twoColorCache.has(imageSrc)) {
    return Promise.resolve(twoColorCache.get(imageSrc) ?? null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (!ctx) {
          cleanup();
          twoColorCache.set(imageSrc, null);
          return resolve(null);
        }

        const width = Math.min(img.naturalWidth || 96, 96);
        const height = Math.min(img.naturalHeight || 96, 96);
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Sample background from corners to avoid sampling canvas backdrop
        const cornerPixels = [
          [imgData[0], imgData[1], imgData[2], imgData[3]],
          [imgData[(width - 1) * 4], imgData[(width - 1) * 4 + 1], imgData[(width - 1) * 4 + 2], imgData[(width - 1) * 4 + 3]],
        ];
        const isCornerTransparent = cornerPixels[0][3] < 30 || cornerPixels[1][3] < 30;

        interface ColorBucket {
          hue: number;
          rTotal: number;
          gTotal: number;
          bTotal: number;
          count: number;
          totalSat: number;
        }

        // 24 hue sectors across 360 degrees (15 degrees per sector)
        const buckets: ColorBucket[] = Array.from({ length: 24 }, (_, i) => ({
          hue: i * 15,
          rTotal: 0,
          gTotal: 0,
          bTotal: 0,
          count: 0,
          totalSat: 0,
        }));

        let darkTextCount = 0;
        let darkTextR = 0, darkTextG = 0, darkTextB = 0;

        const totalPixels = width * height;
        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          // Skip transparent pixels
          if (a < 50) continue;

          // Skip background pixels
          if (!isCornerTransparent) {
            const diffBg = Math.abs(r - cornerPixels[0][0]) + Math.abs(g - cornerPixels[0][1]) + Math.abs(b - cornerPixels[0][2]);
            if (diffBg < 40) continue;
          }

          // Skip pure white/near-white
          if (r > 240 && g > 240 && b > 240) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const saturation = max === 0 ? 0 : delta / max;
          const brightness = max / 255;

          // Track dark text/monochrome branding elements
          if (brightness < 0.22) {
            darkTextCount++;
            darkTextR += r;
            darkTextG += g;
            darkTextB += b;
          }

          // Filter out low-saturation greys
          if (saturation < 0.16 || brightness < 0.12) continue;

          // Calculate Hue [0, 360)
          let hue = 0;
          if (delta !== 0) {
            if (max === r) {
              hue = ((g - b) / delta) % 6;
            } else if (max === g) {
              hue = (b - r) / delta + 2;
            } else {
              hue = (r - g) / delta + 4;
            }
            hue = Math.round(hue * 60);
            if (hue < 0) hue += 360;
          }

          const bucketIdx = Math.min(Math.floor(hue / 15), 23);
          buckets[bucketIdx].rTotal += r;
          buckets[bucketIdx].gTotal += g;
          buckets[bucketIdx].bTotal += b;
          buckets[bucketIdx].count++;
          buckets[bucketIdx].totalSat += saturation;
        }

        // Rank buckets by score
        const scored = buckets
          .filter(b => b.count >= 2)
          .map(b => {
            const avgSat = b.totalSat / b.count;
            const score = b.count * (1 + avgSat * 3.5);
            const r = Math.round(b.rTotal / b.count);
            const g = Math.round(b.gTotal / b.count);
            const bVal = Math.round(b.bTotal / b.count);
            return {
              hue: b.hue,
              hex: rgbToHex(r, g, bVal),
              rgb: { r, g, b: bVal },
              score,
            };
          })
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
          // If no saturated color was found (e.g. monochrome / charcoal logo)
          if (darkTextCount > 4) {
            const r = Math.round(darkTextR / darkTextCount);
            const g = Math.round(darkTextG / darkTextCount);
            const bVal = Math.round(darkTextB / darkTextCount);
            const monoPrimary = rgbToHex(r, g, bVal);
            const result = {
              primary: monoPrimary,
              secondary: adjustBrightness(monoPrimary, 40),
            };
            cleanup();
            twoColorCache.set(imageSrc, result);
            return resolve(result);
          }
          cleanup();
          twoColorCache.set(imageSrc, null);
          return resolve(null);
        }

        // 1. Primary color: the highest scoring chromatic color
        const primaryObj = scored[0];
        const primaryHex = primaryObj.hex;

        // 2. Secondary color: look for a distinct second major color bucket
        let secondaryHex: string | null = null;
        for (let i = 1; i < scored.length; i++) {
          const candidate = scored[i];
          const hueDiff = Math.abs(candidate.hue - primaryObj.hue);
          const wrappedHueDiff = Math.min(hueDiff, 360 - hueDiff);
          
          const rgbDist = Math.sqrt(
            Math.pow(candidate.rgb.r - primaryObj.rgb.r, 2) +
            Math.pow(candidate.rgb.g - primaryObj.rgb.g, 2) +
            Math.pow(candidate.rgb.b - primaryObj.rgb.b, 2)
          );

          // Must have distinct hue or distinct perceptual RGB distance
          if (wrappedHueDiff >= 25 || rgbDist >= 60) {
            secondaryHex = candidate.hex;
            break;
          }
        }

        // If no distinct second hue was found (e.g. single-color logo)
        if (!secondaryHex) {
          if (darkTextCount > 12) {
            const r = Math.round(darkTextR / darkTextCount);
            const g = Math.round(darkTextG / darkTextCount);
            const bVal = Math.round(darkTextB / darkTextCount);
            secondaryHex = rgbToHex(r, g, bVal);
          } else {
            // Harmonious analogous secondary (+32 degrees hue rotation)
            secondaryHex = rotateHue(primaryHex, 32);
          }
        }

        const result: ExtractedBrandColors = {
          primary: primaryHex,
          secondary: secondaryHex,
        };

        cleanup();
        twoColorCache.set(imageSrc, result);
        resolve(result);
      } catch {
        cleanup();
        twoColorCache.set(imageSrc, null);
        resolve(null);
      }
    };

    img.onerror = () => {
      cleanup();
      twoColorCache.set(imageSrc, null);
      resolve(null);
    };

    img.src = imageSrc;
  });
}

/**
 * Extracts the single major brand color (for backward compatibility).
 */
export async function extractMajorLogoColor(imageSrc?: string | null): Promise<string | null> {
  const twoColors = await extractTwoMajorLogoColors(imageSrc);
  return twoColors ? twoColors.primary : null;
}

/**
 * Applies the 2 extracted company colors directly to CSS Custom Properties on document root
 * as the primary and secondary theme colors.
 */
export function applyDynamicCompanyTheme(primaryHex: string, secondaryHex?: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  const primary = normalizeHexColor(primaryHex) || DEFAULT_BRAND_PRIMARY;
  const secondary = normalizeHexColor(secondaryHex) || rotateHue(primary, 28);

  const primaryRgb = hexToRgb(primary);

  // Foreground derived from the actual brand color, not a fixed lightness cutoff.
  const primaryFg = getTextColorOn(primary);
  const secondarySurface = isDark ? adjustBrightness(secondary, -45) : adjustBrightness(secondary, 75);
  const accentSurface = isDark ? adjustBrightness(primary, -50) : adjustBrightness(primary, 80);
  // Keep focus rings visible even when the brand color is a pale yellow/lime.
  const ringColor = ensureReadableBrandText(primary, isDark ? "#0b1220" : "#ffffff", 3);

  // Primary color tokens
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", primaryFg);
  root.style.setProperty("--ring", ringColor);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", primaryFg);
  root.style.setProperty("--sidebar-ring", ringColor);
  root.style.setProperty("--chart-1", primary);

  // Secondary color tokens (adapts gracefully to light/dark surfaces)
  root.style.setProperty("--secondary", secondarySurface);
  root.style.setProperty(
    "--secondary-foreground",
    isDark ? WHITE_ON_DARK : ensureReadableBrandText(secondary, secondarySurface)
  );
  root.style.setProperty("--accent", accentSurface);
  root.style.setProperty("--accent-foreground", ensureReadableBrandText(primary, accentSurface));
  root.style.setProperty("--chart-2", secondary);

  // Brand utility variables
  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--brand-primary-soft", `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.12)`);
  root.style.setProperty("--brand-primary-border", `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.28)`);
  root.style.setProperty("--brand-primary-glow", `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.35)`);
  root.dataset.hasCustomBrand = "true";
}

/**
 * Resets the theme to the system default currently present (Harbor & Pine: #0F766E).
 * Called when a company has not uploaded any logo.
 */
export function resetThemeToDefault() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--primary-foreground");
  root.style.removeProperty("--secondary");
  root.style.removeProperty("--secondary-foreground");
  root.style.removeProperty("--accent");
  root.style.removeProperty("--accent-foreground");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--sidebar-primary");
  root.style.removeProperty("--sidebar-primary-foreground");
  root.style.removeProperty("--sidebar-ring");
  root.style.removeProperty("--chart-1");
  root.style.removeProperty("--chart-2");
  root.style.removeProperty("--brand-primary");
  root.style.removeProperty("--brand-secondary");
  root.style.removeProperty("--brand-primary-soft");
  root.style.removeProperty("--brand-primary-border");
  root.style.removeProperty("--brand-primary-glow");
  delete root.dataset.hasCustomBrand;
}

/**
 * Dynamically syncs the theme from a company logo:
 * - If companyLogo is provided, extracts 2 major colors and applies them as Primary & Secondary.
 * - If companyLogo is NOT provided or empty, restores the default theme currently present.
 */
export async function syncCompanyLogoTheme(companyLogo?: string | null): Promise<ExtractedBrandColors | null> {
  // If company did not upload any logo, preserve default theme
  if (!companyLogo || isDefaultLogo(companyLogo)) {
    resetThemeToDefault();
    return null;
  }

  const colors = await extractTwoMajorLogoColors(companyLogo);
  if (colors) {
    applyDynamicCompanyTheme(colors.primary, colors.secondary);
    return colors;
  } else {
    if (typeof document !== "undefined" && document.documentElement.dataset.hasCustomBrand !== "true") {
      resetThemeToDefault();
    }
    return null;
  }
}

/**
 * Generates a complete brand palette from colors.
 */
export function generatePaletteFromColor(primaryHex: string, secondaryHex?: string): BrandPalette {
  const cleanHex = normalizeHexColor(primaryHex) || DEFAULT_BRAND_PRIMARY;
  const secHex = normalizeHexColor(secondaryHex) || rotateHue(cleanHex, 28);
  const rgb = hexToRgb(cleanHex);
  const secRgb = hexToRgb(secHex);

  const hoverHex = adjustBrightness(cleanHex, -14);
  const activeHex = adjustBrightness(cleanHex, -24);
  const accentHex = rotateHue(cleanHex, 28);

  return {
    primary: cleanHex,
    primaryHover: hoverHex,
    primaryActive: activeHex,
    primaryLight: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
    primaryBorder: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`,
    primaryGlow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
    textOnPrimary: getTextColorOn(cleanHex),
    secondary: secHex,
    secondaryHover: adjustBrightness(secHex, -14),
    secondaryLight: `rgba(${secRgb.r}, ${secRgb.g}, ${secRgb.b}, 0.12)`,
    textOnSecondary: getTextColorOn(secHex),
    accent: accentHex,
    shades: {
      50: adjustBrightness(cleanHex, 75),
      100: adjustBrightness(cleanHex, 60),
      200: adjustBrightness(cleanHex, 40),
      500: cleanHex,
      600: hoverHex,
      700: activeHex,
      900: adjustBrightness(cleanHex, -45),
    },
  };
}

/**
 * Helper to extract logo palette and return full BrandPalette object.
 */
export async function extractLogoPalette(imageSrc?: string | null): Promise<BrandPalette> {
  const colors = await extractTwoMajorLogoColors(imageSrc);
  if (colors) {
    return generatePaletteFromColor(colors.primary, colors.secondary);
  }
  return generatePaletteFromColor("#0f766e", "#3b82f6");
}

/**
 * Applies the generated brand palette directly to CSS Custom Properties.
 */
export function applyBrandPaletteToRoot(palette: BrandPalette) {
  applyDynamicCompanyTheme(palette.primary, palette.secondary);
}

// ---------------- Color Conversion & Manipulation Helpers ----------------

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Adjusts color brightness by percent (-100 to +100).
 */
export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;

  const adj = (val: number) => {
    if (factor > 0) {
      return Math.round(val + (255 - val) * factor);
    } else {
      return Math.round(val + val * factor);
    }
  };

  return rgbToHex(adj(r), adj(g), adj(b));
}

/**
 * Shifts the hue of a hex color by degrees (0 - 360).
 */
export function rotateHue(hex: string, degrees: number): string {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;

  let h = 0;
  const s = max === 0 ? 0 : delta / max;
  const v = max;

  if (delta !== 0) {
    if (max === r / 255) {
      h = (((g - b) / 255) / delta) % 6;
    } else if (max === g / 255) {
      h = ((b - r) / 255) / delta + 2;
    } else {
      h = ((r - g) / 255) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  h = (h + degrees) % 360;

  // Convert HSV back to RGB
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return rgbToHex(
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255)
  );
}

/**
 * Checks whether an RGB or hex color string is perceived as dark.
 */
export function isColorDark(colorStr?: string | null): boolean {
  if (!colorStr) return false;

  let r = 0, g = 0, b = 0;

  if (colorStr.startsWith("#")) {
    const { r: cr, g: cg, b: cb } = hexToRgb(colorStr);
    r = cr;
    g = cg;
    b = cb;
  } else if (colorStr.startsWith("rgb")) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
  } else {
    return false;
  }

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 135;
}

// ---------------- Contrast Engine ----------------
// Solid brand surfaces (buttons, headers, chips) need a foreground that is
// derived from the primary itself. Picking text with a fixed lightness cutoff
// produced near-black labels on saturated reds/corals, which reads as muddy.
// The helpers below follow WCAG luminance maths but bias the choice toward
// white on brand colors, falling back to dark ink only for genuinely light
// tones (yellow, lime, pastels).

const INK_ON_LIGHT = "#0b1220";
const WHITE_ON_DARK = "#ffffff";

/** Minimum white-on-brand contrast we accept before switching to dark ink. */
const BRAND_WHITE_MIN_CONTRAST = 2.2;

/** Converts one sRGB channel (0-255) into linear light for luminance maths. */
function srgbChannelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance of a hex color (0 = black, 1 = white). */
export function getRelativeLuminance(color: string): number {
  const hex = normalizeHexColor(color) ?? color;
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** WCAG contrast ratio between two hex colors (1 - 21). */
export function getContrastRatio(a: string, b: string): number {
  const luminanceA = getRelativeLuminance(a);
  const luminanceB = getRelativeLuminance(b);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks the readable foreground for a solid primary-colored surface.
 *
 * Most brand tones (red, coral, orange, blue, teal, indigo, green) are
 * intended to carry white text. Only genuinely light primaries - yellow,
 * lime, pale pink, mint - should switch to dark ink. When even white is
 * below the threshold we still verify ink actually improves the ratio.
 */
export function getTextColorOn(background: string): string {
  const bg = normalizeHexColor(background) ?? background;
  const whiteContrast = getContrastRatio(bg, WHITE_ON_DARK);

  if (whiteContrast >= BRAND_WHITE_MIN_CONTRAST) return WHITE_ON_DARK;

  const inkContrast = getContrastRatio(bg, INK_ON_LIGHT);
  return inkContrast > whiteContrast ? INK_ON_LIGHT : WHITE_ON_DARK;
}

/**
 * Nudges a brand color toward black (on light surfaces) or white (on dark
 * surfaces) until it is readable as text. Keeps the hue recognisable instead
 * of jumping straight to pure ink.
 */
export function ensureReadableBrandText(
  color: string,
  surface: string,
  minRatio = 4.5
): string {
  const base = normalizeHexColor(color) ?? color;
  if (getContrastRatio(base, surface) >= minRatio) return base;

  const lighten = getRelativeLuminance(surface) < 0.5;

  for (let step = 1; step <= 20; step += 1) {
    const candidate = adjustBrightness(base, lighten ? step * 5 : -step * 5);
    if (getContrastRatio(candidate, surface) >= minRatio) return candidate;
  }

  return getTextColorOn(surface);
}

/**
 * Automatically injects Cloudinary format, quality, and dimension transforms
 * (f_auto,q_auto,w_{width},h_{height},c_limit) into image URLs, reducing image
 * download payloads by up to 90%.
 */
export function getOptimizedImageUrl(
  url?: string | null,
  width = 240,
  height = 240
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  if (url.includes('/upload/f_auto') || url.includes('/upload/q_auto')) {
    return url;
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},h_${height},c_limit/`);
}
