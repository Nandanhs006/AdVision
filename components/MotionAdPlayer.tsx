"use client";

import React, { useState, useEffect, useRef } from "react";
import { MotionAdPlan } from "@/lib/schema";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, QrCode } from "lucide-react";
import { QRCodeSVG } from "./QRCodeSVG";

interface MotionAdPlayerProps {
  plan: MotionAdPlan;
  aspect?: "16:9" | "1:1" | "9:16";
}

export function MotionAdPlayer({ plan, aspect = "16:9" }: MotionAdPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const duration = plan.totalDurationSec || 15.0;

  // Animation ticker
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + dt;
          return next >= duration ? 0 : next;
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration]);

  // Audio synchronization
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && !isMuted) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted]);

  // Active Beat calculation
  const activeBeat =
    plan.beats.find(
      (b) => currentTime >= b.startSec && currentTime < b.startSec + b.durationSec
    ) || plan.beats[0];

  // Beat pulse (120 BPM = 1 beat every 0.5s)
  const isBeatPulse = Math.sin(currentTime * Math.PI * 4) > 0.8;

  const aspectClass =
    aspect === "16:9"
      ? "aspect-video"
      : aspect === "1:1"
      ? "aspect-square max-w-[420px]"
      : "aspect-[9/16] max-w-[320px]";

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {/* Audio element */}
      <audio
        ref={audioRef}
        src="/audio/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3"
        loop
      />

      {/* Screen Viewport */}
      <div
        className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden border border-white/20 shadow-2xl transition-all duration-300 flex flex-col justify-between p-6 select-none`}
        style={{
          backgroundColor: plan.palette.bg,
          color: plan.palette.fg,
        }}
      >
        {/* Animated Background Motif */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          {plan.beats[0]?.motif === "waves" && (
            <div
              className="absolute inset-0 border-[3px] rounded-full transition-transform duration-500 ease-out"
              style={{
                borderColor: plan.palette.accent,
                transform: `scale(${1 + (currentTime % 2) * 0.4})`,
                opacity: 1 - (currentTime % 2) * 0.5,
              }}
            />
          )}
          {plan.beats[0]?.motif === "grid" && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(${plan.palette.accent}22 1px, transparent 1px), linear-gradient(90deg, ${plan.palette.accent}22 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
          )}
          {isBeatPulse && (
            <div
              className="absolute inset-0 bg-white/5 animate-ping pointer-events-none"
              style={{ animationDuration: "500ms" }}
            />
          )}
        </div>

        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
              style={{
                backgroundColor: `${plan.palette.accent}20`,
                borderColor: `${plan.palette.accent}40`,
                color: plan.palette.accent,
              }}
            >
              ACT {activeBeat.act}: {activeBeat.name.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono opacity-60">
              120 BPM · {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full transition-all duration-100"
              style={{
                backgroundColor: isBeatPulse ? plan.palette.accent : `${plan.palette.fg}40`,
                transform: isBeatPulse ? "scale(1.4)" : "scale(1)",
              }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">
              {plan.brandName}
            </span>
          </div>
        </div>

        {/* Center Kinetic Stage */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4 space-y-3">
          {activeBeat.act === 1 && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
              <span
                className="text-xs font-mono font-bold tracking-widest uppercase block"
                style={{ color: plan.palette.accent }}
              >
                {activeBeat.subhead}
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none uppercase">
                {activeBeat.headline}
              </h2>
            </div>
          )}

          {activeBeat.act === 2 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span
                className="text-xs font-mono font-semibold px-3 py-1 rounded-full border inline-block"
                style={{
                  backgroundColor: `${plan.palette.accent}15`,
                  borderColor: `${plan.palette.accent}30`,
                  color: plan.palette.accent,
                }}
              >
                FLAGSHIP INNOVATION
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                {activeBeat.headline}
              </h2>
              <p className="text-xs md:text-sm max-w-md opacity-80 mx-auto">
                {activeBeat.subhead}
              </p>
            </div>
          )}

          {activeBeat.act === 3 && (
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl border border-white/20 bg-black/40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
              <div className="p-2 bg-white rounded-lg shadow-lg">
                <QRCodeSVG value={plan.qrLink} size={88} />
              </div>
              <div className="text-left space-y-1">
                <span
                  className="text-[10px] font-mono uppercase font-bold tracking-wider"
                  style={{ color: plan.palette.accent }}
                >
                  PAUSE-TO-SHOP ACTION
                </span>
                <h3 className="text-lg md:text-xl font-extrabold text-white">
                  {activeBeat.headline}
                </h3>
                <p className="text-xs text-white/80 max-w-[220px]">
                  {activeBeat.subhead}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Timecode & Progress Bar */}
        <div className="relative z-10 space-y-2">
          {/* Timeline progress line */}
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-75 rounded-full"
              style={{
                width: `${(currentTime / duration) * 100}%`,
                backgroundColor: plan.palette.accent,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono opacity-60">
            <span>0.0s (Hook)</span>
            <span>3.5s (Benefit)</span>
            <span>10.5s (CTA)</span>
            <span>15.0s</span>
          </div>
        </div>
      </div>

      {/* Playback Controls Strip */}
      <div className="flex items-center justify-between w-full p-3 rounded-xl bg-adv-surface border border-adv-border text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white font-semibold transition-colors"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={() => setCurrentTime(0)}
            type="button"
            className="p-1.5 rounded-lg border border-adv-border hover:bg-adv-surfaceHover text-adv-secondary hover:text-adv-text transition-colors"
            title="Restart to 0.0s"
          >
            <RotateCcw size={13} />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-adv-border hover:bg-adv-surfaceHover text-adv-secondary hover:text-adv-text transition-colors"
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            <span>{isMuted ? "Unmute Beats" : "Muted"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-adv-secondary">
            Meta AI Beat Sync:
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-adv-successBg text-adv-success border border-adv-success/30 font-mono text-[10px] font-bold">
            <Sparkles size={11} />
            Muse Spark 15s
          </span>
        </div>
      </div>
    </div>
  );
}
