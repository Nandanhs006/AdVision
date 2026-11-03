"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Campaign } from "@/lib/schema";
import { AdPoster } from "@/components/AdPoster";
import campaignsJson from "@/data/campaigns.json";
import { Plus, Sparkles, CheckCircle2, Megaphone, Search } from "lucide-react";

export default function BrandStudioPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  // Form State
  const [brandName, setBrandName] = useState<string>("Zenith Cold Brew");
  const [category, setCategory] = useState<string>("coffee");
  const [tags, setTags] = useState<string>("coffee, cafe, cold brew, organic");
  const [intentEntityId, setIntentEntityId] = useState<string>("urn:entity:brand:zenith_coffee");
  const [resolvingIntent, setResolvingIntent] = useState<boolean>(false);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>("2025-01-01");
  const [endDate, setEndDate] = useState<string>("2027-12-31");

  const [bg, setBg] = useState<string>("#121b18");
  const [fg, setFg] = useState<string>("#f4efe6");
  const [accent, setAccent] = useState<string>("#4aa130");

  const [headlineEn, setHeadlineEn] = useState<string>("Slow-dripped organic roast in urban daylight");
  const [headlineJa, setHeadlineJa] = useState<string>("都市の光が溶け合う、極上の水出し珈琲");
  const [headlineTe, setHeadlineTe] = useState<string>("స్వచ్ఛమైన ఆర్గానిక్ కోల్డ్ బ్రూ కాఫీ");
  const [headlineKn, setHeadlineKn] = useState<string>("ನಗರದ ಮಧ್ಯೆ ತಂಪಾದ ಸಾವಯವ ಕಾಫಿ ರುಚಿ");
  const [headlineFr, setHeadlineFr] = useState<string>("Infusion bio artisanale sous la lumière urbaine");

  const [ctaEn, setCtaEn] = useState<string>("Taste The Pour");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch("/api/campaigns");
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        } else {
          setCampaigns(campaignsJson as Campaign[]);
        }
      } catch {
        setCampaigns(campaignsJson as Campaign[]);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  // Resolve Intent Entity URN
  const handleResolveIntent = async () => {
    if (!brandName.trim()) return;
    setResolvingIntent(true);
    setResolvedStatus(null);
    try {
      const res = await fetch(`/api/intent/search?query=${encodeURIComponent(brandName.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const topResult = data.results?.[0];
        if (topResult) {
          setIntentEntityId(topResult.id);
          setResolvedStatus(`Resolved to "${topResult.name}" (${topResult.id})`);
        } else {
          setIntentEntityId(`urn:entity:brand:${brandName.toLowerCase().replace(/\s+/g, "_")}`);
          setResolvedStatus("Fallback generated entity URN");
        }
      }
    } catch {
      setIntentEntityId(`urn:entity:brand:${brandName.toLowerCase().replace(/\s+/g, "_")}`);
    } finally {
      setResolvingIntent(false);
    }
  };

  // Preview campaign object
  const previewCampaign: Campaign = {
    id: `camp-${Date.now()}`,
    brandName,
    category,
    intentEntityId,
    qlooEntityId: intentEntityId,
    tags: tags.split(",").map((t) => t.trim()),
    countries: ["United States", "Japan", "India", "France"],
    languages: ["en", "ja", "te", "kn", "fr"],
    flight: { start: startDate, end: endDate },
    headline: {
      en: headlineEn,
      ja: headlineJa,
      te: headlineTe,
      kn: headlineKn,
      fr: headlineFr,
    },
    cta: {
      en: ctaEn,
      ja: "詳細を見る",
      te: "ఆర్డర్ చేయండి",
      kn: "ವಿವರ ನೋಡಿ",
      fr: "Découvrir",
    },
    palette: { bg, fg, accent },
    publicService: false,
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewCampaign),
      });
      if (res.ok) {
        const next = [...campaigns, previewCampaign];
        setCampaigns(next);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              Brand Studio
            </span>
            <span className="text-xs text-adv-secondary">
              Campaign & Poster Creation
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-adv-text tracking-tight mt-1">
            Create & Resolve Campaigns
          </h1>
          <p className="text-sm text-adv-secondary mt-1">
            Build procedural brand creatives, link them to commercial intent entities, and preview localized multi-language typography.
          </p>
        </div>
      </div>

      {/* 2-Col Layout: Form on Left, Live Poster Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Campaign Creation Form */}
        <form
          onSubmit={handleSaveCampaign}
          className="bg-adv-surface border border-adv-border p-6 rounded-2xl space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-adv-border">
            <h2 className="text-base font-bold text-adv-text">
              New Campaign Configuration
            </h2>
            {savedSuccess && (
              <span className="text-xs text-adv-success font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 size={14} /> Saved to Catalog!
              </span>
            )}
          </div>

          {/* Brand Name & Intent Resolver */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-adv-secondary uppercase">
              Brand / Sponsor Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="flex-1 bg-adv-sidebar border border-adv-border text-adv-text text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-adv-accent"
                placeholder="e.g. Blue Bottle Coffee"
                required
              />
              <button
                type="button"
                onClick={handleResolveIntent}
                disabled={resolvingIntent}
                className="px-3.5 py-2.5 rounded-xl bg-adv-surfaceHover hover:bg-adv-border border border-adv-border text-adv-text text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Search size={13} />
                <span>{resolvingIntent ? "Resolving..." : "Resolve Intent ID"}</span>
              </button>
            </div>
            {resolvedStatus && (
              <span className="text-[11px] text-adv-success block font-mono">
                ✓ {resolvedStatus}
              </span>
            )}
            <input
              type="text"
              value={intentEntityId}
              onChange={(e) => setIntentEntityId(e.target.value)}
              className="w-full bg-adv-sidebar/60 border border-adv-border/60 text-adv-secondary text-xs rounded-lg px-3 py-1.5 font-mono"
              placeholder="Commercial Intent Entity URN"
            />
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-adv-secondary uppercase">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-xl px-3 py-2.5 outline-none focus:border-adv-accent"
              >
                <option value="coffee">coffee</option>
                <option value="tea">tea</option>
                <option value="audio">audio</option>
                <option value="books">books</option>
                <option value="fashion">fashion</option>
                <option value="travel">travel</option>
                <option value="spirits">spirits</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-adv-secondary uppercase">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-xl px-3 py-2.5 outline-none focus:border-adv-accent"
              />
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-adv-secondary uppercase">
              Brand Color Palette
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 bg-adv-sidebar border border-adv-border p-2 rounded-xl">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="text-[11px] font-mono text-adv-secondary">
                  BG: {bg}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-adv-sidebar border border-adv-border p-2 rounded-xl">
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="text-[11px] font-mono text-adv-secondary">
                  FG: {fg}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-adv-sidebar border border-adv-border p-2 rounded-xl">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="text-[11px] font-mono text-adv-secondary">
                  Accent: {accent}
                </span>
              </div>
            </div>
          </div>

          {/* Localized Headlines */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-adv-secondary uppercase">
              Localized Headlines
            </label>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-adv-secondary font-mono">
                  English (en):
                </span>
                <input
                  type="text"
                  value={headlineEn}
                  onChange={(e) => setHeadlineEn(e.target.value)}
                  className="w-full bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-lg px-3 py-1.5 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-adv-secondary font-mono">
                  Japanese (ja):
                </span>
                <input
                  type="text"
                  value={headlineJa}
                  onChange={(e) => setHeadlineJa(e.target.value)}
                  className="w-full bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-lg px-3 py-1.5 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-adv-secondary font-mono">
                  Telugu (te):
                </span>
                <input
                  type="text"
                  value={headlineTe}
                  onChange={(e) => setHeadlineTe(e.target.value)}
                  className="w-full bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-lg px-3 py-1.5 mt-0.5"
                />
              </div>
              <div>
                <span className="text-[10px] text-adv-secondary font-mono">
                  Kannada (kn):
                </span>
                <input
                  type="text"
                  value={headlineKn}
                  onChange={(e) => setHeadlineKn(e.target.value)}
                  className="w-full bg-adv-sidebar border border-adv-border text-adv-text text-xs rounded-lg px-3 py-1.5 mt-0.5"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-adv-accent hover:bg-adv-accentHover text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            <span>Publish Campaign to Catalog</span>
          </button>
        </form>

        {/* Right: Live Poster Preview */}
        <div className="space-y-4">
          <div className="bg-adv-surface border border-adv-border p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-adv-border">
              <h3 className="font-bold text-base text-adv-text">
                Live Creative Poster Preview
              </h3>

              {/* Language Switcher */}
              <div className="flex items-center gap-1">
                {["en", "ja", "te", "kn", "fr"].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase transition-colors border ${
                      selectedLanguage === lang
                        ? "bg-adv-accent text-white border-adv-accent"
                        : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-white"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Poster Canvas Display */}
            <div className="w-full max-w-sm mx-auto aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-adv-border">
              <AdPoster
                campaign={previewCampaign}
                language={selectedLanguage}
                width={400}
                height={300}
              />
            </div>

            <div className="p-4 bg-adv-sidebar rounded-xl border border-adv-border text-xs space-y-1.5 text-adv-secondary font-mono">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="text-adv-text font-bold uppercase">
                  {previewCampaign.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Intent Entity:</span>
                <span className="text-adv-accent truncate max-w-xs">
                  {previewCampaign.intentEntityId || previewCampaign.qlooEntityId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Flight Duration:</span>
                <span className="text-adv-text">
                  {previewCampaign.flight.start} to {previewCampaign.flight.end}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog of Active Brand Campaigns */}
      <div className="bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-adv-border">
          <div>
            <h3 className="font-bold text-base text-adv-text">
              Active Brand Campaigns Catalog ({campaigns.length})
            </h3>
            <p className="text-xs text-adv-secondary">
              Campaigns eligible for intent-driven in-scene billboard placement and Ad Studio export.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-adv-sidebar border border-adv-border space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: c.palette.accent }}
                    />
                    <span className="font-bold text-sm text-adv-text">{c.brandName}</span>
                  </div>
                  {c.createdInAdStudio && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-adv-accent/20 text-adv-accent font-semibold border border-adv-accent/30 font-mono">
                      Created in Ad Studio
                    </span>
                  )}
                </div>

                <div className="text-xs text-adv-secondary line-clamp-2">
                  &ldquo;{c.headline.en || Object.values(c.headline)[0]}&rdquo;
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-adv-secondary font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-adv-surface border border-adv-border uppercase">
                    {c.category}
                  </span>
                  <span>·</span>
                  <span>{c.languages.join(", ").toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-adv-border/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Update preview form with this campaign
                    setBrandName(c.brandName);
                    setCategory(c.category);
                    setBg(c.palette.bg);
                    setFg(c.palette.fg);
                    setAccent(c.palette.accent);
                    if (c.headline.en) setHeadlineEn(c.headline.en);
                  }}
                  className="text-xs text-adv-secondary hover:text-adv-text underline"
                >
                  Load in Editor
                </button>

                <Link
                  href="/watch/proj-tokyo-nightfall"
                  className="px-2.5 py-1.5 rounded-lg bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-xs text-adv-accent font-semibold flex items-center gap-1"
                >
                  <span>Use as in-scene creative</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
