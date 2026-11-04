"use client";

import React, { useState, useEffect, useRef } from "react";
import { MotionAdPlan } from "@/lib/schema";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Clock } from "lucide-react";
import { QRCodeSVG } from "./QRCodeSVG";

interface MotionAdPlayerProps {
  plan: MotionAdPlan;
  aspect?: "16:9" | "1:1" | "9:16";
  onDurationChange?: (durationSec: number) => void;
  isLoadingNewDuration?: boolean;
}

function formatTime(sec: number, maxDuration: number): string {
  if (maxDuration >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
  }
  return `${sec.toFixed(1)}s`;
}

export function MotionAdPlayer({
  plan,
  aspect = "16:9",
  onDurationChange,
  isLoadingNewDuration = false,
}: MotionAdPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const duration = plan.totalDurationSec || 15.0;

  // Reset playhead if duration or plan changes
  useEffect(() => {
    setCurrentTime(0);
  }, [plan.totalDurationSec, plan.campaignId]);

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
    ) || plan.beats[plan.beats.length - 1] || plan.beats[0];

  // Is final act
  const isFinalAct =
    activeBeat.act === plan.beats.length ||
    activeBeat.name.toLowerCase().includes("qr") ||
    activeBeat.name.toLowerCase().includes("cta");

  // Beat pulse (120 BPM = 1 beat every 0.5s)
  const isBeatPulse = Math.sin(currentTime * Math.PI * 4) > 0.8;

  const aspectClass =
    aspect === "16:9"
      ? "aspect-video"
      : aspect === "1:1"
      ? "aspect-square max-w-[420px]"
      : "aspect-[9/16] max-w-[320px]";

  // Scrubber click handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(ratio * duration);
  };

  const DURATION_PRESETS = [
    { label: "15s Billboard", sec: 15 },
    { label: "30s Spot", sec: 30 },
    { label: "60s Showcase", sec: 60 },
    { label: "180s (3m Epic)", sec: 180 },
  ];

  return (
    <div className="flex flex-col items-center space-y-3.5 w-full">
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
              ACT {activeBeat.act}/{plan.beats.length}: {activeBeat.name.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono opacity-60">
              120 BPM · {formatTime(currentTime, duration)} / {formatTime(duration, duration)}
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
          {/* Final Act: QR & Checkout */}
          {isFinalAct ? (
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
                <p className="text-xs text-white/80 max-w-[240px]">
                  {activeBeat.subhead}
                </p>
              </div>
            </div>
          ) : activeBeat.act === 1 ? (
            /* Act 1: Hook / Prelude */
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
          ) : activeBeat.act === 2 ? (
            /* Act 2: Problem / Narrative */
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span
                className="text-xs font-mono font-semibold px-3 py-1 rounded-full border inline-block"
                style={{
                  backgroundColor: `${plan.palette.accent}15`,
                  borderColor: `${plan.palette.accent}30`,
                  color: plan.palette.accent,
                }}
              >
                NARRATIVE CONTEXT
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                {activeBeat.headline}
              </h2>
              <p className="text-xs md:text-sm max-w-md opacity-80 mx-auto">
                {activeBeat.subhead}
              </p>
            </div>
          ) : activeBeat.act === 3 ? (
            /* Act 3: Flagship Innovation */
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
          ) : (
            /* Acts 4 & 5: Proof, Performance & Community */
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
              <span
                className="text-xs font-mono font-semibold px-3 py-1 rounded-full border inline-block"
                style={{
                  backgroundColor: `${plan.palette.accent}15`,
                  borderColor: `${plan.palette.accent}30`,
                  color: plan.palette.accent,
                }}
              >
                {activeBeat.name.toUpperCase()}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {activeBeat.headline}
              </h2>
              <p className="text-xs md:text-sm max-w-md opacity-80 mx-auto">
                {activeBeat.subhead}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Timecode & Interactive Scrubber */}
        <div className="relative z-10 space-y-2">
          {/* Interactive Scrub Timeline */}
          <div
            onClick={handleTimelineClick}
            className="w-full bg-white/20 hover:bg-white/30 h-2 rounded-full overflow-hidden cursor-pointer relative transition-all"
            title="Click to jump to timestamp"
          >
            {/* Act divider ticks */}
            {plan.beats.map((beat) => (
              <div
                key={beat.act}
                className="absolute top-0 bottom-0 w-[1px] bg-white/40 pointer-events-none"
                style={{ left: `${(beat.startSec / duration) * 100}%` }}
              />
            ))}
            <div
              className="h-full transition-all duration-75 rounded-full"
              style={{
                width: `${(currentTime / duration) * 100}%`,
                backgroundColor: plan.palette.accent,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono opacity-60">
            {plan.beats.map((b) => (
              <span
                key={b.act}
                className="cursor-pointer hover:opacity-100 hover:text-white transition-opacity"
                onClick={() => setCurrentTime(b.startSec)}
              >
                {formatTime(b.startSec, duration)} ({b.name})
              </span>
            ))}
            <span>{formatTime(duration, duration)}</span>
          </div>
        </div>
      </div>

      {/* Playback Controls Strip */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full p-3 rounded-xl bg-adv-surface border border-adv-border gap-2 text-xs">
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

        {/* Duration Configurator Presets */}
        <div className="flex items-center gap-1 bg-adv-surfaceHover/60 p-1 rounded-lg border border-adv-border">
          <Clock size={12} className="text-adv-secondary ml-1" />
          <span className="text-[10px] font-mono text-adv-secondary mr-1">Duration:</span>
          {DURATION_PRESETS.map((preset) => {
            const isSelected = Math.abs(duration - preset.sec) < 1.0;
            return (
              <button
                key={preset.sec}
                type="button"
                disabled={isLoadingNewDuration}
                onClick={() => onDurationChange?.(preset.sec)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                  isSelected
                    ? "bg-adv-accent text-white shadow-sm"
                    : "text-adv-secondary hover:text-adv-text hover:bg-adv-surface"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-adv-successBg text-adv-success border border-adv-success/30 font-mono text-[10px] font-bold">
            <Sparkles size={11} />
            Muse Spark · {duration >= 60 ? `${duration / 60}m` : `${duration}s`}
          </span>
        </div>
      </div>
    </div>
  );
}
