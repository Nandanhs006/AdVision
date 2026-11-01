"use client";

import React, { useRef, useEffect } from "react";
import { Campaign } from "@/lib/schema";

interface AdPosterProps {
  campaign?: Campaign;
  language?: string;
  isNeutral?: boolean;
  isPending?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export function AdPoster({
  campaign,
  language = "en",
  isNeutral = false,
  isPending = false,
  width = 400,
  height = 300,
  className = "",
}: AdPosterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Neutral artwork fallback
    if (isNeutral || (!campaign && !isPending)) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#1c1d22");
      grad.addColorStop(1, "#0d0e12");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural geometric texture
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      for (let i = 0; i < w; i += 28) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 40, h);
        ctx.stroke();
      }

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ARCHITECTURAL MURAL", w / 2, h / 2 - 10);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#71717a";
      ctx.fillText("Neutral in-scene display (Ad-free subscriber)", w / 2, h / 2 + 16);
      return;
    }

    // Pending approval state
    if (isPending) {
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#d19633";
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      ctx.fillStyle = "#d19633";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UNDER EDITORIAL REVIEW", w / 2, h / 2 - 10);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#c3c2b8";
      ctx.fillText("Pending studio approval before broadcast", w / 2, h / 2 + 16);
      return;
    }

    if (!campaign) return;

    // Active Campaign Poster
    const { palette, brandName, headline, cta, publicService } = campaign;
    const langKey = headline[language] ? language : "en";
    const textHeadline = headline[langKey] || Object.values(headline)[0] || brandName;
    const textCta = cta[langKey] || Object.values(cta)[0] || "Learn More";

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, palette.bg);
    bgGrad.addColorStop(1, "#050505");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Accent lighting / aura
    const aura = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, w * 0.6);
    aura.addColorStop(0, palette.accent + "33");
    aura.addColorStop(1, "transparent");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // Brand Name Banner
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText((publicService ? "PUBLIC SERVICE · " : "") + brandName.toUpperCase(), 24, 34);

    // Subtle decorative line
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 42);
    ctx.lineTo(w - 24, 42);
    ctx.stroke();

    // Multiline Headline
    ctx.fillStyle = palette.fg;
    ctx.font = "bold 20px -apple-system, system-ui, BlinkMacSystemFont, 'Noto Sans JP', 'Noto Sans Telugu', 'Noto Sans Kannada', sans-serif";
    ctx.textAlign = "left";

    // Text wrapping
    const words = textHeadline.split(" ");
    let line = "";
    let y = 84;
    const lineHeight = 26;
    const maxWidth = w - 48;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 24, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 24, y);

    // CTA Pill Button at bottom
    const ctaY = h - 46;
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.roundRect(24, ctaY, w - 48, 30, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(textCta.toUpperCase() + "  →", w / 2, ctaY + 20);
  }, [campaign, language, isNeutral, isPending, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`block w-full h-full object-cover rounded shadow-lg ${className}`}
    />
  );
}
