"use client";

import React, { useState, useRef, useEffect } from "react";
import { Zone, Viewer, Decision } from "@/lib/schema";
import { getQuadMatrix3d } from "@/lib/homography";
import { AdPoster } from "./AdPoster";
import { ProceduralScene } from "./ProceduralScene";
import { QRCodeSVG } from "./QRCodeSVG";
import { Play, Pause, RotateCcw, Sparkles, ExternalLink, ShieldCheck, X, QrCode } from "lucide-react";

interface CompositedPlayerProps {
  videoUrl?: string;
  duration?: number;
  zone: Zone;
  viewer: Viewer;
  decision?: Decision;
  onPersonaChange?: (viewerId: string) => void;
  allViewers?: Viewer[];
}

export function CompositedPlayer({
  videoUrl = "/media/demo-scene.mp4",
  duration = 15,
  zone,
  viewer,
  decision,
  onPersonaChange,
  allViewers = [],
}: CompositedPlayerProps) {
  const [playing, setPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(1.5);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [shopCardVisible, setShopCardVisible] = useState<boolean>(false);
  const [clickCount, setClickCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 800, h: 450 });

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

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const isZoneActive = currentTime >= zone.startSec && currentTime <= zone.endSec;

  const togglePlay = () => {
    if (useFallback) {
      const next = !playing;
      setPlaying(next);
      if (!next && isZoneActive && decision?.winningCampaign) {
        setShopCardVisible(true);
      } else {
        setShopCardVisible(false);
      }
    } else if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => setUseFallback(true));
        setPlaying(true);
        setShopCardVisible(false);
      } else {
        videoRef.current.pause();
        setPlaying(false);
        if (isZoneActive && decision?.winningCampaign) {
          setShopCardVisible(true);
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (!useFallback && videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleShopClick = async (customUrl?: string) => {
    setClickCount((c) => c + 1);
    if (decision?.winningCampaign) {
      const targetUrl =
        customUrl ||
        `/campaigns?brand=${encodeURIComponent(decision.winningCampaign.brandName)}&viewer=${viewer.id}`;

      // Open in new window immediately
      window.open(targetUrl, "_blank", "noopener,noreferrer");

      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "click",
            campaignId: decision.winningCampaign.id,
            viewerId: viewer.id,
            zoneId: zone.id,
            city: viewer.city,
          }),
        });
      } catch {
        // ignore
      }
    }
  };

  const posterW = 380;
  const posterH = 260;
  const matrix3d = getQuadMatrix3d(zone.quad, containerSize.w, containerSize.h, posterW, posterH);

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Bar: Persona Selection */}
      {allViewers.length > 0 && onPersonaChange && (
        <div className="flex items-center justify-between bg-adv-surface border border-adv-border p-2.5 rounded-xl">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-semibold uppercase text-adv-secondary whitespace-nowrap pl-2">
              Viewer Persona:
            </span>
            {allViewers.map((v) => {
              const active = v.id === viewer.id;
              return (
                <button
                  key={v.id}
                  onClick={() => onPersonaChange(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                    active
                      ? "bg-adv-accent text-white border-adv-accent shadow-sm"
                      : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-adv-text"
                  }`}
                >
                  {v.name} ({v.country})
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-adv-surfaceHover text-adv-text hover:bg-adv-border border border-adv-border transition-colors whitespace-nowrap ml-2"
          >
            <Sparkles size={14} className="text-adv-accent" />
            <span>Why this ad?</span>
          </button>
        </div>
      )}

      {/* Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-adv-border shadow-2xl group"
      >
        {/* Real Video or Procedural Fallback */}
        {useFallback ? (
          <ProceduralScene
            currentTime={currentTime}
            duration={duration}
            playing={playing}
            onTimeUpdate={handleTimeUpdate}
            campaign={decision?.winningCampaign}
            viewerLanguage={viewer.language}
            isNeutral={decision?.winner === "neutral"}
            isPending={decision?.status === "pending"}
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
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onError={() => setUseFallback(true)}
            className="w-full h-full object-cover"
          />
        )}

        {/* Composited Billboard Zone Overlay */}
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
              isNeutral={decision?.winner === "neutral"}
              isPending={decision?.status === "pending"}
              width={posterW}
              height={posterH}
            />

            {/* Specular floodlight glare & scanline illumination */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-black/30 pointer-events-none" />
          </div>
        )}

        {/* Zone indicator bounding box badge */}
        {isZoneActive && (
          <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white flex items-center gap-2 z-30 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-adv-success animate-ping" />
            <span className="font-bold text-adv-text">LIVE REPLACEMENT:</span>
            <span className="text-adv-accent font-semibold">
              {decision?.winningCampaign?.brandName || (decision?.winner === "neutral" ? "Neutral Mural" : "Civic PSA")}
            </span>
            <span className="text-[10px] text-adv-secondary font-mono">
              ({viewer.language.toUpperCase()})
            </span>
          </div>
        )}

        {/* Source badge pill */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/20 text-[11px] text-adv-secondary flex items-center gap-1.5 font-mono">
          <span>Ad Network:</span>
          <span className="text-adv-text font-bold uppercase">
            {decision?.winningCampaign?.category?.toLowerCase().includes("beverage") ? "Meta Ads" : "Google AdSense"}
          </span>
        </div>

        {/* Pause-To-Shop Card Overlay */}
        {shopCardVisible && decision?.winningCampaign && (
          <div className="absolute bottom-16 left-4 right-4 md:left-8 md:w-[420px] bg-adv-sidebar/95 backdrop-blur-xl border border-adv-border p-4 rounded-2xl shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start justify-between pb-2 border-b border-adv-border/60 mb-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-adv-accent/20 text-adv-accent font-semibold border border-adv-accent/30">
                  Featured In-Scene Sponsor
                </span>
                <h4 className="text-base font-bold text-white mt-1">
                  {decision.winningCampaign.brandName}
                </h4>
              </div>
              <button
                onClick={() => setShopCardVisible(false)}
                className="text-adv-secondary hover:text-white p-1 rounded-lg hover:bg-adv-surfaceHover transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Scannable & Clickable QR Code */}
              <button
                type="button"
                onClick={() => handleShopClick()}
                className="group relative flex-shrink-0 p-2 bg-white rounded-xl shadow-md border border-white/20 hover:scale-105 transition-transform cursor-pointer"
                title="Scan with phone or click to open in new window"
              >
                <QRCodeSVG
                  value={`https://advision.app/shop/${decision.winningCampaign.id}?viewer=${viewer.id}&city=${viewer.city}`}
                  size={76}
                  fgColor="#0a0a0a"
                  bgColor="#ffffff"
                />
                <div className="absolute inset-0 bg-adv-accent/20 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ExternalLink size={16} className="text-white drop-shadow" />
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-adv-secondary leading-snug line-clamp-2">
                  {decision.winningCampaign.headline[viewer.language] ||
                    decision.winningCampaign.headline.en}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-adv-accent mt-1.5">
                  <QrCode size={12} />
                  <span>Scan or click QR to open</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleShopClick()}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-adv-accent hover:bg-adv-accentHover transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>
                      {decision.winningCampaign.cta[viewer.language] ||
                        decision.winningCampaign.cta.en ||
                        "Shop Product"}
                    </span>
                    <ExternalLink size={12} />
                  </button>

                  {clickCount > 0 && (
                    <span className="text-[10px] text-adv-success font-semibold px-2 py-1 rounded-lg bg-adv-successBg whitespace-nowrap">
                      ✓ Opened ({clickCount})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Media Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <button
            onClick={() => {
              setCurrentTime(0);
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="text-white/70 hover:text-white"
            title="Restart"
          >
            <RotateCcw size={16} />
          </button>

          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-adv-accent h-1.5 rounded-lg cursor-pointer bg-white/30"
          />

          <span className="text-xs font-mono text-white/80 whitespace-nowrap">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* "Why this ad?" Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-adv-sidebar border-l border-adv-border h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-adv-border">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-adv-accent" />
                  <h3 className="font-bold text-lg text-white">Why this ad?</h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg bg-adv-surface hover:bg-adv-surfaceHover text-adv-secondary hover:text-white flex items-center justify-center border border-adv-border"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 3-Step Strip */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-adv-surface border border-adv-border p-2.5 rounded-xl">
                  <span className="text-[10px] text-adv-secondary font-mono block mb-1">
                    STEP 1
                  </span>
                  <span className="font-bold text-white block">Intent Engine</span>
                  <span className="text-[10px] text-adv-secondary">
                    AdSense & Meta
                  </span>
                </div>
                <div className="bg-adv-surface border border-adv-border p-2.5 rounded-xl">
                  <span className="text-[10px] text-adv-secondary font-mono block mb-1">
                    STEP 2
                  </span>
                  <span className="font-bold text-white block">Rules Filter</span>
                  <span className="text-[10px] text-adv-secondary">
                    Safety & Cap
                  </span>
                </div>
                <div className="bg-adv-surface border border-adv-border p-2.5 rounded-xl">
                  <span className="text-[10px] text-adv-secondary font-mono block mb-1">
                    STEP 3
                  </span>
                  <span className="font-bold text-white block">AI Composites</span>
                  <span className="text-[10px] text-adv-secondary">
                    Homography
                  </span>
                </div>
              </div>

              {/* Explanation Text */}
              <div className="bg-adv-surface border border-adv-border p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-adv-accent flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Decision Explanation
                </span>
                <p className="text-sm text-adv-text leading-relaxed">
                  {decision?.explanation || "Decision evaluated according to intent classification and editorial safety rules."}
                </p>
                {decision?.reasons && decision.reasons.length > 0 && (
                  <ul className="text-xs text-adv-secondary space-y-1 list-disc pl-4 pt-2 border-t border-adv-border">
                    {decision.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Ranked Brands Affinity List */}
              {decision?.ranked && decision.ranked.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-adv-secondary">
                    Campaign Evaluation & Ranking
                  </h4>
                  <div className="space-y-2">
                    {decision.ranked.map((item) => {
                      const pct = Math.round(((item.intentScore ?? item.qlooAffinity) || 0) * 100);
                      const isWinner = item.status === "selected";
                      const isBlocked = item.status === "blocked";
                      const isCapped = item.status === "capped";

                      return (
                        <div
                          key={item.campaignId}
                          className={`p-3 rounded-xl border text-xs ${
                            isWinner
                              ? "bg-adv-accent/10 border-adv-accent text-white"
                              : isBlocked
                              ? "bg-adv-dangerBg border-adv-danger/30 text-adv-danger"
                              : isCapped
                              ? "bg-adv-warningBg border-adv-warning/30 text-adv-warning"
                              : "bg-adv-surface border-adv-border text-adv-secondary"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-adv-text">
                              {item.brandName || item.campaignId}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                isWinner
                                  ? "bg-adv-successBg border-adv-success text-adv-success"
                                  : isBlocked
                                  ? "bg-adv-dangerBg border-adv-danger text-adv-danger"
                                  : isCapped
                                  ? "bg-adv-warningBg border-adv-warning text-adv-warning"
                                  : "bg-adv-surfaceHover border-adv-border text-adv-secondary"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          {/* Affinity Bar */}
                          <div className="w-full bg-adv-surfaceHover h-1.5 rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full ${
                                isWinner ? "bg-adv-accent" : "bg-adv-secondary"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-adv-secondary mt-1">
                            <span>{item.reason}</span>
                            <span className="font-mono font-bold">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Raw Ad Network & Intent Trace Table */}
              {decision?.trace && decision.trace.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-adv-secondary">
                    Raw Ad Network & Intent Traces
                  </h4>
                  <div className="bg-adv-main border border-adv-border rounded-xl p-3 font-mono text-[11px] space-y-2 overflow-x-auto">
                    {decision.trace.map((tr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-adv-border/50 pb-1.5 last:border-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-adv-accent font-bold">
                            {tr.endpoint}
                          </span>
                          <span className="text-adv-secondary">
                            status: {tr.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-adv-secondary">{tr.ms}ms</span>
                          <span
                            className={`px-1 rounded text-[9px] ${
                              tr.cached
                                ? "bg-adv-successBg text-adv-success"
                                : "bg-adv-surfaceHover text-adv-secondary"
                            }`}
                          >
                            {tr.cached ? "cached" : "network"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-sm font-semibold transition-colors"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
