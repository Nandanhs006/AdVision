"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zone, Viewer, Decision, Project } from "@/lib/schema";
import { getQuadMatrix3d } from "@/lib/homography";
import { AdPoster } from "@/components/AdPoster";
import { ProceduralScene } from "@/components/ProceduralScene";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import { Play, Pause, RotateCcw, Sparkles, Film } from "lucide-react";

interface CompareViewportProps {
  videoUrl: string;
  duration: number;
  zone: Zone;
  viewer: Viewer;
  decision?: Decision;
  currentTime: number;
  playing: boolean;
}

function CompareViewport({
  videoUrl,
  duration,
  zone,
  viewer,
  decision,
  currentTime,
  playing,
}: CompareViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 560, h: 315 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Synchronize video element playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    if (playing) {
      if (video.paused) {
        video.play().catch(() => setUseFallback(true));
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [playing, useFallback]);

  // Synchronize scrub / loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    if (Math.abs(video.currentTime - currentTime) > 0.4) {
      video.currentTime = currentTime;
    }
  }, [currentTime, useFallback]);

  const isZoneActive = currentTime >= zone.startSec && currentTime <= zone.endSec;
  const posterW = 380;
  const posterH = 260;
  const matrix3d = getQuadMatrix3d(zone.quad, containerSize.w, containerSize.h, posterW, posterH);

  const isWinner = decision?.winningCampaign;
  const isNeutral = decision?.winner === "neutral";
  const isKids = viewer.adPreference === "kids";

  return (
    <div className="bg-adv-surface border border-adv-border rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
      {/* Top Persona Header */}
      <div className="p-3.5 bg-adv-sidebar border-b border-adv-border flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-adv-text text-sm block">
            {viewer.name}
          </span>
          <span className="text-[11px] text-adv-secondary font-mono">
            {viewer.country} ({viewer.language.toUpperCase()})
          </span>
        </div>

        <div>
          {isWinner && !isWinner.publicService ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-successBg border border-adv-success/30 text-adv-success">
              Intent match {Math.round(((decision?.ranked?.[0]?.intentScore ?? decision?.ranked?.[0]?.qlooAffinity) || 0.95) * 100)}% ({decision?.winningCampaign?.category?.toLowerCase().includes("beverage") ? "Meta" : "AdSense"})
            </span>
          ) : isKids ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-accent/20 border border-adv-accent/30 text-adv-accent">
              Brand-free (PSA)
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-surfaceHover border border-adv-border text-adv-secondary">
              No brand shown
            </span>
          )}
        </div>
      </div>

      {/* Viewport Scene Player */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-black select-none overflow-hidden"
      >
        {useFallback ? (
          <ProceduralScene
            currentTime={currentTime}
            duration={duration}
            playing={playing}
            campaign={decision?.winningCampaign}
            viewerLanguage={viewer.language}
            isNeutral={isNeutral}
            isZoneActive={isZoneActive}
          />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setUseFallback(true)}
            className="w-full h-full object-cover"
          />
        )}

        {/* 3D Perspective Homography Billboard Overlay */}
        {isZoneActive && (
          <div
            className="absolute top-0 left-0 pointer-events-none transition-all duration-300 z-20 shadow-2xl rounded-sm overflow-hidden"
            style={{
              width: `${posterW}px`,
              height: `${posterH}px`,
              transformOrigin: "0 0",
              transform: matrix3d,
              boxShadow: decision?.winningCampaign?.palette?.accent
                ? `0 0 35px ${decision.winningCampaign.palette.accent}99`
                : "0 0 25px rgba(99, 102, 241, 0.6)",
              border: `2px solid ${decision?.winningCampaign?.palette?.accent || "#6366f1"}`,
            }}
          >
            <AdPoster
              campaign={decision?.winningCampaign}
              language={viewer.language}
              isNeutral={isNeutral}
              isPending={decision?.status === "pending"}
              width={posterW}
              height={posterH}
            />
          </div>
        )}
      </div>

      {/* Bottom Persona Banner Note */}
      <div className="p-3 bg-adv-sidebar/70 border-t border-adv-border text-xs flex items-center justify-between text-adv-secondary">
        <span className="truncate max-w-[280px]">
          {isWinner
            ? isWinner.headline[viewer.language] || isWinner.headline.en
            : isNeutral
            ? "Neutral architectural artwork (subscriber tier)"
            : "Public-service civic message"}
        </span>
        <span className="font-mono text-[10px] text-adv-text font-bold">
          {isWinner?.brandName || (isNeutral ? "Mural" : "PSA")}
        </span>
      </div>
    </div>
  );
}

export default function CompareSyncPage() {
  const projects = projectsJson as Project[];
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0].id);

  const project = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const zone = project.zones[0] as Zone;
  const allViewers = viewersJson as Viewer[];

  // 4 Target Viewers in requested order: US, JAPAN, India, Kids
  const viewerUS = allViewers.find((v) => v.id === "viewer-us" || (v.country === "United States" && v.adPreference === "normal")) || allViewers[0];
  const viewerJapan = allViewers.find((v) => v.id === "viewer-japan" || v.country === "Japan") || allViewers[1];
  const viewerIndia = allViewers.find((v) => v.id === "viewer-india" || v.country === "India") || allViewers[2];
  const viewerKids = allViewers.find((v) => v.id === "viewer-kids") || allViewers[3];

  const fourViewers = [viewerUS, viewerJapan, viewerIndia, viewerKids];

  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [currentTime, setCurrentTime] = useState<number>(2.0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [, setLoading] = useState<boolean>(true);

  const duration = project.durationSec || 15;

  // Master playback timer
  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      if (playing) {
        setCurrentTime((prev) => (prev + delta) % duration);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playing, duration]);

  // Fetch decisions whenever project or zone changes
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results: Record<string, Decision> = {};
        for (const v of fourViewers) {
          const res = await fetch("/api/decide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              zone,
              rules: project.rules,
              viewer: v,
            }),
          });
          if (res.ok) {
            results[v.id] = await res.json();
          }
        }
        setDecisions(results);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, zone]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              4-Way Persona Sync
            </span>
            <span className="text-xs text-adv-secondary">
              Powered by Intent Classification & Ad Networks
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-adv-text tracking-tight mt-1">
            One scene. Four viewers. One story.
          </h1>
          <p className="text-sm text-adv-secondary mt-1">
            Same footage, same timing, zero camera drift. Billboard adapts dynamically per viewer persona.
          </p>
        </div>

        {/* Global Synchronized Playback Control */}
        <div className="flex items-center gap-3 bg-adv-surface border border-adv-border px-4 py-2 rounded-xl">
          <button
            onClick={() => setPlaying(!playing)}
            className="w-8 h-8 rounded-full bg-adv-accent text-white flex items-center justify-center hover:bg-adv-accentHover transition-colors shadow-md"
          >
            {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button
            onClick={() => setCurrentTime(0)}
            className="text-adv-secondary hover:text-white transition-colors"
            title="Restart playback"
          >
            <RotateCcw size={16} />
          </button>
          <span className="text-xs font-mono text-adv-text">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Project Switcher Bar */}
      <div className="flex items-center gap-2 bg-adv-surface border border-adv-border p-2 rounded-xl overflow-x-auto">
        <span className="text-xs font-semibold uppercase text-adv-secondary whitespace-nowrap pl-2 flex items-center gap-1.5">
          <Film size={14} className="text-adv-accent" />
          Active Scene:
        </span>
        {projects.map((p) => {
          const active = p.id === selectedProjectId;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProjectId(p.id);
                setCurrentTime(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                active
                  ? "bg-adv-accent text-white border-adv-accent shadow-sm"
                  : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-adv-text"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* 2x2 Grid of 4 Viewers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fourViewers.map((v) => (
          <CompareViewport
            key={v.id}
            videoUrl={project.videoUrl}
            duration={duration}
            zone={zone}
            viewer={v}
            decision={decisions[v.id]}
            currentTime={currentTime}
            playing={playing}
          />
        ))}
      </div>
    </div>
  );
}
