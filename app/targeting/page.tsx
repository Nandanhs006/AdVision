"use client";

import React, { useState, useEffect } from "react";
import { Viewer, Zone, Rules, Decision } from "@/lib/schema";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import { Sparkles, Terminal, Filter, Layers, CheckCircle2, ShieldAlert } from "lucide-react";

export default function TargetingPage() {
  const viewers = viewersJson as Viewer[];
  const zones = projectsJson[0].zones as Zone[];
  const defaultRules = projectsJson[0].rules as Rules;

  const [selectedViewerId, setSelectedViewerId] = useState<string>(viewers[0].id);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0].id);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const selectedViewer = viewers.find((v) => v.id === selectedViewerId) || viewers[0];
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  useEffect(() => {
    let isCancelled = false;
    const fetchDecision = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone: selectedZone,
            rules: defaultRules,
            viewer: selectedViewer,
          }),
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          setDecision(data);
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchDecision();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedViewerId, selectedZoneId]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              Contextual AI & Intent Inspector
            </span>
            <span className="text-xs text-adv-secondary">
              Meta AI & Meta Audience Network
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-adv-text tracking-tight mt-1">
            Intent Classification & Meta Ad Network Inspector
          </h1>
          <p className="text-sm text-adv-secondary mt-1">
            Examine how AdVision&apos;s intent engine maps individual viewer intent signals, in-market behavior, and scene context to Meta Ads & Audience Network bids, and how editorial safety rules filter the final placement.
          </p>
        </div>
      </div>

      {/* 3-Step Strip Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-adv-sidebar border border-adv-border flex items-center justify-center text-adv-accent font-bold font-mono">
            01
          </div>
          <div>
            <span className="text-xs font-mono uppercase text-adv-accent font-bold block">
              Step 1: Intent & Context Match
            </span>
            <h3 className="text-sm font-bold text-adv-text mt-0.5">
              Meta AI & Audience Engine
            </h3>
            <p className="text-xs text-adv-secondary mt-1">
              Classifies viewer in-market search and purchase intent and scores candidate creatives against scene atmosphere.
            </p>
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-adv-sidebar border border-adv-border flex items-center justify-center text-adv-warning font-bold font-mono">
            02
          </div>
          <div>
            <span className="text-xs font-mono uppercase text-adv-warning font-bold block">
              Step 2: Editorial Guardrail
            </span>
            <h3 className="text-sm font-bold text-adv-text mt-0.5">
              Deterministic Rules Filter
            </h3>
            <p className="text-xs text-adv-secondary mt-1">
              Applies strict category blocks, allowed whitelists, prominence caps, and active flight schedules.
            </p>
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-adv-sidebar border border-adv-border flex items-center justify-center text-adv-success font-bold font-mono">
            03
          </div>
          <div>
            <span className="text-xs font-mono uppercase text-adv-success font-bold block">
              Step 3: In-Scene Compositing
            </span>
            <h3 className="text-sm font-bold text-adv-text mt-0.5">
              Perspective Warp & Render
            </h3>
            <p className="text-xs text-adv-secondary mt-1">
              Homography matrix transforms the winning creative onto the 4-corner surface with perfect perspective.
            </p>
          </div>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-adv-surface border border-adv-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Viewer Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase text-adv-secondary whitespace-nowrap">
            Viewer Persona:
          </span>
          <select
            value={selectedViewerId}
            onChange={(e) => setSelectedViewerId(e.target.value)}
            className="bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-xl px-3 py-2 outline-none focus:border-adv-accent w-full sm:w-64"
          >
            {viewers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.country})
              </option>
            ))}
          </select>
        </div>

        {/* Zone Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase text-adv-secondary whitespace-nowrap">
            Marked Surface:
          </span>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-xl px-3 py-2 outline-none focus:border-adv-accent w-full sm:w-64"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label} (Area: {(z.frameShare * 100).toFixed(0)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ranked Brands & Affinity Bars */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-adv-border">
              <div>
                <h3 className="font-bold text-base text-adv-text">
                  Campaign Ranking & Rule Evaluation
                </h3>
                <p className="text-xs text-adv-secondary mt-0.5">
                  Intent affinities sorted with rule status badges (Selected, Allowed, Capped, Blocked, Expired)
                </p>
              </div>
              {loading && (
                <span className="text-xs text-adv-accent font-mono animate-pulse">
                  Evaluating Intent & Ad Networks...
                </span>
              )}
            </div>

            {/* Winner Spotlight Banner */}
            {decision?.winningCampaign && (
              <div className="p-4 rounded-xl bg-adv-accent/10 border border-adv-accent flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-adv-successBg text-adv-success border border-adv-success/30">
                    Winner: Selected Creative
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">
                    {decision.winningCampaign.brandName}
                  </h4>
                  <p className="text-xs text-adv-text mt-1">
                    {decision.explanation}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-adv-secondary block">
                    Category
                  </span>
                  <span className="text-sm font-bold text-adv-text uppercase font-mono block">
                    {decision.winningCampaign.category}
                  </span>
                </div>
              </div>
            )}

            {/* Ranked List */}
            <div className="space-y-3 pt-2">
              {decision?.ranked.map((brand) => {
                const pct = Math.round(((brand.intentScore ?? brand.qlooAffinity) || 0) * 100);
                const isSelected = brand.status === "selected";
                const isBlocked = brand.status === "blocked";
                const isCapped = brand.status === "capped";
                const isExpired = brand.status === "expired";

                return (
                  <div
                    key={brand.campaignId}
                    className={`p-4 rounded-xl border text-xs transition-colors ${
                      isSelected
                        ? "bg-adv-surfaceHover border-adv-accent"
                        : isBlocked
                        ? "bg-adv-dangerBg/40 border-adv-danger/30"
                        : isCapped
                        ? "bg-adv-warningBg/40 border-adv-warning/30"
                        : "bg-adv-sidebar border-adv-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-adv-text">
                          {brand.brandName || brand.campaignId}
                        </span>
                        <span className="text-[11px] text-adv-secondary font-mono">
                          [{brand.category}]
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          isSelected
                            ? "bg-adv-successBg border-adv-success text-adv-success"
                            : isBlocked
                            ? "bg-adv-dangerBg border-adv-danger text-adv-danger"
                            : isCapped
                            ? "bg-adv-warningBg border-adv-warning text-adv-warning"
                            : isExpired
                            ? "bg-adv-surface border-adv-border text-adv-secondary"
                            : "bg-adv-surface border-adv-border text-adv-secondary"
                        }`}
                      >
                        {brand.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-adv-surface h-2 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSelected
                            ? "bg-adv-accent"
                            : isBlocked
                            ? "bg-adv-danger"
                            : isCapped
                            ? "bg-adv-warning"
                            : "bg-adv-secondary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-adv-secondary">
                      <span>{brand.reason}</span>
                      <span className="font-mono font-bold text-adv-text">
                        Affinity: {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Raw Ad Network & Intent Trace Inspector */}
        <div className="space-y-4">
          <div className="bg-adv-surface border border-adv-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-adv-border">
              <Terminal size={18} className="text-adv-accent" />
              <h3 className="font-bold text-base text-adv-text">
                Raw Ad Network & Intent Trace
              </h3>
            </div>

            <p className="text-xs text-adv-secondary">
              Live network telemetry recorded during this intent decision request:
            </p>

            <div className="space-y-3">
              {decision?.trace && decision.trace.length > 0 ? (
                decision.trace.map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-adv-main border border-adv-border rounded-xl font-mono text-[11px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-adv-text">
                      <span className="font-bold text-adv-accent">
                        {tr.endpoint}
                      </span>
                      <span className="text-adv-success">HTTP {tr.status}</span>
                    </div>

                    <div className="text-[10px] text-adv-secondary">
                      <span>Latency: {tr.ms}ms</span>
                      <span className="ml-2">
                        Cache: {tr.cached ? "HIT (LRU)" : "MISS (Network)"}
                      </span>
                    </div>

                    <div className="bg-adv-sidebar p-2 rounded text-[10px] text-adv-secondary overflow-x-auto">
                      <pre>{JSON.stringify(tr.params, null, 2)}</pre>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-adv-secondary bg-adv-sidebar rounded-xl border border-adv-border">
                  No network traces recorded (bypassed via subscriber preference).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
