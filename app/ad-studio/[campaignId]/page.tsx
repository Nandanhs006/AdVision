"use client";

import { use, useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Info,
  Check,
  RefreshCw,
  Share2,
  Download,
  Copy,
  Layers,
  Edit3,
  Lock,
  Unlock,
  Radio,
  ExternalLink,
  ChevronRight,
  Send,
  AlertCircle,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Heart,
  Eye,
  Sliders,
  Target,
} from "lucide-react";
import {
  AdCreative,
  AdVariant,
  AdAspect,
  LayoutArchetype,
  TasteProfile,
  Campaign,
  MotionAdPlan,
} from "@/lib/schema";
import { MotionAdPlayer } from "@/components/MotionAdPlayer";

const LAYOUT_CYCLE: LayoutArchetype[] = [
  "minimal-center",
  "bold-type",
  "split-panel",
  "collage-grid",
  "story-vertical",
  "price-badge",
];

export default function CampaignVariantsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);

  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);

  // Active view states
  const [selectedVariant, setSelectedVariant] = useState<AdVariant>("primary");
  const [selectedAspect, setSelectedAspect] = useState<AdAspect>("1:1");
  const [previewPlatform, setPreviewPlatform] = useState<"feed" | "story" | "facebook" | "motion">("feed");
  const [motionPlan, setMotionPlan] = useState<MotionAdPlan | null>(null);
  const [isRegeneratingMotion, setIsRegeneratingMotion] = useState(false);

  const handleMotionDurationChange = async (durationSec: number) => {
    setIsRegeneratingMotion(true);
    try {
      const res = await fetch("/api/ads/motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          durationSec,
          brief: {
            brandName: campaign?.brandName || (campaignId.includes("repbull") ? "RepBull Energy" : "Sony Alpha Optics"),
            product: campaign?.headline?.["en"] || (campaignId.includes("repbull") ? "Zero Sugar Ultra Focus" : "Alpha 7R V Full Frame"),
            category: campaign?.category || "beverage",
            goal: "awareness",
            languages: ["en"],
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setMotionPlan(data.plan);
        }
      }
    } catch (err) {
      console.error("Failed to change motion duration:", err);
    } finally {
      setIsRegeneratingMotion(false);
    }
  };

  // Drawer & Dialog states
  const [showWhyDrawer, setShowWhyDrawer] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [lockedTokens, setLockedTokens] = useState<Record<string, boolean>>({
    palette: false,
    layout: false,
    typeStyle: false,
  });

  // Action status states
  const [approving, setApproving] = useState(false);
  const [regeneratingCopy, setRegeneratingCopy] = useState(false);
  const [useAsInSceneMessage, setUseAsInSceneMessage] = useState<string | null>(null);
  const [copiedTargeting, setCopiedTargeting] = useState(false);

  // Publish Dialog States
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);

  // 1. Fetch initial creatives & metadata
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load campaigns
        const campRes = await fetch("/api/campaigns");
        if (campRes.ok) {
          const campData = await campRes.json();
          const found = campData.find((c: Campaign) => c.id === campaignId);
          if (found) setCampaign(found);
        }

        // Load connections
        const connRes = await fetch("/api/connections");
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnections(connData.connections || []);
          if (connData.connections?.length > 0) {
            setSelectedConnectionId(connData.connections[0].id);
          }
        }

        // If no creatives found yet, trigger mock synthesis or fetch
        // Let's generate/load from API
        const genRes = await fetch("/api/ads/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: {
              brandName: campaignId.includes("repbull")
                ? "RepBull Energy"
                : campaignId.includes("sony")
                ? "Sony Alpha Optics"
                : "MRF ZLX Tyres",
              product: "High Performance Series",
              category: "lifestyle",
              goal: "awareness",
              languages: ["en"],
            },
            cohort: {
              city: campaignId.includes("sony") ? "Tokyo" : "New York",
              country: campaignId.includes("sony") ? "Japan" : "United States",
              language: campaignId.includes("sony") ? "ja" : "en",
              ageBand: "25-34",
              anchors: campaignId.includes("sony")
                ? ["Ryuichi Sakamoto", "Haruki Murakami", "Daikanyama T-Site"]
                : ["Tyler The Creator", "Formula 1", "Dumbo Brooklyn"],
              goal: "awareness",
            },
          }),
        });

        if (genRes.ok) {
          const genData = await genRes.json();
          setCreatives(genData.creatives || []);
          setTasteProfile(genData.tasteProfile || null);

          // Generate 15s Motion Billboard plan with Meta Muse Spark
          const motionRes = await fetch("/api/ads/motion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              brief: {
                brandName: campaignId.includes("repbull")
                  ? "RepBull Energy"
                  : campaignId.includes("sony")
                  ? "Sony Alpha Optics"
                  : "Kissa Craft Roasters",
                product: campaignId.includes("repbull")
                  ? "Zero Sugar Ultra Focus"
                  : campaignId.includes("sony")
                  ? "Alpha 7R V Full Frame"
                  : "Shibuya Drip Blend",
                category: campaignId.includes("repbull")
                  ? "beverage"
                  : campaignId.includes("sony")
                  ? "electronics"
                  : "coffee",
                goal: "awareness",
                languages: ["en"],
              },
            }),
          });
          if (motionRes.ok) {
            const mData = await motionRes.json();
            if (mData.plan) setMotionPlan(mData.plan);
          }
        }
      } catch (err) {
        console.error("Failed to load campaign data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [campaignId]);

  // Current active creative
  const activeCreative = useMemo(() => {
    return (
      creatives.find(
        (c) => c.variant === selectedVariant && c.aspect === selectedAspect
      ) || creatives[0]
    );
  }, [creatives, selectedVariant, selectedAspect]);

  // Handlers
  const handleToggleLock = (token: "palette" | "layout" | "typeStyle") => {
    setLockedTokens((prev) => ({ ...prev, [token]: !prev[token] }));
  };

  const handleSwapLayout = () => {
    if (!activeCreative) return;
    const currentIdx = LAYOUT_CYCLE.indexOf(activeCreative.style.layout);
    const nextLayout = LAYOUT_CYCLE[(currentIdx + 1) % LAYOUT_CYCLE.length];

    setCreatives((prev) =>
      prev.map((c) =>
        c.variant === selectedVariant
          ? { ...c, style: { ...c.style, layout: nextLayout } }
          : c
      )
    );
  };

  const handleRegenerateCopy = async () => {
    if (!activeCreative) return;
    setRegeneratingCopy(true);
    try {
      const res = await fetch("/api/ads/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            brandName: campaign?.brandName || "Advision",
            product: activeCreative.copy.headline,
            category: campaign?.category || "lifestyle",
            goal: "awareness",
          },
          tone: activeCreative.style.tone,
          language: "en",
          goal: "awareness",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatives((prev) =>
          prev.map((c) =>
            c.variant === selectedVariant ? { ...c, copy: data.copy } : c
          )
        );
      }
    } finally {
      setRegeneratingCopy(false);
    }
  };

  const handleApprove = async (useAsInScene = false) => {
    if (!activeCreative) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/ads/${activeCreative.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useAsInScene }),
      });
      if (res.ok) {
        setCreatives((prev) =>
          prev.map((c) =>
            c.variant === selectedVariant ? { ...c, status: "approved" } : c
          )
        );
        if (useAsInScene) {
          setUseAsInSceneMessage("Creative linked! Updated in-scene billboard placement.");
          setTimeout(() => setUseAsInSceneMessage(null), 4000);
        }
      }
    } finally {
      setApproving(false);
    }
  };

  const handlePublish = async () => {
    if (!activeCreative || !selectedConnectionId) return;
    setPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch("/api/ads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeId: activeCreative.id,
          connectionId: selectedConnectionId,
        }),
      });
      const data = await res.json();
      setPublishResult(data);
      if (data.job) {
        setCreatives((prev) =>
          prev.map((c) =>
            c.id === activeCreative.id ? { ...c, status: data.job.status } : c
          )
        );
      }
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyTargeting = () => {
    if (!tasteProfile) return;
    const text = `Targeting Suggestions:
Location: ${campaignId.includes("sony") ? "Tokyo, Japan" : "New York, United States"}
Age: 21-34
Interests: ${tasteProfile.topTags.map((t) => t.name).join(", ")}
Language: ${campaignId.includes("sony") ? "Japanese" : "English"}`;

    navigator.clipboard.writeText(text);
    setCopiedTargeting(true);
    setTimeout(() => setCopiedTargeting(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw size={28} className="animate-spin text-adv-accent" />
        <p className="text-sm text-adv-secondary font-mono">
          Loading intent models and rendering creative variants...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-adv-accent/10 text-adv-accent font-semibold uppercase tracking-wider border border-adv-accent/20">
              Creative Studio
            </span>
            <span className="text-xs text-adv-secondary font-mono">
              Campaign: {campaign?.brandName || campaignId}
            </span>
            {tasteProfile?.source === "fixture" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                Sample data
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-adv-text tracking-tight mt-1">
            Intent-Engineered Ad Variants (Meta Ads & Audience Network)
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowWhyDrawer(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-xs font-semibold transition-colors shadow-sm"
          >
            <Info size={15} className="text-adv-accent" />
            <span>Why this creative?</span>
          </button>

          <button
            onClick={() => handleApprove(true)}
            disabled={approving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-xs font-semibold transition-colors"
          >
            <Layers size={15} className="text-adv-success" />
            <span>Use as in-scene creative</span>
          </button>

          <button
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white text-xs font-bold transition-all shadow-sm"
          >
            <Send size={15} />
            <span>Publish Post</span>
          </button>
        </div>
      </div>

      {useAsInSceneMessage && (
        <div className="p-3.5 rounded-lg bg-adv-successBg border border-adv-success/30 text-adv-success text-xs font-semibold flex items-center gap-2">
          <Check size={16} />
          <span>{useAsInSceneMessage}</span>
          <Link href="/watch/proj-tokyo-nightfall" className="underline ml-auto flex items-center gap-1">
            <span>View Billboard Scene</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Variants, Archetype Controls & Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Variant Selector Tabs */}
          <div className="p-4 rounded-xl bg-adv-surface border border-adv-border space-y-3">
            <span className="text-xs font-semibold text-adv-secondary uppercase tracking-wider block">
              Creative Variants (Deterministic)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["primary", "contrast", "safe"] as AdVariant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVariant(v)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedVariant === v
                      ? "bg-adv-surfaceHover border-adv-accent text-adv-text shadow-sm"
                      : "bg-adv-bg border-adv-border text-adv-secondary hover:text-adv-text"
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{v}</div>
                  <div className="text-[10px] text-adv-secondary truncate mt-0.5">
                    {v === "primary" ? "Best Match" : v === "contrast" ? "Alt Angle" : "Neutral"}
                  </div>
                </button>
              ))}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-adv-secondary uppercase tracking-wider block mb-1.5">
                Aspect Ratio Format
              </span>
              <div className="flex items-center gap-2">
                {(["1:1", "4:5", "9:16"] as AdAspect[]).map((aspect) => (
                  <button
                    key={aspect}
                    onClick={() => setSelectedAspect(aspect)}
                    className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-md border transition-colors ${
                      selectedAspect === aspect
                        ? "bg-adv-accent text-white border-adv-accent"
                        : "bg-adv-bg text-adv-secondary border-adv-border hover:text-adv-text"
                    }`}
                  >
                    {aspect}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Creative Studio Controls */}
          {activeCreative && (
            <div className="p-4 rounded-xl bg-adv-surface border border-adv-border space-y-4">
              <div className="flex items-center justify-between border-b border-adv-border pb-2.5">
                <span className="text-xs font-bold text-adv-text uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-adv-accent" />
                  <span>Creative Controls</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-adv-surfaceHover border border-adv-border text-adv-secondary">
                  Layout: {activeCreative.style.layout}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleRegenerateCopy}
                  disabled={regeneratingCopy}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-adv-bg hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={regeneratingCopy ? "animate-spin text-adv-accent" : ""} />
                  <span>Regenerate Copy</span>
                </button>

                <button
                  onClick={handleSwapLayout}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-adv-bg hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-xs font-semibold transition-colors"
                >
                  <Layers size={14} />
                  <span>Cycle Layout</span>
                </button>

                <button
                  onClick={() => setIsEditingText(!isEditingText)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    isEditingText
                      ? "bg-adv-accent text-white border-adv-accent"
                      : "bg-adv-bg hover:bg-adv-surfaceHover border-adv-border text-adv-text"
                  }`}
                >
                  <Edit3 size={14} />
                  <span>{isEditingText ? "Done Editing" : "Edit Text"}</span>
                </button>

                <button
                  onClick={() => handleApprove(false)}
                  disabled={approving}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-adv-successBg hover:bg-adv-success/20 border border-adv-success/30 text-adv-success text-xs font-semibold transition-colors"
                >
                  <Check size={14} />
                  <span>Approve Creative</span>
                </button>
              </div>

              {/* Lock Tokens */}
              <div className="pt-2 border-t border-adv-border">
                <span className="text-[11px] font-semibold text-adv-secondary uppercase tracking-wider block mb-2">
                  Lock Design Tokens
                </span>
                <div className="flex items-center gap-2">
                  {(["palette", "layout", "typeStyle"] as const).map((token) => {
                    const isLocked = lockedTokens[token];
                    return (
                      <button
                        key={token}
                        onClick={() => handleToggleLock(token)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-medium border transition-colors ${
                          isLocked
                            ? "bg-adv-accent/20 border-adv-accent text-adv-accent"
                            : "bg-adv-bg border-adv-border text-adv-secondary hover:text-adv-text"
                        }`}
                      >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        <span className="capitalize">{token}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Fields */}
              {isEditingText && (
                <div className="space-y-3 pt-2 border-t border-adv-border">
                  <div>
                    <label className="text-[11px] text-adv-secondary block mb-1">Headline (Max 7 words)</label>
                    <input
                      type="text"
                      value={activeCreative.copy.headline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreatives((prev) =>
                          prev.map((c) =>
                            c.id === activeCreative.id
                              ? { ...c, copy: { ...c.copy, headline: val } }
                              : c
                          )
                        );
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-adv-bg border border-adv-border text-xs text-adv-text"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-adv-secondary block mb-1">Body Text</label>
                    <textarea
                      rows={2}
                      value={activeCreative.copy.body}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreatives((prev) =>
                          prev.map((c) =>
                            c.id === activeCreative.id
                              ? { ...c, copy: { ...c.copy, body: val } }
                              : c
                          )
                        );
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-adv-bg border border-adv-border text-xs text-adv-text"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-adv-secondary block mb-1">Call to Action</label>
                    <input
                      type="text"
                      value={activeCreative.copy.cta}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreatives((prev) =>
                          prev.map((c) =>
                            c.id === activeCreative.id
                              ? { ...c, copy: { ...c.copy, cta: val } }
                              : c
                          )
                        );
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-adv-bg border border-adv-border text-xs text-adv-text"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested Targeting Card for Meta Ads Manager */}
          {tasteProfile && (
            <div className="p-4 rounded-xl bg-adv-surface border border-adv-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-adv-text uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={14} className="text-adv-accent" />
                  <span>Suggested Targeting</span>
                </span>
                <button
                  onClick={handleCopyTargeting}
                  className="text-xs text-adv-accent hover:underline flex items-center gap-1"
                >
                  {copiedTargeting ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedTargeting ? "Copied" : "Copy to Meta"}</span>
                </button>
              </div>

              <div className="text-[11px] text-adv-secondary space-y-1.5 bg-adv-bg p-3 rounded-lg border border-adv-border">
                <div>
                  <span className="font-semibold text-adv-text">Location:</span>{" "}
                  {campaignId.includes("sony") ? "Tokyo, Japan" : "New York, United States"}
                </div>
                <div>
                  <span className="font-semibold text-adv-text">Age Range:</span> 21 - 34
                </div>
                <div>
                  <span className="font-semibold text-adv-text">Interests:</span>{" "}
                  {tasteProfile.topTags.map((t) => t.name).join(", ")}
                </div>
                <div>
                  <span className="font-semibold text-adv-text">Language:</span>{" "}
                  {campaignId.includes("sony") ? "Japanese" : "English"}
                </div>
              </div>

              <p className="text-[10px] text-adv-secondary italic">
                * suggestions, not applied automatically. Copy into Meta Ads Manager for exact cohort delivery.
              </p>
            </div>
          )}
        </div>

        {/* Right Col: Interactive Platform Previews (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Platform Mockup Switcher */}
          <div className="flex items-center justify-between bg-adv-surface p-2 rounded-xl border border-adv-border">
            <div className="flex items-center gap-1.5">
              {[
                { id: "feed", label: "Instagram Feed" },
                { id: "story", label: "Instagram Story" },
                { id: "facebook", label: "Facebook Post" },
                { id: "motion", label: "15s Motion Billboard (Meta AI)" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreviewPlatform(p.id as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    previewPlatform === p.id
                      ? "bg-adv-accent text-white shadow-sm"
                      : "text-adv-secondary hover:text-adv-text"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <a
              href={activeCreative?.imageUrl}
              download={`${campaignId}-${selectedVariant}-${selectedAspect}.png`}
              className="flex items-center gap-1.5 text-xs text-adv-secondary hover:text-adv-text px-2.5 py-1.5 rounded bg-adv-bg border border-adv-border"
            >
              <Download size={13} />
              <span>Download PNG</span>
            </a>
          </div>

          {/* Mockup Frame */}
          <div className="flex justify-center p-6 bg-adv-bg rounded-xl border border-adv-border min-h-[580px] items-center">
            {activeCreative ? (
              previewPlatform === "feed" ? (
                /* Instagram Feed Mockup */
                <div className="w-[380px] bg-black text-white rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden font-sans">
                  {/* Feed Header */}
                  <div className="flex items-center justify-between p-3.5 border-b border-zinc-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5">
                        <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-[10px] font-bold">
                          {campaign?.brandName?.charAt(0) || "A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">
                          {campaign?.brandName?.toLowerCase().replace(/\s+/g, "_") || "advision.studio"}
                        </div>
                        <div className="text-[10px] text-zinc-400">Sponsored</div>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-sm">•••</span>
                  </div>

                  {/* Feed Image */}
                  <div className="relative aspect-square w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeCreative.imageUrl}
                      alt={activeCreative.copy.altText}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Action Bar */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-zinc-300">
                        <Heart size={20} />
                        <MessageCircle size={20} />
                        <Share2 size={20} />
                      </div>
                      <Bookmark size={20} className="text-zinc-300" />
                    </div>

                    {/* CTA Strip */}
                    <div className="flex items-center justify-between py-1.5 px-3 rounded bg-zinc-900 text-xs">
                      <span className="font-semibold text-adv-accent">{activeCreative.copy.cta}</span>
                      <ChevronRight size={14} className="text-zinc-400" />
                    </div>

                    {/* Caption */}
                    <div className="text-xs leading-relaxed text-zinc-200">
                      <span className="font-bold mr-1.5">
                        {campaign?.brandName?.toLowerCase().replace(/\s+/g, "_") || "advision.studio"}
                      </span>
                      <span>{activeCreative.copy.caption}</span>
                    </div>
                  </div>
                </div>
              ) : previewPlatform === "story" ? (
                /* Instagram Story Mockup */
                <div className="w-[320px] h-[570px] bg-black text-white rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col justify-between p-4 font-sans">
                  {/* Story Progress Bar */}
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-white rounded-full" />
                  </div>

                  {/* Story Header */}
                  <div className="flex items-center gap-2 pt-2 z-10">
                    <div className="w-7 h-7 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px]">
                      {campaign?.brandName?.charAt(0) || "A"}
                    </div>
                    <span className="text-xs font-bold">{campaign?.brandName || "Brand"}</span>
                    <span className="text-[10px] text-zinc-400">Sponsored</span>
                  </div>

                  {/* Story Centered Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeCreative.imageUrl}
                      alt={activeCreative.copy.altText}
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>

                  {/* Swipe Up Sticker */}
                  <div className="z-10 flex flex-col items-center gap-1.5 pb-2">
                    <div className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold shadow-lg flex items-center gap-1">
                      <span>{activeCreative.copy.cta}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ) : previewPlatform === "motion" && motionPlan ? (
                /* Meta AI Motion Billboard Player (Beat Sync, 15s to 3m Configurable) */
                <div className="w-full max-w-[640px]">
                  <MotionAdPlayer
                    plan={motionPlan}
                    aspect="16:9"
                    onDurationChange={handleMotionDurationChange}
                    isLoadingNewDuration={isRegeneratingMotion}
                  />
                </div>
              ) : (
                /* Facebook Post Mockup */
                <div className="w-[420px] bg-zinc-900 text-white rounded-xl border border-zinc-800 shadow-2xl overflow-hidden font-sans">
                  {/* FB Header */}
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                      {campaign?.brandName?.charAt(0) || "F"}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{campaign?.brandName || "Advision Demo Page"}</div>
                      <div className="text-[10px] text-zinc-400">Sponsored · 🌐</div>
                    </div>
                  </div>

                  <div className="px-3.5 pb-2.5 text-xs text-zinc-200">
                    {activeCreative.copy.caption}
                  </div>

                  {/* FB Image */}
                  <div className="w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeCreative.imageUrl}
                      alt={activeCreative.copy.altText}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* FB Link Strip */}
                  <div className="p-3 bg-zinc-950 flex items-center justify-between border-t border-zinc-800">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">ADVISION.STUDIO</div>
                      <div className="text-xs font-bold text-white truncate max-w-[260px]">
                        {activeCreative.copy.headline}
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded bg-zinc-800 text-xs font-semibold hover:bg-zinc-700">
                      {activeCreative.copy.cta}
                    </button>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      {/* "Why this creative?" Slide-Over Drawer */}
      {showWhyDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-adv-surface border-l border-adv-border p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-adv-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-adv-text">Why this creative?</h2>
                <p className="text-xs text-adv-secondary">
                  Complete explainability: In-market intent tags, audience entities, and style tokens.
                </p>
              </div>
              <button
                onClick={() => setShowWhyDrawer(false)}
                className="text-adv-secondary hover:text-adv-text text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Top Intent Tags */}
            {tasteProfile && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-adv-secondary uppercase tracking-wider block">
                  1. Top Intent & Audience Tags (Affinity-Weighted)
                </span>
                <div className="space-y-1.5">
                  {tasteProfile.topTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-2 rounded bg-adv-bg border border-adv-border text-xs"
                    >
                      <span className="font-medium text-adv-text">{tag.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-adv-surface overflow-hidden">
                          <div
                            className="h-full bg-adv-accent"
                            style={{ width: `${Math.round(tag.weight * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-adv-secondary w-8 text-right">
                          {tag.weight}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Cultural Entities */}
            {tasteProfile && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-adv-secondary uppercase tracking-wider block">
                  2. Top Cultural Entities (Cross-Domain)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {tasteProfile.topEntities.slice(0, 6).map((entity) => (
                    <div
                      key={entity.name}
                      className="p-2.5 rounded bg-adv-bg border border-adv-border text-xs"
                    >
                      <div className="text-[10px] text-adv-secondary uppercase font-mono">{entity.type}</div>
                      <div className="font-bold text-adv-text truncate">{entity.name}</div>
                      <div className="text-[11px] text-adv-accent font-semibold mt-1">
                        {Math.round(entity.affinity * 100)}% affinity
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Design Token Rules Fired */}
            {activeCreative?.styleReasons && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-adv-secondary uppercase tracking-wider block">
                  3. Deterministic Mapping Rules
                </span>
                <div className="space-y-2">
                  {activeCreative.styleReasons.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded bg-adv-bg border border-adv-border text-xs text-adv-secondary leading-relaxed"
                    >
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Trace Timeline */}
            {tasteProfile?.traces && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-adv-secondary uppercase tracking-wider block">
                  4. Raw Intent & Telemetry Trace Log
                </span>
                <div className="space-y-1 font-mono text-[11px] text-adv-secondary bg-adv-bg p-3 rounded-lg border border-adv-border overflow-x-auto max-h-40">
                  {tasteProfile.traces.map((tr, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 border-b border-adv-border/40">
                      <span>{tr.endpoint}</span>
                      <span className="text-adv-success">{tr.ms.toFixed(1)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish Dialog */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-adv-border pb-3">
              <div>
                <h3 className="text-base font-bold text-adv-text">Publish Creative</h3>
                <p className="text-xs text-adv-secondary">
                  Publish to Instagram Professional or Facebook Page.
                </p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-adv-secondary hover:text-adv-text font-bold"
              >
                ✕
              </button>
            </div>

            {/* Connection Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-adv-secondary uppercase tracking-wider block">
                Target Account
              </label>
              <select
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.mode === "simulated" ? "Simulated Demo" : "Live"})
                  </option>
                ))}
              </select>
            </div>

            {/* Payload Preview */}
            <div className="p-3 rounded-lg bg-adv-bg border border-adv-border space-y-2 text-xs">
              <div className="font-semibold text-adv-text">Publish Payload:</div>
              <div className="text-adv-secondary truncate">Image: {activeCreative?.imageUrl}</div>
              <div className="text-adv-secondary text-[11px]">{activeCreative?.copy.caption}</div>
            </div>

            {/* Result Display */}
            {publishResult && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  publishResult.result?.success
                    ? "bg-adv-successBg border border-adv-success/30 text-adv-success"
                    : "bg-adv-dangerBg border border-adv-danger/30 text-adv-danger"
                }`}
              >
                <div>
                  <div>Status: {publishResult.result?.status}</div>
                  <div className="text-[11px] font-mono mt-0.5">
                    Post ID: {publishResult.result?.externalPostId || "N/A"}
                  </div>
                </div>
                {publishResult.result?.simulated && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                    Simulated
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                disabled
                className="text-xs text-adv-secondary opacity-50 cursor-not-allowed border border-dashed border-adv-border px-3 py-2 rounded-lg"
              >
                Boost with paid ads (roadmap)
              </button>

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white font-bold text-xs transition-all shadow-md disabled:opacity-50"
              >
                {publishing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{publishing ? "Publishing..." : "Confirm Publish"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
