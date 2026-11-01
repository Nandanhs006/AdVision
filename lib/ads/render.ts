import { createCanvas, Canvas, SKRSContext2D } from "@napi-rs/canvas";
import { StyleSpec, AdCopy, AdAspect } from "../schema";

export interface RenderDimensions {
  width: number;
  height: number;
}

export const ASPECT_DIMENSIONS: Record<AdAspect, RenderDimensions> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

/**
 * Deterministic pseudo-random number generator for reproducible visuals
 */
function createPrng(seedStr: string): () => number {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) {
    s = (s << 5) - s + seedStr.charCodeAt(i);
    s |= 0;
  }
  s = Math.abs(s) || 123456789;

  return function next() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Maps typeStyle tokens to web/system font families
 */
function getFontFamily(typeStyle: string): string {
  switch (typeStyle) {
    case "editorial-serif":
      return "'Georgia', 'Times New Roman', 'Noto Serif', serif";
    case "condensed-bold":
      return "'Arial Black', 'Impact', 'Trebuchet MS', sans-serif";
    case "rounded":
      return "'Arial Rounded MT Bold', 'SF Pro Rounded', 'Helvetica', sans-serif";
    case "geometric-sans":
    default:
      return "'Helvetica Neue', 'Arial', 'Noto Sans', sans-serif";
  }
}

export interface TextFitResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  totalHeight: number;
}

/**
 * Auto-fits and wraps text inside a bounding box, scaling down font size if necessary
 */
export function fitText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startFontSize: number,
  minFontSize = 18,
  fontFamily = "sans-serif",
  fontWeight = "bold"
): TextFitResult {
  let fontSize = startFontSize;

  while (fontSize >= minFontSize) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const lineHeight = fontSize * 1.25;
    const totalHeight = lines.length * lineHeight;

    if (totalHeight <= maxHeight) {
      return { lines, fontSize, lineHeight, totalHeight };
    }

    fontSize -= 2;
  }

  // Fallback at min font size
  ctx.font = `${fontWeight} ${minFontSize}px ${fontFamily}`;
  const lineHeight = minFontSize * 1.25;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return {
    lines,
    fontSize: minFontSize,
    lineHeight,
    totalHeight: lines.length * lineHeight,
  };
}

/**
 * Draws dynamic visual motifs based on motif token and energy
 */
function drawMotif(
  ctx: SKRSContext2D,
  motif: string,
  width: number,
  height: number,
  accent: string,
  energy: number,
  prng: () => number
): void {
  ctx.save();

  if (motif === "circles") {
    const numCircles = Math.floor(4 + energy * 6);
    const centerX = width * (0.3 + prng() * 0.4);
    const centerY = height * (0.3 + prng() * 0.4);

    for (let i = 1; i <= numCircles; i++) {
      ctx.beginPath();
      const radius = (Math.min(width, height) * 0.12) * i;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = Math.max(0.04, 0.22 - i * 0.025);
      ctx.lineWidth = 2 + (i % 2) * 2;
      ctx.stroke();
    }
  } else if (motif === "waves") {
    const numWaves = Math.floor(3 + energy * 4);
    for (let w = 0; w < numWaves; w++) {
      ctx.beginPath();
      const yBase = height * (0.3 + (w / numWaves) * 0.4);
      ctx.moveTo(0, yBase);
      const cp1x = width * 0.3;
      const cp1y = yBase - 60 * energy * (w % 2 === 0 ? 1 : -1);
      const cp2x = width * 0.7;
      const cp2y = yBase + 60 * energy * (w % 2 === 0 ? 1 : -1);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, width, yBase);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.12 + w * 0.04;
      ctx.lineWidth = 3 + w * 2;
      ctx.stroke();
    }
  } else if (motif === "grid") {
    const step = 80 - Math.floor(energy * 30);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1.5;

    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Modern crosshair accents
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const cx = (i % 2 === 0 ? 0.2 : 0.8) * width;
      const cy = (i < 2 ? 0.25 : 0.75) * height;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();
    }
  } else if (motif === "stripes") {
    const numStripes = Math.floor(5 + energy * 8);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    for (let s = 0; s < numStripes; s++) {
      ctx.globalAlpha = 0.08 + (s / numStripes) * 0.15;
      ctx.beginPath();
      const startX = width * 0.1 + s * 45;
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + height * 0.4, height);
      ctx.stroke();
    }
  } else if (motif === "grain") {
    ctx.fillStyle = accent;
    const dots = Math.floor(120 + energy * 150);
    for (let d = 0; d < dots; d++) {
      const gx = prng() * width;
      const gy = prng() * height;
      const rad = 1 + prng() * 3;
      ctx.globalAlpha = 0.06 + prng() * 0.12;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws rounded rectangle button
 */
function drawButton(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  bgColor: string,
  textColor: string,
  text: string,
  fontFamily: string
): void {
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = `bold 24px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

/**
 * Renders an ad creative onto a canvas
 */
export function renderCreativeToCanvas(params: {
  style: StyleSpec;
  copy: AdCopy;
  aspect: AdAspect;
  brandName: string;
  seed?: string;
}): Canvas {
  const { style, copy, aspect, brandName, seed = "advision-ad" } = params;
  const dim = ASPECT_DIMENSIONS[aspect];
  const canvas = createCanvas(dim.width, dim.height);
  const ctx = canvas.getContext("2d");
  const prng = createPrng(`${seed}:${aspect}:${style.layout}`);

  const { palette, typeStyle, layout, motif, energy } = style;
  const fontFamily = getFontFamily(typeStyle);

  // 1. Background Fill
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, dim.width, dim.height);

  // 2. Layout Archetype Specific Base Background Structure
  if (layout === "split-panel") {
    // 50/50 vertical or horizontal split
    const splitY = dim.height * 0.48;
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(0, 0, dim.width, splitY);
    ctx.globalAlpha = 1.0;

    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(dim.width, splitY);
    ctx.stroke();
  } else if (layout === "bold-type") {
    // High-impact accent band
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, dim.height * 0.15, dim.width, dim.height * 0.5);
    ctx.globalAlpha = 1.0;
  } else if (layout === "collage-grid") {
    // Modular quadrants
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, dim.width - 120, dim.height - 120);
    ctx.beginPath();
    ctx.moveTo(dim.width * 0.5, 60);
    ctx.lineTo(dim.width * 0.5, dim.height - 60);
    ctx.moveTo(60, dim.height * 0.55);
    ctx.lineTo(dim.width - 60, dim.height * 0.55);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // 3. Draw Brand Motifs & Accents
  drawMotif(ctx, motif, dim.width, dim.height, palette.accent, energy, prng);

  // 4. Header Bar / Brand Identifier
  ctx.save();
  const paddingX = 80;
  const brandY = 100;

  // Small brand badge pill
  const brandTagText = brandName.toUpperCase();
  ctx.font = `bold 20px ${fontFamily}`;
  const brandMetric = ctx.measureText(brandTagText);
  const badgeWidth = brandMetric.width + 36;
  const badgeHeight = 38;

  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.roundRect(paddingX, brandY - 26, badgeWidth, badgeHeight, 19);
  ctx.fill();

  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = palette.fg;
  ctx.globalAlpha = 0.95;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(brandTagText, paddingX + 18, brandY - 7);
  ctx.restore();

  // 5. Dynamic Typography & Layout Placement
  const contentWidth = dim.width - paddingX * 2;

  if (layout === "minimal-center") {
    // Centered layout with generous whitespace
    const centerY = dim.height * 0.42;

    const headlineFit = fitText(
      ctx,
      copy.headline,
      contentWidth * 0.88,
      dim.height * 0.28,
      64,
      32,
      fontFamily,
      "bold"
    );

    ctx.fillStyle = palette.fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let currentY = centerY - headlineFit.totalHeight / 2;
    for (const line of headlineFit.lines) {
      ctx.fillText(line, dim.width / 2, currentY);
      currentY += headlineFit.lineHeight;
    }

    // Body
    currentY += 28;
    const bodyFit = fitText(
      ctx,
      copy.body,
      contentWidth * 0.8,
      120,
      26,
      20,
      fontFamily,
      "normal"
    );
    ctx.fillStyle = palette.fg;
    ctx.globalAlpha = 0.82;
    for (const line of bodyFit.lines) {
      ctx.fillText(line, dim.width / 2, currentY);
      currentY += bodyFit.lineHeight;
    }
    ctx.globalAlpha = 1.0;

    // CTA
    const buttonWidth = 260;
    const buttonHeight = 64;
    const btnY = Math.min(dim.height - 180, currentY + 50);
    drawButton(
      ctx,
      (dim.width - buttonWidth) / 2,
      btnY,
      buttonWidth,
      buttonHeight,
      32,
      palette.accent,
      palette.bg,
      copy.cta,
      fontFamily
    );
  } else if (layout === "bold-type") {
    // Giant impactful headline
    const headlineFit = fitText(
      ctx,
      copy.headline,
      contentWidth,
      dim.height * 0.4,
      82,
      38,
      fontFamily,
      "bold"
    );

    ctx.fillStyle = palette.fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let currentY = dim.height * 0.22;
    for (const line of headlineFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += headlineFit.lineHeight;
    }

    // Body
    currentY += 24;
    const bodyFit = fitText(
      ctx,
      copy.body,
      contentWidth * 0.85,
      130,
      28,
      20,
      fontFamily,
      "normal"
    );
    ctx.fillStyle = palette.fg;
    ctx.globalAlpha = 0.84;
    for (const line of bodyFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += bodyFit.lineHeight;
    }
    ctx.globalAlpha = 1.0;

    // CTA
    const buttonWidth = 280;
    const buttonHeight = 68;
    const btnY = dim.height - 180;
    drawButton(
      ctx,
      paddingX,
      btnY,
      buttonWidth,
      buttonHeight,
      12,
      palette.accent,
      palette.bg,
      copy.cta,
      fontFamily
    );
  } else if (layout === "split-panel") {
    // Upper motif zone, Lower copy zone
    const lowerZoneY = dim.height * 0.52;

    const headlineFit = fitText(
      ctx,
      copy.headline,
      contentWidth,
      dim.height * 0.22,
      62,
      30,
      fontFamily,
      "bold"
    );

    ctx.fillStyle = palette.fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let currentY = lowerZoneY;
    for (const line of headlineFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += headlineFit.lineHeight;
    }

    currentY += 20;
    const bodyFit = fitText(
      ctx,
      copy.body,
      contentWidth,
      120,
      26,
      18,
      fontFamily,
      "normal"
    );
    ctx.fillStyle = palette.fg;
    ctx.globalAlpha = 0.82;
    for (const line of bodyFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += bodyFit.lineHeight;
    }
    ctx.globalAlpha = 1.0;

    const buttonWidth = 260;
    const buttonHeight = 64;
    drawButton(
      ctx,
      paddingX,
      dim.height - 160,
      buttonWidth,
      buttonHeight,
      32,
      palette.accent,
      palette.bg,
      copy.cta,
      fontFamily
    );
  } else if (layout === "price-badge") {
    // Price / Special Offer Badge Top Right
    const badgeX = dim.width - 200;
    const badgeY = 160;
    ctx.save();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 68, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.bg;
    ctx.font = `bold 22px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OFFER", badgeX, badgeY - 14);
    ctx.font = `bold 30px ${fontFamily}`;
    ctx.fillText("SPECIAL", badgeX, badgeY + 18);
    ctx.restore();

    // Headline
    const headlineFit = fitText(
      ctx,
      copy.headline,
      contentWidth * 0.72,
      dim.height * 0.32,
      70,
      34,
      fontFamily,
      "bold"
    );

    ctx.fillStyle = palette.fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let currentY = 240;
    for (const line of headlineFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += headlineFit.lineHeight;
    }

    currentY += 24;
    const bodyFit = fitText(
      ctx,
      copy.body,
      contentWidth * 0.85,
      120,
      26,
      18,
      fontFamily,
      "normal"
    );
    ctx.fillStyle = palette.fg;
    ctx.globalAlpha = 0.85;
    for (const line of bodyFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += bodyFit.lineHeight;
    }
    ctx.globalAlpha = 1.0;

    const buttonWidth = 270;
    const buttonHeight = 66;
    drawButton(
      ctx,
      paddingX,
      dim.height - 180,
      buttonWidth,
      buttonHeight,
      16,
      palette.accent,
      palette.bg,
      copy.cta,
      fontFamily
    );
  } else {
    // Default / story-vertical / collage-grid
    const headlineFit = fitText(
      ctx,
      copy.headline,
      contentWidth,
      dim.height * 0.3,
      68,
      32,
      fontFamily,
      "bold"
    );

    ctx.fillStyle = palette.fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let currentY = dim.height * 0.28;
    for (const line of headlineFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += headlineFit.lineHeight;
    }

    currentY += 24;
    const bodyFit = fitText(
      ctx,
      copy.body,
      contentWidth * 0.9,
      140,
      26,
      18,
      fontFamily,
      "normal"
    );
    ctx.fillStyle = palette.fg;
    ctx.globalAlpha = 0.84;
    for (const line of bodyFit.lines) {
      ctx.fillText(line, paddingX, currentY);
      currentY += bodyFit.lineHeight;
    }
    ctx.globalAlpha = 1.0;

    const buttonWidth = 260;
    const buttonHeight = 64;
    drawButton(
      ctx,
      paddingX,
      dim.height - 180,
      buttonWidth,
      buttonHeight,
      28,
      palette.accent,
      palette.bg,
      copy.cta,
      fontFamily
    );
  }

  return canvas;
}

/**
 * Exports canvas rendering directly to a PNG Buffer
 */
export async function renderCreativeToPng(params: {
  style: StyleSpec;
  copy: AdCopy;
  aspect: AdAspect;
  brandName: string;
  seed?: string;
}): Promise<Buffer> {
  const canvas = renderCreativeToCanvas(params);
  return canvas.toBuffer("image/png");
}
