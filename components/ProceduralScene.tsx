"use client";

import React, { useEffect, useRef } from "react";

interface ProceduralSceneProps {
  currentTime: number;
  duration?: number;
  playing: boolean;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}

export function ProceduralScene({
  currentTime,
  duration = 15,
  playing,
  onTimeUpdate,
  className = "",
}: {
  currentTime: number;
  duration?: number;
  playing: boolean;
  onTimeUpdate?: (time: number) => void;
  className?: string;
}) {
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
      skyGrad.addColorStop(0, "#080c14");
      skyGrad.addColorStop(0.6, "#111827");
      skyGrad.addColorStop(1, "#182030");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant stars / neon atmospheric haze
      ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.3, 180, 0, Math.PI * 2);
      ctx.fill();

      // Distant skyscraper silhouettes
      ctx.fillStyle = "#0c101a";
      ctx.fillRect(w * 0.05, h * 0.2, w * 0.15, h * 0.8);
      ctx.fillRect(w * 0.55, h * 0.25, w * 0.12, h * 0.75);
      ctx.fillRect(w * 0.72, h * 0.15, w * 0.18, h * 0.85);

      // Midground alley buildings
      ctx.fillStyle = "#141a29";
      // Left building with billboard frame
      ctx.fillRect(w * 0.2, h * 0.12, w * 0.32, h * 0.88);
      // Billboard zone outer structure
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.22, h * 0.18, w * 0.26, h * 0.26);
      ctx.fillStyle = "#0b0f19";
      ctx.fillRect(w * 0.22, h * 0.18, w * 0.26, h * 0.26);

      // Right building with storefront signboard
      ctx.fillStyle = "#161e30";
      ctx.fillRect(w * 0.6, h * 0.28, w * 0.35, h * 0.72);
      ctx.strokeStyle = "#3b4252";
      ctx.strokeRect(w * 0.65, h * 0.35, w * 0.23, h * 0.27);
      ctx.fillStyle = "#0a0e18";
      ctx.fillRect(w * 0.65, h * 0.35, w * 0.23, h * 0.27);

      // Street floor with wet reflections
      const streetGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      streetGrad.addColorStop(0, "#0b0d14");
      streetGrad.addColorStop(1, "#05070a");
      ctx.fillStyle = streetGrad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      // Wet pavement neon reflection streaks
      const reflectionX = w * 0.35 + Math.sin(localSec * 0.8) * 15;
      const refGrad = ctx.createRadialGradient(
        reflectionX,
        h * 0.88,
        5,
        reflectionX,
        h * 0.88,
        140
      );
      refGrad.addColorStop(0, "rgba(99, 102, 241, 0.25)");
      refGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = refGrad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      // Streetlamp post & light cone
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.54, h * 0.78);
      ctx.lineTo(w * 0.54, h * 0.45);
      ctx.arc(w * 0.52, h * 0.45, 12, 0, Math.PI, true);
      ctx.stroke();

      // Moving pedestrian silhouette
      const pedX = ((localSec * 45) % (w * 0.7)) + w * 0.15;
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      // Head
      ctx.beginPath();
      ctx.arc(pedX, h * 0.72, 8, 0, Math.PI * 2);
      ctx.fill();
      // Body / coat
      ctx.beginPath();
      ctx.moveTo(pedX - 8, h * 0.79);
      ctx.lineTo(pedX + 8, h * 0.79);
      ctx.lineTo(pedX + 5, h * 0.73);
      ctx.lineTo(pedX - 5, h * 0.73);
      ctx.closePath();
      ctx.fill();

      // Atmospheric rain drops
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      const rainOffset = (localSec * 400) % 60;
      for (let i = 0; i < 40; i++) {
        const rx = (i * 32 + rainOffset * 2) % w;
        const ry = (i * 24 + rainOffset * 6) % (h * 0.8);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 2, ry + 12);
        ctx.stroke();
      }

      // Timecode watermark in corner
      ctx.fillStyle = "rgba(240, 239, 236, 0.5)";
      ctx.font = "12px monospace";
      ctx.fillText(
        `SCENE: Tokyo Nightfall Alleyway  |  TIME: ${localSec.toFixed(2)}s / ${duration}s`,
        20,
        h - 16
      );

      animRef.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [duration, playing, onTimeUpdate]);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className={`w-full h-full object-contain ${className}`}
    />
  );
}
