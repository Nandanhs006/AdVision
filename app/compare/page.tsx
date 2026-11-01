"use client";

import React, { useState, useEffect } from "react";
import { Zone, Viewer, Decision } from "@/lib/schema";
import { getQuadMatrix3d } from "@/lib/homography";
import { AdPoster } from "@/components/AdPoster";
import { ProceduralScene } from "@/components/ProceduralScene";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import { Play, Pause, RotateCcw, Sparkles } from "lucide-react";

export default function CompareSyncPage() {
  const project = projectsJson[0];
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
  const [loading, setLoading] = useState<boolean>(true);

  const duration = project.durationSec || 15;
  const isZoneActive = currentTime >= zone.startSec && currentTime <= zone.endSec;

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
  }, []);

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
              Powered by Qloo&apos;s taste graph
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-adv-text tracking-tight mt-1">
            One scene. Four viewers. One story.
          </h1>
          <p className="text-sm text-adv-secondary mt-1">
            Same actors, same timing. Only the billboard changes.
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

      {/* 2x2 Grid of 4 Viewers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fourViewers.map((v) => {
          const dec = decisions[v.id];
          const isWinner = dec?.winningCampaign;
          const isNeutral = dec?.winner === "neutral";
          const isKids = v.adPreference === "kids";

          // Calculate homography matrix for this container
          const matrix = getQuadMatrix3d(zone.quad, 480, 270);

          return (
            <div
              key={v.id}
              className="bg-adv-surface border border-adv-border rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
            >
              {/* Top Persona Header */}
              <div className="p-3.5 bg-adv-sidebar border-b border-adv-border flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-adv-text text-sm block">
                    {v.name}
                  </span>
                  <span className="text-[11px] text-adv-secondary font-mono">
                    {v.country} ({v.language.toUpperCase()})
                  </span>
                </div>

                <div>
                  {isWinner && !isWinner.publicService ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-successBg border border-adv-success/30 text-adv-success">
                      Qloo match {Math.round((dec.ranked[0]?.qlooAffinity || 0.9) * 100)}%
                    </span>
                  ) : isKids ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-accent/20 border border-adv-accent/30 text-adv-accent">
                      Brand-free (PSA)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-surfaceHover border border-adv-border text-adv-secondary">
                      No brand shown
                    </span>
                  )}
                </div>
              </div>

              {/* Viewport Scene Player */}
              <div className="relative aspect-video bg-black select-none overflow-hidden">
                <ProceduralScene
                  currentTime={currentTime}
                  duration={duration}
                  playing={playing}
                  onTimeUpdate={(t) => setCurrentTime(t)}
                  campaign={dec?.winningCampaign}
                  viewerLanguage={v.language}
                  isNeutral={isNeutral}
                  isZoneActive={isZoneActive}
                />

                {/* Composited Billboard Zone */}
                {isZoneActive && (
                  <div
                    className="absolute pointer-events-none transition-all duration-300 z-20 shadow-2xl rounded-sm overflow-hidden"
                    style={{
                      left: `${zone.quad[0].x * 100}%`,
                      top: `${zone.quad[0].y * 100}%`,
                      width: `${(zone.quad[1].x - zone.quad[0].x) * 100}%`,
                      height: `${(zone.quad[2].y - zone.quad[0].y) * 100}%`,
                      boxShadow: dec?.winningCampaign?.palette?.accent
                        ? `0 0 20px ${dec.winningCampaign.palette.accent}77`
                        : "0 0 15px rgba(99, 102, 241, 0.4)",
                      border: `2px solid ${dec?.winningCampaign?.palette?.accent || "#6366f1"}`,
                    }}
                  >
                    <AdPoster
                      campaign={dec?.winningCampaign}
                      language={v.language}
                      isNeutral={isNeutral}
                      width={280}
                      height={200}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Persona Banner Note */}
              <div className="p-3 bg-adv-sidebar/70 border-t border-adv-border text-xs flex items-center justify-between text-adv-secondary">
                <span className="truncate max-w-[280px]">
                  {isWinner
                    ? isWinner.headline[v.language] || isWinner.headline.en
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
        })}
      </div>
    </div>
  );
}
