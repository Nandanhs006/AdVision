"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Palette,
  Target,
  Wand2,
  Tag,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Brief, Cohort } from "@/lib/schema";

const PRESETS = [
  {
    name: "RepBull Energy (US)",
    brief: {
      brandName: "RepBull Energy",
      product: "RepBull Zero Sugar",
      category: "beverage",
      goal: "awareness" as const,
      languages: ["en"],
      paletteOverride: { bg: "#001a30", fg: "#ffffff", accent: "#ffd600" },
    },
    cohort: {
      city: "New York",
      country: "United States",
      language: "en",
      ageBand: "21-30",
      anchors: ["Tyler The Creator", "Formula 1", "Dumbo Brooklyn", "Skateboarding"],
      goal: "awareness" as const,
    },
  },
  {
    name: "Sony Alpha Optics (Japan)",
    brief: {
      brandName: "Sony Alpha Optics",
      product: "Alpha 7R V Mirrorless",
      category: "electronics",
      goal: "traffic" as const,
      languages: ["ja"],
      paletteOverride: { bg: "#0c0c0e", fg: "#f8f8f8", accent: "#ff6600" },
    },
    cohort: {
      city: "Tokyo",
      country: "Japan",
      language: "ja",
      ageBand: "25-34",
      anchors: ["Ryuichi Sakamoto", "Haruki Murakami", "Daikanyama T-Site", "Street Photography"],
      goal: "traffic" as const,
    },
  },
  {
    name: "MRF ZLX Tyres (India)",
    brief: {
      brandName: "MRF ZLX Tyres",
      product: "MRF Steel Radial Touring",
      category: "automotive",
      goal: "sales" as const,
      languages: ["te", "en"],
      paletteOverride: { bg: "#150406", fg: "#ffffff", accent: "#d3112a" },
    },
    cohort: {
      city: "Visakhapatnam",
      country: "India",
      language: "te",
      ageBand: "25-45",
      anchors: ["A.R. Rahman", "Cricket", "Highway Road Trips", "Fort Kochi"],
      goal: "sales" as const,
    },
  },
];

export default function AdStudioCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Brief State
  const [brief, setBrief] = useState<Brief>({
    brandName: "RepBull Energy",
    product: "RepBull Zero Sugar",
    category: "beverage",
    goal: "awareness",
    languages: ["en"],
    paletteOverride: { bg: "#001a30", fg: "#ffffff", accent: "#ffd600" },
  });

  // Step 2: Cohort State
  const [cohort, setCohort] = useState<Cohort>({
    city: "New York",
    country: "United States",
    language: "en",
    ageBand: "21-30",
    anchors: ["Tyler The Creator", "Formula 1", "Dumbo Brooklyn"],
    goal: "awareness",
  });

  const [anchorInput, setAnchorInput] = useState("");

  const handleApplyPreset = (idx: number) => {
    const preset = PRESETS[idx];
    setBrief(preset.brief);
    setCohort(preset.cohort);
  };

  const handleAddAnchor = () => {
    const trimmed = anchorInput.trim();
    if (!trimmed) return;
    if (cohort.anchors.length >= 5) {
      setError("Maximum 5 cultural anchors allowed for cohort precision.");
      return;
    }
    if (!cohort.anchors.includes(trimmed)) {
      setCohort({
        ...cohort,
        anchors: [...cohort.anchors, trimmed],
      });
      setAnchorInput("");
      setError(null);
    }
  };

  const handleRemoveAnchor = (index: number) => {
    if (cohort.anchors.length <= 3) {
      setError("At least 3 audience anchors required for intent analysis.");
      return;
    }
    setCohort({
      ...cohort,
      anchors: cohort.anchors.filter((_, i) => i !== index),
    });
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          cohort: { ...cohort, goal: brief.goal },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      router.push(`/ad-studio/${data.campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-adv-accent/10 text-adv-accent text-xs font-semibold uppercase tracking-wider border border-adv-accent/20">
              Ad Studio
            </span>
            <span className="text-xs text-adv-secondary font-mono">Meta Audience Network & Meta Ads</span>
          </div>
          <h1 className="text-2xl font-bold text-adv-text tracking-tight mt-1">
            Generate In-Scene & Social Ad Creatives
          </h1>
          <p className="text-sm text-adv-secondary mt-1">
            Turn audience intent signals and in-market data into multi-aspect responsive posters, localized copy, and Meta ad units with Meta AI.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-adv-secondary font-medium">Quick Presets:</span>
          {PRESETS.map((p, idx) => (
            <button
              key={p.name}
              onClick={() => handleApplyPreset(idx)}
              className="text-xs px-2.5 py-1.5 rounded-md bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text transition-colors"
            >
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-adv-border -z-0" />
        {[
          { num: 1, label: "Brand Brief", icon: Palette },
          { num: 2, label: "Target Cohort", icon: Target },
          { num: 3, label: "Review & Generate", icon: Wand2 },
        ].map((s) => {
          const Icon = s.icon;
          const isDone = step > s.num;
          const isCurrent = step === s.num;

          return (
            <div key={s.num} className="relative z-10 flex flex-col items-center bg-adv-bg px-3">
              <button
                onClick={() => setStep(s.num as 1 | 2 | 3)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border ${
                  isCurrent
                    ? "bg-adv-accent text-white border-adv-accent shadow-md scale-110"
                    : isDone
                    ? "bg-adv-successBg text-adv-success border-adv-success/40"
                    : "bg-adv-surface text-adv-secondary border-adv-border"
                }`}
              >
                {isDone ? <Check size={18} /> : <Icon size={18} />}
              </button>
              <span
                className={`text-xs mt-2 font-medium ${
                  isCurrent ? "text-adv-text font-bold" : "text-adv-secondary"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-adv-dangerBg border border-adv-danger/30 text-adv-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: BRIEF */}
      {step === 1 && (
        <div className="p-6 rounded-xl bg-adv-surface border border-adv-border space-y-6">
          <div className="border-b border-adv-border pb-4">
            <h2 className="text-lg font-bold text-adv-text">1. Brand & Campaign Brief</h2>
            <p className="text-xs text-adv-secondary mt-1">
              Provide product details, marketing objective, and optional palette override.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={brief.brandName}
                onChange={(e) => setBrief({ ...brief, brandName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
                placeholder="e.g. RepBull Energy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={brief.product}
                onChange={(e) => setBrief({ ...brief, product: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
                placeholder="e.g. Zero Sugar Performance"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                value={brief.category}
                onChange={(e) => setBrief({ ...brief, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
                placeholder="e.g. beverage, electronics, automotive"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Campaign Goal
              </label>
              <select
                value={brief.goal}
                onChange={(e) =>
                  setBrief({ ...brief, goal: e.target.value as "awareness" | "traffic" | "sales" })
                }
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
              >
                <option value="awareness">Brand Awareness</option>
                <option value="traffic">Traffic & Consideration</option>
                <option value="sales">Conversions & Sales</option>
              </select>
            </div>
          </div>

          {/* Palette Override */}
          <div className="pt-4 border-t border-adv-border">
            <span className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-2">
              Brand Palette Override (Optional)
            </span>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-adv-secondary mb-1 block">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brief.paletteOverride?.bg || "#001a30"}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        paletteOverride: {
                          bg: e.target.value,
                          fg: brief.paletteOverride?.fg || "#ffffff",
                          accent: brief.paletteOverride?.accent || "#ffd600",
                        },
                      })
                    }
                    className="w-9 h-9 rounded cursor-pointer border border-adv-border bg-transparent"
                  />
                  <input
                    type="text"
                    value={brief.paletteOverride?.bg || "#001a30"}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        paletteOverride: {
                          bg: e.target.value,
                          fg: brief.paletteOverride?.fg || "#ffffff",
                          accent: brief.paletteOverride?.accent || "#ffd600",
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-adv-bg border border-adv-border text-xs text-adv-text font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-adv-secondary mb-1 block">Foreground</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brief.paletteOverride?.fg || "#ffffff"}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        paletteOverride: {
                          bg: brief.paletteOverride?.bg || "#001a30",
                          fg: e.target.value,
                          accent: brief.paletteOverride?.accent || "#ffd600",
                        },
                      })
                    }
                    className="w-9 h-9 rounded cursor-pointer border border-adv-border bg-transparent"
                  />
                  <input
                    type="text"
                    value={brief.paletteOverride?.fg || "#ffffff"}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        paletteOverride: {
                          bg: brief.paletteOverride?.bg || "#001a30",
                          fg: e.target.value,
                          accent: brief.paletteOverride?.accent || "#ffd600",
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-adv-bg border border-adv-border text-xs text-adv-text font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-adv-secondary mb-1 block">Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brief.paletteOverride?.accent || "#ffd600"}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        paletteOverride: {
                          bg: brief.paletteOverride?.bg || "#001a30",
                          fg: brief.paletteOverride?.fg || "#ffffff",
                          accent: e.target.value,
                        },
                      })
                    }
                    className="w-9 h-9 rounded cursor-pointer border border-adv-border bg-transparent"
                  />
                  <input
                    type="text"
                    value={brief.paletteOverride?.accent || "#ffd600"}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        paletteOverride: {
                          bg: brief.paletteOverride?.bg || "#001a30",
                          fg: brief.paletteOverride?.fg || "#ffffff",
                          accent: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-adv-bg border border-adv-border text-xs text-adv-text font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <span>Next: Target Cohort</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: COHORT */}
      {step === 2 && (
        <div className="p-6 rounded-xl bg-adv-surface border border-adv-border space-y-6">
          <div className="border-b border-adv-border pb-4">
            <h2 className="text-lg font-bold text-adv-text">2. Audience Cohort Targeting</h2>
            <p className="text-xs text-adv-secondary mt-1">
              Target a cultural cohort (never individuals). Pick 3 to 5 taste anchors (artists, films, places, brands).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                value={cohort.city}
                onChange={(e) => setCohort({ ...cohort, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
                placeholder="e.g. New York, Tokyo, Visakhapatnam"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Country
              </label>
              <input
                type="text"
                value={cohort.country}
                onChange={(e) => setCohort({ ...cohort, country: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
                placeholder="e.g. United States, Japan, India"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Language
              </label>
              <select
                value={cohort.language}
                onChange={(e) => setCohort({ ...cohort, language: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
              >
                <option value="en">English (en)</option>
                <option value="ja">Japanese (ja)</option>
                <option value="te">Telugu (te)</option>
                <option value="kn">Kannada (kn)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider mb-1">
                Age Band
              </label>
              <select
                value={cohort.ageBand}
                onChange={(e) => setCohort({ ...cohort, ageBand: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
              >
                <option value="18-24">18 - 24 years</option>
                <option value="21-30">21 - 30 years</option>
                <option value="25-34">25 - 34 years</option>
                <option value="35-49">35 - 49 years</option>
              </select>
            </div>
          </div>

          {/* Taste Anchors */}
          <div className="pt-4 border-t border-adv-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-adv-secondary uppercase tracking-wider">
                Cultural Taste Anchors (3 to 5 favorites)
              </label>
              <span className="text-xs text-adv-secondary font-mono">
                {cohort.anchors.length} / 5 anchors
              </span>
            </div>

            {/* Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {cohort.anchors.map((anchor, idx) => (
                <span
                  key={anchor}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-adv-surfaceHover border border-adv-border text-xs text-adv-text font-medium"
                >
                  <Tag size={13} className="text-adv-accent" />
                  <span>{anchor}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAnchor(idx)}
                    className="hover:text-adv-danger ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add Anchor Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={anchorInput}
                onChange={(e) => setAnchorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddAnchor()}
                placeholder="Type an artist, director, book, cafe or brand..."
                className="flex-1 px-3.5 py-2 rounded-lg bg-adv-bg border border-adv-border text-adv-text text-sm focus:outline-none focus:border-adv-accent"
              />
              <button
                type="button"
                onClick={handleAddAnchor}
                className="px-4 py-2 rounded-lg bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-sm font-semibold transition-colors"
              >
                Add Anchor
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-adv-surface border border-adv-border text-adv-secondary hover:text-adv-text text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back: Brief</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <span>Next: Review & Generate</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & GENERATE */}
      {step === 3 && (
        <div className="p-6 rounded-xl bg-adv-surface border border-adv-border space-y-6">
          <div className="border-b border-adv-border pb-4">
            <h2 className="text-lg font-bold text-adv-text">3. Ready to Generate Ad Studio Creatives</h2>
            <p className="text-xs text-adv-secondary mt-1">
              SceneCast will query the intent classification engine for this cohort, deterministically construct 3 design variants, generate localized copy, and render multi-aspect PNG posters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-adv-bg p-5 rounded-lg border border-adv-border">
            {/* Brief Summary */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-adv-secondary uppercase tracking-wider block">
                Brief Summary
              </span>
              <div className="text-sm font-bold text-adv-text">{brief.brandName}</div>
              <div className="text-xs text-adv-secondary">Product: {brief.product}</div>
              <div className="text-xs text-adv-secondary">Category: {brief.category}</div>
              <div className="text-xs text-adv-secondary capitalize">Goal: {brief.goal}</div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-adv-secondary">Palette:</span>
                <span
                  className="w-4 h-4 rounded border border-white/20"
                  style={{ backgroundColor: brief.paletteOverride?.bg }}
                />
                <span
                  className="w-4 h-4 rounded border border-white/20"
                  style={{ backgroundColor: brief.paletteOverride?.accent }}
                />
              </div>
            </div>

            {/* Cohort Summary */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-adv-secondary uppercase tracking-wider block">
                Target Cohort
              </span>
              <div className="text-sm font-bold text-adv-text">
                {cohort.city}, {cohort.country}
              </div>
              <div className="text-xs text-adv-secondary">
                Language: {cohort.language.toUpperCase()} · Age Band: {cohort.ageBand}
              </div>
              <div className="text-xs text-adv-secondary">Cultural Anchors:</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {cohort.anchors.map((a) => (
                  <span
                    key={a}
                    className="text-[11px] px-2 py-0.5 rounded bg-adv-surface border border-adv-border text-adv-text"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-adv-border">
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-adv-surface border border-adv-border text-adv-secondary hover:text-adv-text text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back: Cohort</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white font-bold text-sm transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Synthesizing Taste Graph & Rendering...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate 9 Ad Creatives (3x3)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
