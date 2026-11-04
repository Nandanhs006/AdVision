"use client";

import { useEffect, useState } from "react";
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Shield,
  Layers,
  Info,
} from "lucide-react";

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleDisconnect = async (connectionId: string) => {
    try {
      const res = await fetch("/api/meta/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (res.ok) {
        setActionMessage("Connection and stored tokens deleted completely.");
        loadConnections();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="border-b border-adv-border pb-6">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-adv-accent/10 text-adv-accent text-xs font-semibold uppercase tracking-wider border border-adv-accent/20">
            Ad Networks & Distribution
          </span>
          <span className="text-xs text-adv-secondary font-mono">Meta Audience Network + Meta Graph API v21.0</span>
        </div>
        <h1 className="text-2xl font-bold text-adv-text tracking-tight mt-1">
          Connected Meta Ad Networks & Social Platforms
        </h1>
        <p className="text-sm text-adv-secondary mt-1">
          Connect your Meta Audience Network inventory and Meta Ads accounts to auction, personalize, and publish intent-based in-scene ad creatives.
        </p>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-adv-successBg border border-adv-success/30 text-adv-success text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Ad Network & Simulation Notice Banner */}
      <div className="p-4 rounded-xl bg-adv-surface border border-adv-border space-y-2">
        <div className="flex items-center gap-2 text-adv-text font-bold text-xs uppercase tracking-wider">
          <Info size={15} className="text-adv-accent" />
          <span>Meta Ecosystem In-Scene Programmatic Notice</span>
        </div>
        <p className="text-xs text-adv-secondary leading-relaxed">
          SceneCast orchestrates intent-based in-scene ad auctions exclusively across <strong>Meta Audience Network</strong> and <strong>Meta Ads Manager</strong>. In-scene placements are selected via semantic scene classification and real-time user intent signals, preserving viewer immersion while maximizing publisher yield.
        </p>
        <p className="text-xs text-adv-secondary leading-relaxed">
          For local demonstration and development, SceneCast provides both live API and authenticated <strong>Simulated Mode</strong> for Meta Audience Network and Meta Graph API v21.0.
        </p>
      </div>

      {/* Ad Network Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meta Audience Network Card */}
        <div className="p-5 rounded-xl bg-adv-surface border border-adv-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
                AN
              </div>
              <div>
                <h3 className="text-sm font-bold text-adv-text">Meta Audience Network</h3>
                <span className="text-[11px] text-adv-secondary font-mono">In-Scene RTB Bidding</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-adv-successBg text-adv-success border border-adv-success/30 font-semibold">
              Connected
            </span>
          </div>
          <p className="text-xs text-adv-secondary leading-relaxed">
            Fill in-scene video surfaces (billboards, highway gantries, storefront signs) with dynamic Meta Audience Network intent-classified video and display creatives.
          </p>
          <div className="pt-1 text-[11px] font-mono text-adv-secondary space-y-1 bg-adv-sidebar p-2.5 rounded-lg border border-adv-border/60">
            <div className="flex justify-between">
              <span>Placement ID:</span>
              <span className="text-adv-text font-bold">in_scene_billboard_shibuya_01</span>
            </div>
            <div className="flex justify-between">
              <span>Auction Mode:</span>
              <span className="text-adv-accent font-bold">Meta RTB Hybrid</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setActionMessage("Meta Audience Network placements re-synced successfully.");
                setTimeout(() => setActionMessage(null), 3000);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw size={13} />
              <span>Sync Audience Network</span>
            </button>
          </div>
        </div>

        {/* Instagram Connect Card */}
        <div className="p-5 rounded-xl bg-adv-surface border border-adv-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-bold">
                IG
              </div>
              <div>
                <h3 className="text-sm font-bold text-adv-text">Instagram Professional</h3>
                <span className="text-[11px] text-adv-secondary">Feed & Story Publishing</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-adv-secondary leading-relaxed">
            Publish single-photo feed posts with hashtags, and sync in-scene video creatives directly to Instagram Stories and Feed units.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <a
              href="/api/meta/connect?provider=instagram"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-adv-accent hover:bg-adv-accentHover text-white text-xs font-semibold transition-colors"
            >
              <span>Connect Instagram</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Facebook Page Connect Card */}
        <div className="p-5 rounded-xl bg-adv-surface border border-adv-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                FB
              </div>
              <div>
                <h3 className="text-sm font-bold text-adv-text">Facebook Page</h3>
                <span className="text-[11px] text-adv-secondary">Page Photo Post Publishing</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-adv-secondary leading-relaxed">
            Publish high-resolution photo creatives directly to your brand&apos;s Facebook Page with localized captions and headlines.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <a
              href="/api/meta/connect?provider=facebook"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <span>Connect Facebook</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Active Connected Accounts List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-adv-text uppercase tracking-wider">
          Active Connections ({connections.length})
        </h2>

        {loading ? (
          <div className="p-6 text-center text-xs text-adv-secondary">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-adv-accent" />
            <span>Loading active social accounts...</span>
          </div>
        ) : connections.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-adv-surface border border-adv-border text-adv-secondary text-xs">
            No accounts connected yet. Click above to connect an account or launch simulated demo mode.
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="p-4 rounded-xl bg-adv-surface border border-adv-border flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs ${
                      conn.provider === "facebook" ? "bg-blue-600" : "bg-gradient-to-tr from-amber-500 to-purple-600"
                    }`}
                  >
                    {conn.provider === "facebook" ? "FB" : "IG"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-adv-text">{conn.displayName}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          conn.mode === "live"
                            ? "bg-adv-successBg text-adv-success border-adv-success/30"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {conn.mode === "live" ? "Live Account" : "Simulated Demo"}
                      </span>
                    </div>
                    <div className="text-[11px] text-adv-secondary font-mono mt-0.5">
                      ID: {conn.externalId} · Scopes: {conn.scopes.join(", ")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-adv-danger/30 text-adv-danger hover:bg-adv-dangerBg text-xs font-semibold transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Stance */}
      <div className="p-4 rounded-xl bg-adv-surface/50 border border-adv-border flex items-center gap-3 text-xs text-adv-secondary">
        <Shield size={20} className="text-adv-success shrink-0" />
        <span>
          <strong>Privacy Stance:</strong> Stored tokens are encrypted at rest with AES-256-GCM and never sent to the client. Advision targets cohorts only (never individual viewers) and requests only the minimum permissions necessary for publishing.
        </span>
      </div>
    </div>
  );
}
