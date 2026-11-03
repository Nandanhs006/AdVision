"use client";

import React, { useEffect, useRef } from "react";
import { Campaign } from "@/lib/schema";

interface ProceduralSceneProps {
  currentTime: number;
  duration?: number;
  playing: boolean;
  onTimeUpdate?: (time: number) => void;
  className?: string;
  campaign?: Campaign;
  viewerLanguage?: string;
  isNeutral?: boolean;
  isPending?: boolean;
  isZoneActive?: boolean;
}

const BRAND_IMAGE_PATHS: Record<string, string> = {
  repbull: "/brands/repbull.jpg",
  sony: "/brands/sony.png",
  mrf: "/brands/mrf.png",
  coffee: "/brands/coffee.png",
};

const proceduralImageCache = new Map<string, HTMLImageElement>();

function getProceduralBrandImage(key: string, onLoaded?: () => void): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  const path = BRAND_IMAGE_PATHS[key];
  if (!path) return null;

  let img = proceduralImageCache.get(path);
  if (!img) {
    img = new Image();
    img.src = path;
    if (onLoaded) {
      img.onload = () => onLoaded();
    }
    proceduralImageCache.set(path, img);
  }
  return img;
}

export function ProceduralScene({
  currentTime,
  duration = 15,
  playing,
  onTimeUpdate,
  className = "",
  campaign,
  viewerLanguage = "en",
  isNeutral = false,
  isPending = false,
  isZoneActive = true,
}: ProceduralSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const currentSecRef = useRef<number>(currentTime);

  useEffect(() => {
    currentSecRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localSec = currentSecRef.current;

    const render = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (playing) {
        localSec = (localSec + delta) % duration;
        currentSecRef.current = localSec;
        onTimeUpdate?.(localSec);
      }

      const w = canvas.width;
      const h = canvas.height;

      // Dark city night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#060911");
      skyGrad.addColorStop(0.5, "#0d1322");
      skyGrad.addColorStop(1, "#141c2e");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Atmospheric haze / stars
      ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.3, 200, 0, Math.PI * 2);
      ctx.fill();

      // Distant skyscraper silhouettes with illuminated windows
      ctx.fillStyle = "#090d16";
      ctx.fillRect(w * 0.05, h * 0.2, w * 0.15, h * 0.8);
      ctx.fillRect(w * 0.55, h * 0.25, w * 0.12, h * 0.75);
      ctx.fillRect(w * 0.72, h * 0.15, w * 0.18, h * 0.85);

      // Skyscraper tiny window lights
      ctx.fillStyle = "rgba(253, 224, 71, 0.4)";
      for (let i = 0; i < 18; i++) {
        const wx = w * 0.07 + (i % 3) * 20;
        const wy = h * 0.25 + Math.floor(i / 3) * 25;
        ctx.fillRect(wx, wy, 4, 6);
      }

      // Midground alley building (left - holds rooftop billboard)
      ctx.fillStyle = "#111726";
      ctx.fillRect(w * 0.2, h * 0.12, w * 0.32, h * 0.88);

      // ==========================================
      // IN-SCENE REPLACED BILLBOARD ZONE
      // Coordinates: 22% X, 18% Y, 26% W, 26% H
      // ==========================================
      const bx = w * 0.22;
      const by = h * 0.18;
      const bw = w * 0.26;
      const bh = h * 0.26;

      // Billboard mounting brackets / scaffolding
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 4;
      ctx.strokeRect(bx - 4, by - 4, bw + 8, bh + 8);

      if (isZoneActive && campaign && !isNeutral && !isPending) {
        // --- 1. DYNAMIC IN-SCENE WINNING AD CREATIVE ---
        const { palette, brandName, headline, cta, publicService } = campaign;
        const langKey = headline[viewerLanguage] ? viewerLanguage : "en";
        const textHeadline = headline[langKey] || Object.values(headline)[0] || brandName;
        const textCta = cta[langKey] || Object.values(cta)[0] || "LEARN MORE";

        // Neon outer glow casting light onto the alleyway building
        const glow = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 20, bx + bw / 2, by + bh / 2, bw * 0.9);
        glow.addColorStop(0, palette.accent + "44");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(bx - 40, by - 40, bw + 80, bh + 80);

        // Check for authentic reference image
        const bId = campaign.id.toLowerCase();
        const bName = campaign.brandName.toLowerCase();
        let bKey = "";
        if (bId.includes("repbull") || bName.includes("repbull") || bName.includes("red bull")) bKey = "repbull";
        else if (bId.includes("sony") || bName.includes("sony")) bKey = "sony";
        else if (bId.includes("mrf") || bName.includes("mrf")) bKey = "mrf";
        else if (bId.includes("kissa") || bName.includes("coffee") || bName.includes("nescafe")) bKey = "coffee";

        const refImg = bKey ? getProceduralBrandImage(bKey) : null;
        if (refImg && refImg.complete && refImg.naturalWidth > 0) {
          ctx.drawImage(refImg, bx, by, bw, bh);
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(bx, by, bw, bh);
        } else {
          // Poster Background Gradient Fallback
          const posterBg = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
          posterBg.addColorStop(0, palette.bg);
          posterBg.addColorStop(1, "#080808");
          ctx.fillStyle = posterBg;
          ctx.fillRect(bx, by, bw, bh);

          // Neon border frame
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 3;
          ctx.strokeRect(bx, by, bw, bh);

          // Brand-specific graphic accents on the billboard
          if (bKey === "repbull") {
            // Golden sun disc & racing silver wedge
            ctx.fillStyle = "rgba(255, 204, 0, 0.4)";
            ctx.beginPath();
            ctx.arc(bx + bw * 0.82, by + bh * 0.45, bh * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffd600";
            ctx.font = "italic 900 12px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("⚡ GIVES YOU WINGS", bx + 16, by + bh - 50);
          } else if (bKey === "sony") {
            // Camera aperture glowing ring & Sony α mark
            ctx.strokeStyle = "#ff6600";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx + bw * 0.82, by + bh * 0.45, bh * 0.28, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "#ff6600";
            ctx.font = "italic 900 24px Georgia, serif";
            ctx.textAlign = "center";
            ctx.fillText("α", bx + bw * 0.82, by + bh * 0.45 + 8);
          } else if (bKey === "mrf") {
            // Racing tyre tread lines & motorsport badge
            ctx.strokeStyle = "#d3112a";
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(bx + bw * 0.72 + i * 8, by + 12);
              ctx.lineTo(bx + bw * 0.82 + i * 8, by + bh * 0.7);
              ctx.stroke();
            }
          }

          // Top Banner Tag (e.g. IN-SCENE AD · GOOGLE ADSENSE / META ADS)
          const netLabel = (campaign.category.toLowerCase().includes("beverage") || campaign.category.toLowerCase().includes("fashion") || campaign.category.toLowerCase().includes("lifestyle"))
            ? "META ADS · "
            : "GOOGLE ADSENSE · ";
          ctx.fillStyle = palette.accent;
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "left";
          ctx.fillText(
            (publicService ? "PUBLIC SERVICE · " : netLabel) + brandName.toUpperCase(),
            bx + 16,
            by + 28
          );

          // Divider
          ctx.strokeStyle = palette.accent + "66";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + 16, by + 36);
          ctx.lineTo(bx + bw - 16, by + 36);
          ctx.stroke();

          // Localized Headline
          ctx.fillStyle = palette.fg;
          ctx.font = "900 16px -apple-system, sans-serif, 'Noto Sans JP', 'Noto Sans Telugu'";
          
          // Multi-line wrap
          const words = textHeadline.split(" ");
          let line = "";
          let lineY = by + 62;
          const maxTextW = bw - 32;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextW && n > 0) {
              ctx.fillText(line, bx + 16, lineY);
              line = words[n] + " ";
              lineY += 20;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, bx + 16, lineY);

          // Call to action button pill at bottom of billboard
          const btnY = by + bh - 38;
          ctx.fillStyle = palette.accent;
          ctx.beginPath();
          ctx.roundRect(bx + 16, btnY, bw - 32, 26, 6);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(textCta.toUpperCase() + "  →", bx + bw / 2, btnY + 17);
        }

        // Scanline television effect
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        for (let y = by; y < by + bh; y += 4) {
          ctx.fillRect(bx, y, bw, 2);
        }
      } else if (isNeutral) {
        // --- 2. NEUTRAL ARCHITECTURAL ARTWORK (Ad-Free Tier) ---
        const neutGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        neutGrad.addColorStop(0, "#1f2430");
        neutGrad.addColorStop(1, "#0d1017");
        ctx.fillStyle = neutGrad;
        ctx.fillRect(bx, by, bw, bh);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 2;
        for (let x = bx; x < bx + bw; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, by);
          ctx.lineTo(x + 20, by + bh);
          ctx.stroke();
        }

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MURAL INSTALLATION", bx + bw / 2, by + bh / 2 - 4);
        ctx.fillStyle = "#64748b";
        ctx.font = "11px sans-serif";
        ctx.fillText("Neutral Art · Ad-Free Tier", bx + bw / 2, by + bh / 2 + 16);
      } else if (isPending) {
        // --- 3. UNDER REVIEW ---
        ctx.fillStyle = "#1e1b18";
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = "#d19633";
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "#d19633";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("UNDER EDITORIAL REVIEW", bx + bw / 2, by + bh / 2);
      } else {
        // Default blank dark billboard
        ctx.fillStyle = "#0c101a";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "#334155";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ADVISION BILLBOARD SLOT", bx + bw / 2, by + bh / 2);
      }

      // Building on right with storefront
      ctx.fillStyle = "#141a29";
      ctx.fillRect(w * 0.6, h * 0.28, w * 0.35, h * 0.72);
      ctx.strokeStyle = "#27354f";
      ctx.strokeRect(w * 0.65, h * 0.35, w * 0.23, h * 0.27);
      ctx.fillStyle = "#0a0e18";
      ctx.fillRect(w * 0.65, h * 0.35, w * 0.23, h * 0.27);

      // Storefront sign text
      ctx.fillStyle = "#475569";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("MARKET SIGN SLOT", w * 0.765, h * 0.48);

      // Wet street floor with reflections
      const streetGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      streetGrad.addColorStop(0, "#080a10");
      streetGrad.addColorStop(1, "#030407");
      ctx.fillStyle = streetGrad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      // Billboard neon reflection in the wet pavement puddle!
      const reflColor = campaign && !isNeutral ? campaign.palette.accent : "rgba(99, 102, 241, 0.4)";
      const refX = bx + bw * 0.5 + Math.sin(localSec * 0.8) * 10;
      const refGrad = ctx.createRadialGradient(refX, h * 0.88, 5, refX, h * 0.88, 160);
      refGrad.addColorStop(0, reflColor + "55");
      refGrad.addColorStop(1, "transparent");
      ctx.fillStyle = refGrad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      // Streetlamp
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.54, h * 0.78);
      ctx.lineTo(w * 0.54, h * 0.45);
      ctx.arc(w * 0.52, h * 0.45, 12, 0, Math.PI, true);
      ctx.stroke();

      // Atmospheric rain
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;
      const rainOffset = (localSec * 450) % 60;
      for (let i = 0; i < 40; i++) {
        const rx = (i * 32 + rainOffset * 2) % w;
        const ry = (i * 24 + rainOffset * 6) % (h * 0.8);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 2, ry + 14);
        ctx.stroke();
      }

      // Timecode watermark
      ctx.fillStyle = "rgba(240, 239, 236, 0.5)";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `SCENE: The Neon Crossing  |  TIME: ${localSec.toFixed(1)}s / ${duration}s`,
        24,
        h - 18
      );

      animRef.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [duration, playing, onTimeUpdate, campaign, viewerLanguage, isNeutral, isPending, isZoneActive]);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className={`w-full h-full object-contain ${className}`}
    />
  );
}
