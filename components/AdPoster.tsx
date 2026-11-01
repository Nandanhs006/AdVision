"use client";

import React, { useRef, useEffect, useState } from "react";
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

const BRAND_IMAGE_PATHS: Record<string, string> = {
  repbull: "/brands/repbull.jpg",
  sony: "/brands/sony.png",
  mrf: "/brands/mrf.png",
  coffee: "/brands/coffee.png",
};

const clientImageCache = new Map<string, HTMLImageElement>();

function getClientBrandImage(key: string, onLoaded: () => void): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  const path = BRAND_IMAGE_PATHS[key];
  if (!path) return null;

  let img = clientImageCache.get(path);
  if (!img) {
    img = new Image();
    img.src = path;
    img.onload = () => onLoaded();
    clientImageCache.set(path, img);
  }
  return img;
}

export function AdPoster({
  campaign,
  language = "en",
  isNeutral = false,
  isPending = false,
  width = 380,
  height = 260,
  className = "",
}: AdPosterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setLoadTick] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use 2x internal resolution for retina-sharp billboard rendering
    const scale = 2;
    const w = width * scale;
    const h = height * scale;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // ----------------------------------------------------
    // 1. NEUTRAL ARTWORK FALLBACK (Ad-Free Subscribers)
    // ----------------------------------------------------
    if (isNeutral || (!campaign && !isPending)) {
      renderNeutralMural(ctx, w, h);
      ctx.restore();
      return;
    }

    // ----------------------------------------------------
    // 2. PENDING APPROVAL STATE
    // ----------------------------------------------------
    if (isPending) {
      renderPendingReview(ctx, w, h);
      ctx.restore();
      return;
    }

    if (!campaign) {
      ctx.restore();
      return;
    }

    // ----------------------------------------------------
    // 3. BRAND-SPECIFIC COMMERCIAL BILLBOARDS
    // ----------------------------------------------------
    const brandId = campaign.id.toLowerCase();
    const brandName = campaign.brandName.toLowerCase();
    const langKey = campaign.headline[language] ? language : "en";
    const textHeadline = campaign.headline[langKey] || Object.values(campaign.headline)[0] || campaign.brandName;
    const textCta = campaign.cta[langKey] || Object.values(campaign.cta)[0] || "Shop Now";

    let brandKey = "";
    if (brandId.includes("repbull") || brandName.includes("repbull") || brandName.includes("red bull")) {
      brandKey = "repbull";
    } else if (brandId.includes("sony") || brandName.includes("sony")) {
      brandKey = "sony";
    } else if (brandId.includes("mrf") || brandName.includes("mrf")) {
      brandKey = "mrf";
    } else if (brandId.includes("kissa") || brandName.includes("kissa") || brandName.includes("coffee") || brandName.includes("nescafe")) {
      brandKey = "coffee";
    }

    // If authentic reference image is available and loaded, draw it directly
    if (brandKey) {
      const refImg = getClientBrandImage(brandKey, () => setLoadTick((t) => t + 1));
      if (refImg && refImg.complete && refImg.naturalWidth > 0) {
        ctx.drawImage(refImg, 0, 0, w, h);
        renderBillboardDOOHOverlay(ctx, w, h);
        ctx.restore();
        return;
      }
    }

    if (brandKey === "repbull") {
      renderRepBullEnergy(ctx, w, h, textHeadline, textCta, langKey);
    } else if (brandKey === "sony") {
      renderSonyAlpha(ctx, w, h, textHeadline, textCta, langKey);
    } else if (brandKey === "mrf") {
      renderMRFTyres(ctx, w, h, textHeadline, textCta, langKey);
    } else if (brandKey === "coffee") {
      renderKissaCoffee(ctx, w, h, textHeadline, textCta);
    } else if (brandId.includes("lumina") || brandName.includes("lumina")) {
      renderLuminaAudio(ctx, w, h, textHeadline, textCta);
    } else {
      renderGenericCommercial(ctx, w, h, campaign, textHeadline, textCta);
    }

    // Commercial DOOH overlay: subtle LED panel grid & authentic broadcast registration mark
    renderBillboardDOOHOverlay(ctx, w, h);

    ctx.restore();
  }, [campaign, language, isNeutral, isPending, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`block w-full h-full object-cover rounded shadow-2xl ${className}`}
    />
  );
}

// =========================================================================
// BRAND 1: REPBULL ENERGY (High-Octane Extreme Sports & Formula 1)
// =========================================================================
function renderRepBullEnergy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  headline: string,
  cta: string,
  lang: string
) {
  // Midnight navy carbon background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#020b18");
  bg.addColorStop(0.5, "#001a35");
  bg.addColorStop(1, "#010811");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Iconic Red Bull diagonal silver & royal blue racing geometric split
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w * 0.42, 0);
  ctx.lineTo(w * 0.82, 0);
  ctx.lineTo(w * 0.62, h);
  ctx.lineTo(w * 0.22, h);
  ctx.closePath();
  const silverGrad = ctx.createLinearGradient(w * 0.3, 0, w * 0.7, h);
  silverGrad.addColorStop(0, "#cfd8dc");
  silverGrad.addColorStop(0.3, "#ffffff");
  silverGrad.addColorStop(0.7, "#90a4ae");
  silverGrad.addColorStop(1, "#607d8b");
  ctx.fillStyle = silverGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.82, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(w * 0.62, h);
  ctx.closePath();
  const royalBlue = ctx.createLinearGradient(w * 0.7, 0, w, h);
  royalBlue.addColorStop(0, "#003b8e");
  royalBlue.addColorStop(1, "#001d4a");
  ctx.fillStyle = royalBlue;
  ctx.fill();
  ctx.restore();

  // Radiant Golden Solar Disc in background
  const sunX = w * 0.76;
  const sunY = h * 0.40;
  const sunRadius = h * 0.36;

  const sunAura = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius * 1.5);
  sunAura.addColorStop(0, "rgba(255, 204, 0, 0.65)");
  sunAura.addColorStop(0.5, "rgba(255, 120, 0, 0.25)");
  sunAura.addColorStop(1, "transparent");
  ctx.fillStyle = sunAura;
  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
  sunGrad.addColorStop(0, "#fff176");
  sunGrad.addColorStop(0.5, "#ffd600");
  sunGrad.addColorStop(0.9, "#ff9100");
  sunGrad.addColorStop(1, "#ff6d00");
  ctx.fillStyle = sunGrad;
  ctx.fill();

  // Dynamic Cyan & White Speed Lightning Streaks
  ctx.save();
  ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const yOff = h * 0.12 * i + 30;
    ctx.beginPath();
    ctx.moveTo(0, yOff);
    ctx.lineTo(w * 0.45 + i * 35, yOff - 45);
    ctx.stroke();
  }
  ctx.restore();

  // CHARGING BULL SILHOUETTES in Crimson Red (#db0a40)
  ctx.save();
  ctx.translate(sunX - 35, sunY + 15);

  // Left Bull charging right
  ctx.fillStyle = "#db0a40";
  ctx.shadowColor = "rgba(219, 10, 64, 0.8)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  // Stylized angular racing bull
  ctx.moveTo(-110, 25);
  ctx.lineTo(-85, 0);
  ctx.lineTo(-65, -30);
  ctx.lineTo(-30, -50);
  ctx.lineTo(0, -55);
  ctx.lineTo(25, -35);
  ctx.lineTo(45, -20);
  ctx.lineTo(65, 0);
  ctx.lineTo(40, 15);
  ctx.lineTo(10, 12);
  ctx.lineTo(-20, 35);
  ctx.lineTo(-70, 30);
  ctx.closePath();
  ctx.fill();

  // Golden Horn & Eye
  ctx.fillStyle = "#ffd600";
  ctx.beginPath();
  ctx.moveTo(35, -45);
  ctx.lineTo(65, -65);
  ctx.lineTo(55, -35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Energy Can Silhouette with metallic frosted condensation
  ctx.save();
  const canX = w * 0.84;
  const canY = h * 0.18;
  const canW = w * 0.11;
  const canH = h * 0.58;

  // Can shadow
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.ellipse(canX + canW / 2, canY + canH + 8, canW * 0.65, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Can Body Gradient
  const canGrad = ctx.createLinearGradient(canX, 0, canX + canW, 0);
  canGrad.addColorStop(0, "#cfd8dc");
  canGrad.addColorStop(0.2, "#ffffff");
  canGrad.addColorStop(0.5, "#002a66");
  canGrad.addColorStop(0.8, "#00183b");
  canGrad.addColorStop(1, "#37474f");
  ctx.fillStyle = canGrad;
  ctx.beginPath();
  ctx.roundRect(canX, canY, canW, canH, 10);
  ctx.fill();

  // Can rim & tab
  ctx.fillStyle = "#eceff1";
  ctx.fillRect(canX + 6, canY - 6, canW - 12, 7);
  ctx.fillStyle = "#b0bec5";
  ctx.fillRect(canX + canW * 0.35, canY - 10, canW * 0.3, 5);

  // Red logo diamond on can
  ctx.fillStyle = "#db0a40";
  ctx.beginPath();
  ctx.moveTo(canX + canW / 2, canY + canH * 0.35);
  ctx.lineTo(canX + canW * 0.85, canY + canH * 0.52);
  ctx.lineTo(canX + canW / 2, canY + canH * 0.68);
  ctx.lineTo(canX + canW * 0.15, canY + canH * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ----------------------------------------------------
  // TYPOGRAPHY & COPY
  // ----------------------------------------------------
  // Top Tag
  ctx.fillStyle = "#ffd600";
  ctx.font = "bold 18px 'Impact', 'Arial Black', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("FORMULA 1™ GLOBAL RACING PARTNER", 36, 52);

  // GIANT BRAND TITLE: REPBULL
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 16;
  ctx.font = "italic 900 68px 'Arial Black', 'Impact', sans-serif";
  ctx.fillText("REPBULL", 34, 120);

  // Subtitle
  ctx.fillStyle = "#db0a40";
  ctx.shadowColor = "rgba(219, 10, 64, 0.6)";
  ctx.shadowBlur = 10;
  ctx.font = "italic 900 24px 'Arial Black', sans-serif";
  ctx.fillText("ENERGY DRINK", 38, 154);

  // Tagline Headline
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  wrapText(ctx, headline.toUpperCase(), 38, 204, w * 0.56, 38);

  // Badges
  const badgeY = h - 130;
  drawPillBadge(ctx, 38, badgeY, "250 ml · TAURINE + B12", "#002a66", "#00e5ff");
  drawPillBadge(ctx, 230, badgeY, "VITALIZES BODY & MIND", "#3e1218", "#ffd600");

  // Call To Action Button (Glossy Red Bull Crimson Pill)
  const ctaY = h - 75;
  const ctaW = w * 0.52;
  const ctaH = 50;

  const btnGrad = ctx.createLinearGradient(0, ctaY, 0, ctaY + ctaH);
  btnGrad.addColorStop(0, "#ff1744");
  btnGrad.addColorStop(0.5, "#db0a40");
  btnGrad.addColorStop(1, "#b7002e");
  ctx.fillStyle = btnGrad;
  ctx.shadowColor = "rgba(219, 10, 64, 0.7)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.roundRect(38, ctaY, ctaW, ctaH, 25);
  ctx.fill();

  // Specular top glint
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.roundRect(46, ctaY + 4, ctaW - 16, ctaH * 0.35, 12);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.font = "900 20px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cta.toUpperCase() + "  ➔", 38 + ctaW / 2, ctaY + 32);

  // Legal Micro-Notice
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText("© 2026 REPBULL RACING INC. · HIGH PERFORMANCE ENERGY", w - 36, h - 24);
}

// =========================================================================
// BRAND 2: SONY ALPHA OPTICS (Full-Frame Camera / G-Master Lens)
// =========================================================================
function renderSonyAlpha(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  headline: string,
  cta: string,
  lang: string
) {
  // Pure obsidian carbon background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#08080a");
  bg.addColorStop(0.5, "#0d0e12");
  bg.addColorStop(1, "#040406");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtitle carbon matrix pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // HERO GRAPHIC: HIGH-TECH FULL-FRAME CAMERA LENS OPTIC (Right Side)
  const lensX = w * 0.74;
  const lensY = h * 0.48;
  const maxR = h * 0.44;

  // Machined Outer Barrel Rings (Gunmetal Titanium)
  for (let r = maxR; r > maxR * 0.4; r -= 18) {
    ctx.beginPath();
    ctx.arc(lensX, lensY, r, 0, Math.PI * 2);
    const metal = ctx.createLinearGradient(lensX - r, lensY - r, lensX + r, lensY + r);
    metal.addColorStop(0, "#2c2d33");
    metal.addColorStop(0.5, "#141518");
    metal.addColorStop(1, "#3e4048");
    ctx.strokeStyle = metal;
    ctx.lineWidth = 14;
    ctx.stroke();
  }

  // Sony G-Master Red/Gold Badge on barrel
  ctx.fillStyle = "#ff5500";
  ctx.fillRect(lensX - maxR - 10, lensY - 14, 20, 28);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("G", lensX - maxR, lensY + 5);

  // Optical Glass Multi-Coated Reflections (Emerald Green & Deep Violet Caustics)
  const glassR = maxR * 0.52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(lensX, lensY, glassR, 0, Math.PI * 2);
  ctx.clip();

  const glassGrad = ctx.createRadialGradient(lensX, lensY, 10, lensX, lensY, glassR);
  glassGrad.addColorStop(0, "rgba(255, 171, 0, 0.7)");
  glassGrad.addColorStop(0.35, "rgba(0, 230, 118, 0.45)");
  glassGrad.addColorStop(0.7, "rgba(124, 77, 255, 0.6)");
  glassGrad.addColorStop(1, "#020712");
  ctx.fillStyle = glassGrad;
  ctx.fillRect(lensX - glassR, lensY - glassR, glassR * 2, glassR * 2);

  // Aperture Iris Blades
  ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
  ctx.lineWidth = 4;
  for (let a = 0; a < 9; a++) {
    const angle = (a * Math.PI * 2) / 9;
    ctx.beginPath();
    ctx.moveTo(lensX + Math.cos(angle) * (glassR * 0.3), lensY + Math.sin(angle) * (glassR * 0.3));
    ctx.lineTo(lensX + Math.cos(angle + 0.9) * glassR, lensY + Math.sin(angle + 0.9) * glassR);
    ctx.stroke();
  }
  ctx.restore();

  // Camera Sensor HUD Brackets & Autofocus Points
  ctx.strokeStyle = "#ff6600";
  ctx.lineWidth = 2;
  const bSize = 34;
  // Crosshair brackets
  ctx.beginPath();
  ctx.moveTo(lensX - bSize, lensY - bSize + 10);
  ctx.lineTo(lensX - bSize, lensY - bSize);
  ctx.lineTo(lensX - bSize + 10, lensY - bSize);

  ctx.moveTo(lensX + bSize, lensY - bSize + 10);
  ctx.lineTo(lensX + bSize, lensY - bSize);
  ctx.lineTo(lensX + bSize - 10, lensY - bSize);

  ctx.moveTo(lensX - bSize, lensY + bSize - 10);
  ctx.lineTo(lensX - bSize, lensY + bSize);
  ctx.lineTo(lensX - bSize + 10, lensY + bSize);

  ctx.moveTo(lensX + bSize, lensY + bSize - 10);
  ctx.lineTo(lensX + bSize, lensY + bSize);
  ctx.lineTo(lensX + bSize - 10, lensY + bSize);
  ctx.stroke();

  // Green AF Lock Center dot
  ctx.fillStyle = "#00e676";
  ctx.beginPath();
  ctx.arc(lensX, lensY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Camera telemetry readout on lens
  ctx.fillStyle = "rgba(0, 230, 118, 0.85)";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("AF-C 61.0MP [●]", lensX, lensY + glassR + 24);

  // ----------------------------------------------------
  // TYPOGRAPHY & SONY BRANDING
  // ----------------------------------------------------
  // Top SONY Brandmark with wide tracking
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 28px 'Helvetica Neue', 'Arial Black', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("S O N Y", 36, 56);

  // Signature Sony Alpha Trademark mark in bright orange
  ctx.fillStyle = "#ff6600";
  ctx.font = "italic 900 48px Georgia, serif";
  ctx.shadowColor = "rgba(255, 102, 0, 0.6)";
  ctx.shadowBlur = 15;
  ctx.fillText("α", 175, 58);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = "#ff6600";
  ctx.font = "bold 16px monospace";
  ctx.fillText("ALPHA FULL-FRAME IMAGING SYSTEM", 38, 98);

  // Hero Headline
  ctx.fillStyle = "#f5f5f7";
  ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
  wrapText(ctx, headline, 38, 148, w * 0.54, 40);

  // Technical Specs Strip
  const specY = h - 128;
  drawPillBadge(ctx, 38, specY, "61.0 MP EXMOR R™ BSI", "#16171d", "#ffffff");
  drawPillBadge(ctx, 230, specY, "8K 60P HDR · 16-BIT RAW", "#16171d", "#ff6600");

  // Call To Action Button (Sony Alpha Vermilion Pill)
  const ctaY = h - 75;
  const ctaW = w * 0.48;
  const ctaH = 48;

  const btnGrad = ctx.createLinearGradient(0, ctaY, 0, ctaY + ctaH);
  btnGrad.addColorStop(0, "#ff7711");
  btnGrad.addColorStop(1, "#e65100");
  ctx.fillStyle = btnGrad;
  ctx.shadowColor = "rgba(255, 102, 0, 0.6)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(38, ctaY, ctaW, ctaH, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cta + "  ➔", 38 + ctaW / 2, ctaY + 31);

  // Legal footer
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText("SONY ELECTRONICS INC. · ALL RIGHTS RESERVED", w - 36, h - 24);
}

// =========================================================================
// BRAND 3: MRF ZLX TYRES (Motorsport, Grip, Road Rally)
// =========================================================================
function renderMRFTyres(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  headline: string,
  cta: string,
  lang: string
) {
  // Heavy dark asphalt & carbon red racing background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#150406");
  bg.addColorStop(0.6, "#1a060a");
  bg.addColorStop(1, "#090102");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Checkered motorsport racing border accent at top
  const checkSize = 14;
  for (let c = 0; c < w; c += checkSize * 2) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(c, 0, checkSize, checkSize);
    ctx.fillRect(c + checkSize, checkSize, checkSize, checkSize);
    ctx.fillStyle = "#d3112a";
    ctx.fillRect(c + checkSize, 0, checkSize, checkSize);
    ctx.fillRect(c, checkSize, checkSize, checkSize);
  }

  // Red racing speed lines on left and right
  ctx.strokeStyle = "rgba(211, 17, 42, 0.4)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const yOff = 80 + i * 40;
    ctx.beginPath();
    ctx.moveTo(0, yOff);
    ctx.lineTo(w * 0.5 + i * 20, yOff + 60);
    ctx.stroke();
  }

  // HERO GRAPHIC: 3D MOTORSPORT RADIAL TYRE WHEEL (Right Side)
  const tyreX = w * 0.75;
  const tyreY = h * 0.50;
  const outerR = h * 0.40;

  // Wheel burnout smoke aura
  const smoke = ctx.createRadialGradient(tyreX, tyreY, 10, tyreX, tyreY, outerR * 1.4);
  smoke.addColorStop(0, "rgba(211, 17, 42, 0.5)");
  smoke.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
  smoke.addColorStop(1, "transparent");
  ctx.fillStyle = smoke;
  ctx.fillRect(0, 0, w, h);

  // Outer Tyre Tread Block Geometry (Deep Black Rubber)
  ctx.beginPath();
  ctx.arc(tyreX, tyreY, outerR, 0, Math.PI * 2);
  const rubberGrad = ctx.createRadialGradient(tyreX, tyreY, outerR * 0.7, tyreX, tyreY, outerR);
  rubberGrad.addColorStop(0, "#2a2a2e");
  rubberGrad.addColorStop(0.8, "#151518");
  rubberGrad.addColorStop(1, "#0a0a0c");
  ctx.fillStyle = rubberGrad;
  ctx.fill();

  // Angled V-Groove Tyre Tread Channels
  ctx.strokeStyle = "#08080a";
  ctx.lineWidth = 5;
  for (let a = 0; a < 24; a++) {
    const angle = (a * Math.PI * 2) / 24;
    ctx.beginPath();
    ctx.moveTo(tyreX + Math.cos(angle) * (outerR * 0.78), tyreY + Math.sin(angle) * (outerR * 0.78));
    ctx.lineTo(tyreX + Math.cos(angle + 0.12) * outerR, tyreY + Math.sin(angle + 0.12) * outerR);
    ctx.stroke();
  }

  // Signature Racing Red Pinstripe Rim Line
  ctx.strokeStyle = "#d3112a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tyreX, tyreY, outerR * 0.76, 0, Math.PI * 2);
  ctx.stroke();

  // Alloy Wheel Rotor Hub (Silver Machined Disc)
  const rimR = outerR * 0.65;
  ctx.beginPath();
  ctx.arc(tyreX, tyreY, rimR, 0, Math.PI * 2);
  const rimGrad = ctx.createLinearGradient(tyreX - rimR, tyreY - rimR, tyreX + rimR, tyreY + rimR);
  rimGrad.addColorStop(0, "#e0e0e0");
  rimGrad.addColorStop(0.5, "#424242");
  rimGrad.addColorStop(1, "#9e9e9e");
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Wheel spokes
  ctx.fillStyle = "#111111";
  for (let s = 0; s < 5; s++) {
    const sAngle = (s * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(tyreX + Math.cos(sAngle) * (rimR * 0.55), tyreY + Math.sin(sAngle) * (rimR * 0.55), rimR * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Red MRF Hubcap
  ctx.fillStyle = "#d3112a";
  ctx.beginPath();
  ctx.arc(tyreX, tyreY, rimR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 12px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MRF", tyreX, tyreY + 4);

  // ----------------------------------------------------
  // TYPOGRAPHY & COPY
  // ----------------------------------------------------
  // Heavyweight MRF Logo
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(211, 17, 42, 0.8)";
  ctx.shadowBlur = 18;
  ctx.font = "italic 900 68px 'Arial Black', 'Impact', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("MRF", 36, 105);

  // Product Series Badge
  ctx.fillStyle = "#d3112a";
  ctx.shadowBlur = 0;
  ctx.font = "italic 900 24px 'Arial Black', sans-serif";
  ctx.fillText("ZLX STEEL BELTED RADIAL", 38, 140);

  // Tagline Headline
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  wrapText(ctx, headline.toUpperCase(), 38, 194, w * 0.55, 38);

  // Spec badges
  const badgeY = h - 130;
  drawPillBadge(ctx, 38, badgeY, "ALL-TERRAIN HIGHWAY TRACTION", "#2b070c", "#ffffff");
  drawPillBadge(ctx, 310, badgeY, "MOTORSPORT COMPOUND", "#2b070c", "#d3112a");

  // Call To Action Button (Motorsport Racing Red)
  const ctaY = h - 75;
  const ctaW = w * 0.50;
  const ctaH = 48;

  const btnGrad = ctx.createLinearGradient(0, ctaY, 0, ctaY + ctaH);
  btnGrad.addColorStop(0, "#f01835");
  btnGrad.addColorStop(1, "#b70a1f");
  ctx.fillStyle = btnGrad;
  ctx.shadowColor = "rgba(211, 17, 42, 0.7)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(38, ctaY, ctaW, ctaH, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;
  ctx.font = "900 18px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cta.toUpperCase() + "  ➔", 38 + ctaW / 2, ctaY + 31);

  // Legal footer
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText("MRF TYRES LTD · OFFICIAL FORMULA RACING RUBBER", w - 36, h - 24);
}

// =========================================================================
// BRAND 4: KISSA CRAFT ROASTERS (Shibuya Specialty Coffee)
// =========================================================================
function renderKissaCoffee(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  headline: string,
  cta: string
) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#121b18");
  bg.addColorStop(1, "#060908");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Warm artisanal aura
  const aura = ctx.createRadialGradient(w * 0.75, h * 0.45, 10, w * 0.75, h * 0.45, h * 0.5);
  aura.addColorStop(0, "rgba(74, 161, 48, 0.35)");
  aura.addColorStop(1, "transparent");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, w, h);

  // Coffee Dripper Ceramic Illustration
  const cx = w * 0.75;
  const cy = h * 0.45;
  ctx.strokeStyle = "#4aa130";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 60, cy - 70);
  ctx.lineTo(cx + 60, cy - 70);
  ctx.lineTo(cx + 20, cy + 30);
  ctx.lineTo(cx - 20, cy + 30);
  ctx.closePath();
  ctx.stroke();

  // Coffee cup below
  ctx.strokeRect(cx - 45, cy + 40, 90, 50);

  // Aromatic steam spiral
  ctx.strokeStyle = "rgba(244, 239, 230, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 80);
  ctx.bezierCurveTo(cx - 25, cy - 110, cx + 25, cy - 130, cx, cy - 150);
  ctx.stroke();

  // Typography
  ctx.fillStyle = "#4aa130";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.fillText("SHIBUYA CRAFT ROASTERS · 渋谷", 38, 54);

  ctx.fillStyle = "#f4efe6";
  ctx.font = "900 48px system-ui, sans-serif";
  ctx.fillText("KISSA COFFEE", 36, 110);

  ctx.font = "bold 30px system-ui, sans-serif";
  wrapText(ctx, headline, 38, 168, w * 0.52, 38);

  // Button
  const ctaY = h - 75;
  ctx.fillStyle = "#4aa130";
  ctx.beginPath();
  ctx.roundRect(38, ctaY, w * 0.46, 48, 8);
  ctx.fill();

  ctx.fillStyle = "#0c120e";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cta.toUpperCase() + "  ➔", 38 + (w * 0.46) / 2, ctaY + 31);
}

// =========================================================================
// BRAND 5: LUMINA SPATIAL SOUND (Audiophile Acoustic Headphones)
// =========================================================================
function renderLuminaAudio(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  headline: string,
  cta: string
) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#14172b");
  bg.addColorStop(1, "#07080f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Soundwave spectrum visualizer rings
  const cx = w * 0.75;
  const cy = h * 0.48;
  for (let r = 30; r < 140; r += 24) {
    ctx.strokeStyle = `rgba(99, 102, 241, ${1 - r / 150})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Equalizer Bars
  for (let b = 0; b < 14; b++) {
    const barH = 20 + Math.sin(b * 0.8) * 35;
    ctx.fillStyle = "#6366f1";
    ctx.fillRect(cx - 70 + b * 11, cy - barH / 2, 7, barH);
  }

  // Typography
  ctx.fillStyle = "#6366f1";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.fillText("SPATIAL AUDIO ACOUSTICS · 360 REALITY", 38, 54);

  ctx.fillStyle = "#edf2ff";
  ctx.font = "900 48px system-ui, sans-serif";
  ctx.fillText("LUMINA SOUND", 36, 110);

  ctx.font = "bold 30px system-ui, sans-serif";
  wrapText(ctx, headline, 38, 168, w * 0.52, 38);

  // Button
  const ctaY = h - 75;
  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.roundRect(38, ctaY, w * 0.46, 48, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cta.toUpperCase() + "  ➔", 38 + (w * 0.46) / 2, ctaY + 31);
}

// =========================================================================
// GENERIC COMMERCIAL AD FALLBACK
// =========================================================================
function renderGenericCommercial(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  campaign: Campaign,
  headline: string,
  cta: string
) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, campaign.palette.bg);
  bg.addColorStop(1, "#0a0a0f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const aura = ctx.createRadialGradient(w * 0.7, h * 0.4, 20, w * 0.7, h * 0.4, h * 0.6);
  aura.addColorStop(0, campaign.palette.accent + "44");
  aura.addColorStop(1, "transparent");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = campaign.palette.accent;
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.fillText((campaign.publicService ? "PUBLIC SERVICE · " : "") + campaign.category.toUpperCase(), 38, 54);

  ctx.fillStyle = campaign.palette.fg;
  ctx.font = "900 48px system-ui, sans-serif";
  ctx.fillText(campaign.brandName.toUpperCase(), 36, 110);

  ctx.font = "bold 30px system-ui, sans-serif";
  wrapText(ctx, headline, 38, 168, w * 0.55, 38);

  const ctaY = h - 75;
  ctx.fillStyle = campaign.palette.accent;
  ctx.beginPath();
  ctx.roundRect(38, ctaY, w * 0.46, 48, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(cta.toUpperCase() + "  ➔", 38 + (w * 0.46) / 2, ctaY + 31);
}

// =========================================================================
// NEUTRAL ARCHITECTURAL MURAL (Ad-Free Subscribers)
// =========================================================================
function renderNeutralMural(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#181a20");
  grad.addColorStop(1, "#0a0b0e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Geometric architectural relief pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 3;
  for (let i = -w; i < w * 2; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }

  ctx.fillStyle = "#e4e4e7";
  ctx.font = "900 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ARCHITECTURAL MURAL", w / 2, h / 2 - 15);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("Commercial Promotions Suppressed · Ad-Free Tier", w / 2, h / 2 + 25);
}

// =========================================================================
// PENDING EDITORIAL REVIEW
// =========================================================================
function renderPendingReview(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#1b1916";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#d19633";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = "#d19633";
  ctx.font = "900 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("UNDER EDITORIAL REVIEW", w / 2, h / 2 - 15);

  ctx.fillStyle = "#c3c2b8";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("Requires director sign-off in Studio before broadcast", w / 2, h / 2 + 25);
}

// =========================================================================
// COMMERCIAL DOOH OVERLAY (LED subpixels & tile seams)
// =========================================================================
function renderBillboardDOOHOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Modular LED panel seams (500mm tile seams)
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.5, h);
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  // Subtle top-edge commercial LED broadcast tag
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "10px monospace";
  ctx.textAlign = "right";
  ctx.fillText("DOOH 4K // 60FPS LIVE", w - 16, 18);
}

// Helper: Pill badge
function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor: string,
  textColor: string
) {
  ctx.save();
  ctx.font = "bold 13px monospace";
  const metrics = ctx.measureText(text);
  const padX = 14;
  const badgeW = metrics.width + padX * 2;
  const badgeH = 26;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, badgeW, badgeH, 6);
  ctx.fill();

  ctx.strokeStyle = textColor + "55";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.fillText(text, x + padX, y + 17);
  ctx.restore();
}

// Helper: Multiline text wrapping
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currY);
      line = words[n] + " ";
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currY);
}
