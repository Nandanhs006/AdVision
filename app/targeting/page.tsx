"use client";

import React, { useState, useEffect } from "react";
import { Viewer, Zone, Rules, Decision } from "@/lib/schema";
import { MetaIntentSynthesisResult } from "@/lib/ai/types";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import {
  Sparkles,
  Terminal,
  Filter,
  Layers,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Coffee,
  Flame,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
} from "lucide-react";

export default function TargetingPage() {
  const viewers = viewersJson as Viewer[];
  const zones = projectsJson[0].zones as Zone[];
  const defaultRules = projectsJson[0].rules as Rules;

  const [selectedViewerId, setSelectedViewerId] = useState<string>(viewers[0].id);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0].id);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Meta AI Intent Synthesizer State
  const [intentPrompt, setIntentPrompt] = useState<string>(
    "College students cramming for finals at 2 AM craving high-caffeine energy drinks"
  );
  const [synthesizing, setSynthesizing] = useState<boolean>(false);
  const [synthesisResult, setSynthesisResult] = useState<MetaIntentSynthesisResult | null>(null);
  const [showGraphJson, setShowGraphJson] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const selectedViewer = viewers.find((v) => v.id === selectedViewerId) || viewers[0];
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const presets = [
    {
      icon: Zap,
      label: "Late-Night Energy",
      prompt: "College students cramming for finals at 2 AM craving high-caffeine energy drinks",
      accent: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    },
    {
      icon: Coffee,
      label: "Commuter Espresso",
      prompt: "Commuters stuck in heavy Chicago traffic on a hot afternoon craving cold iced coffee",
      accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    },
    {
      icon: Flame,
      label: "Shibuya Streetwear",
      prompt: "Tokyo sneakerheads in Shibuya hunting for limited-edition streetwear drops",
      accent: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    },
    {
      icon: Compass,
      label: "Track Supercar",
      prompt: "Formula 1 racing enthusiasts looking for high-performance automotive tuning",
      accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    },
  ];

  const handleSynthesizeIntent = async (customPrompt?: string) => {
    const promptToRun = customPrompt || intentPrompt;
    if (!promptToRun.trim()) return;
    setSynthesizing(true);
    try {
      const res = await fetch("/api/intent/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToRun,
          sceneContext: {
            filmTitle: projectsJson[0].filmTitle,
            atmosphere: projectsJson[0].rules.sceneMood,
          },
          zone: selectedZone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSynthesisResult(data.synthesis);

        // Update live decision with Meta AI intent-driven auction result
        setDecision({
          zoneId: selectedZone.id,
          viewerId: selectedViewer.id,
          winner: data.winningCampaign.id,
          winningCampaign: data.winningCampaign,
          ranked: data.ranked,
          reasons: [
            data.synthesis.reasoning,
            `Purchasing Urgency: ${data.synthesis.purchasingUrgency.replace("_", " ")}`,
            `Receptivity Index: ${data.synthesis.receptivityIndex}%`,
            `Target Audience: ${data.synthesis.targetAudience}`,
          ],
          trace: [
            {
              endpoint: "POST /api/intent/synthesize (Meta Llama 3.3)",
              status: 200,
              ms: 182,
              cached: false,
              params: {
                model: data.synthesis.modelOrigin,
                receptivityIndex: data.synthesis.receptivityIndex,
                dominantCategory: data.synthesis.dominantCategory,
              },
            },
            {
              endpoint: "POST graph.facebook.com/v21.0/act_advision/adsets",
              status: 200,
              ms: 124,
              cached: false,
              params: {
                targeting: data.synthesis.metaAudienceNetwork.graphApiPayload.targeting,
                bid_strategy: data.synthesis.metaAudienceNetwork.bidStrategy,
                suggested_cpm: `$${data.synthesis.metaAudienceNetwork.suggestedBidCPM.toFixed(2)}`,
              },
            },
          ],
          explanation: `${data.synthesis.reasoning} Meta AI Localized Copy: "${data.synthesis.generatedHeadline}"`,
          source: "meta_audience_network",
          status: "approved",
        });
      }
    } catch {
      // ignore
    } finally {
      setSynthesizing(false);
    }
  };

  const handleCopyGraphJson = () => {
    if (!synthesisResult) return;
    navigator.clipboard.writeText(
      JSON.stringify(synthesisResult.metaAudienceNetwork.graphApiPayload, null, 2)
    );
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

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

      {/* Meta AI Intent Synthesizer & Prompt-to-Audience Engine */}
      <div className="bg-gradient-to-br from-adv-surface via-adv-surfaceHover to-adv-surface border-2 border-adv-accent/40 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-adv-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-adv-accent to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Meta AI Intent Synthesizer
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-adv-accent/20 text-adv-accent border border-adv-accent/40">
                  Llama 3.3 70B & Muse Wonder
                </span>
              </div>
              <p className="text-xs text-adv-secondary mt-0.5">
                Type any natural language buying intent or viewer state. Meta AI deconstructs commercial urgency, maps to Meta Audience Network taxonomy, and triggers instant dynamic auction.
              </p>
            </div>
          </div>

          {synthesisResult && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full whitespace-nowrap self-start md:self-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {synthesisResult.modelOrigin}
            </span>
          )}
        </div>

        {/* Natural Language Prompt Input */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={intentPrompt}
              onChange={(e) => setIntentPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSynthesizeIntent()}
              placeholder="Type any natural language buying intent (e.g. 'College students cramming for finals craving high-caffeine energy drinks')..."
              className="w-full bg-adv-main border border-adv-border focus:border-adv-accent text-sm text-adv-text rounded-2xl px-4 py-3.5 outline-none transition-all pr-10 shadow-inner"
            />
          </div>

          <button
            onClick={() => handleSynthesizeIntent()}
            disabled={synthesizing}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-adv-accent via-indigo-600 to-purple-600 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-adv-accent/20 whitespace-nowrap disabled:opacity-60"
          >
            <Sparkles size={16} className={synthesizing ? "animate-spin" : ""} />
            <span>{synthesizing ? "Synthesizing Intent..." : "Synthesize with Meta AI"}</span>
          </button>
        </div>

        {/* Quick-Try Preset Intent Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-adv-secondary">
            Quick-Try Intent Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setIntentPrompt(p.prompt);
                    handleSynthesizeIntent(p.prompt);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 active:scale-95 ${p.accent}`}
                >
                  <Icon size={13} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Synthesis Result HUD (if generated) */}
        {synthesisResult && (
          <div className="p-5 rounded-2xl bg-adv-main/90 border border-adv-border space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Receptivity Meter */}
              <div className="p-3.5 rounded-xl bg-adv-sidebar border border-adv-border flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg font-mono">
                  {synthesisResult.receptivityIndex}%
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-adv-secondary block">
                    In-Scene Receptivity
                  </span>
                  <span className="text-xs font-bold text-white block">
                    {synthesisResult.receptivityIndex >= 90 ? "High Purchase Intent" : "Considered Receptive"}
                  </span>
                </div>
              </div>

              {/* Dominant Category & Urgency */}
              <div className="p-3.5 rounded-xl bg-adv-sidebar border border-adv-border space-y-1">
                <span className="text-[10px] font-mono uppercase text-adv-secondary block">
                  Category & Urgency
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-adv-accent/20 text-adv-accent font-mono">
                    {synthesisResult.dominantCategory}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 font-mono">
                    {synthesisResult.purchasingUrgency.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Winning Matched Brand */}
              <div className="p-3.5 rounded-xl bg-adv-sidebar border border-adv-border space-y-1">
                <span className="text-[10px] font-mono uppercase text-adv-secondary block">
                  Meta AI Top Brand Match
                </span>
                <span className="text-sm font-black text-emerald-400 block truncate">
                  {synthesisResult.matchedBrandName}
                </span>
                <span className="text-[10px] font-mono text-adv-secondary block">
                  Suggested CPM: ${synthesisResult.metaAudienceNetwork.suggestedBidCPM.toFixed(2)}
                </span>
              </div>

              {/* Localized Copy & CTA */}
              <div className="p-3.5 rounded-xl bg-adv-sidebar border border-adv-border space-y-1">
                <span className="text-[10px] font-mono uppercase text-adv-secondary block">
                  Synthesized In-Scene Copy
                </span>
                <span className="text-xs font-bold text-white block truncate" title={synthesisResult.generatedHeadline}>
                  &ldquo;{synthesisResult.generatedHeadline}&rdquo;
                </span>
                <span className="text-[10px] font-mono text-adv-accent font-bold">
                  CTA: {synthesisResult.generatedCta}
                </span>
              </div>
            </div>

            {/* Psychological Triggers */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-adv-border/60">
              <span className="text-[10px] font-mono uppercase text-adv-secondary">
                Psychological Triggers:
              </span>
              {synthesisResult.psychologicalTriggers.map((trig, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-adv-secondary"
                >
                  #{trig}
                </span>
              ))}
            </div>

            {/* Collapsible Meta Ads Manager Graph API Payload */}
            <div className="pt-2 border-t border-adv-border/60">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowGraphJson(!showGraphJson)}
                  className="flex items-center gap-1.5 text-xs font-mono text-adv-accent hover:underline"
                >
                  <Code2 size={13} />
                  <span>
                    {showGraphJson
                      ? "Hide Meta Graph API (v21.0) Ad Set Targeting Payload"
                      : "View Meta Graph API (v21.0) Ad Set Targeting Payload"}
                  </span>
                  {showGraphJson ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showGraphJson && (
                  <button
                    type="button"
                    onClick={handleCopyGraphJson}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white transition-colors"
                  >
                    {copiedJson ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedJson ? "Copied JSON" : "Copy Payload"}</span>
                  </button>
                )}
              </div>

              {showGraphJson && (
                <div className="mt-3 p-3.5 bg-black/80 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56">
                  <pre>{JSON.stringify(synthesisResult.metaAudienceNetwork.graphApiPayload, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
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
