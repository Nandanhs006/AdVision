"use client";

import React, { useState, useEffect } from "react";
import { EventLog } from "@/lib/schema";
import { BarChart3, Eye, MousePointerClick, PauseCircle, MapPin, Layers } from "lucide-react";

export default function AnalyticsPage() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const totalImpressions = events.filter((e) => e.type === "impression").length;
  const totalPauseViews = events.filter((e) => e.type === "pause_view").length;
  const totalClicks = events.filter((e) => e.type === "click").length;
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  // Group by City
  const cityCounts: Record<string, { impressions: number; clicks: number }> = {};
  events.forEach((e) => {
    if (!cityCounts[e.city]) {
      cityCounts[e.city] = { impressions: 0, clicks: 0 };
    }
    if (e.type === "impression") cityCounts[e.city].impressions++;
    if (e.type === "click") cityCounts[e.city].clicks++;
  });

  // Group by Zone
  const zoneCounts: Record<string, number> = {};
  events.forEach((e) => {
    zoneCounts[e.zoneId] = (zoneCounts[e.zoneId] || 0) + 1;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              Real-Time Performance
            </span>
            <span className="text-xs text-adv-secondary font-mono">
              Telemetry Stream
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-adv-text tracking-tight mt-1">
            In-Scene Campaign Analytics
          </h1>
          <p className="text-sm text-adv-secondary mt-1">
            Tracking impressions, pause-to-shop card engagements, and clicks across international markets and marked film surfaces.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              In-Scene Impressions
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {totalImpressions}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Surface composited views
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-accent">
            <Eye size={24} />
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Pause-To-Shop Views
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {totalPauseViews}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Active interest inspections
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-warning">
            <PauseCircle size={24} />
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Sponsor Clicks
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {totalClicks}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Direct checkout redirects
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-success">
            <MousePointerClick size={24} />
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Average CTR
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {ctr}%
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Conversion rate
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-accent">
            <BarChart3 size={24} />
          </div>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market City Breakdown */}
        <div className="bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-adv-border">
            <MapPin size={18} className="text-adv-accent" />
            <h3 className="font-bold text-base text-adv-text">
              Performance by Market City
            </h3>
          </div>

          <div className="space-y-3">
            {Object.entries(cityCounts).map(([city, stats]) => (
              <div
                key={city}
                className="p-3 bg-adv-sidebar rounded-xl border border-adv-border text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-adv-text block">{city}</span>
                  <span className="text-[11px] text-adv-secondary font-mono">
                    {stats.impressions} impressions · {stats.clicks} clicks
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-adv-success">
                    {stats.impressions > 0
                      ? ((stats.clicks / stats.impressions) * 100).toFixed(0)
                      : 0}
                    % CTR
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Breakdown */}
        <div className="bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-adv-border">
            <Layers size={18} className="text-adv-accent" />
            <h3 className="font-bold text-base text-adv-text">
              Engagement by Surface Zone
            </h3>
          </div>

          <div className="space-y-3">
            {Object.entries(zoneCounts).map(([zoneId, count]) => (
              <div
                key={zoneId}
                className="p-3 bg-adv-sidebar rounded-xl border border-adv-border text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-adv-text block">{zoneId}</span>
                  <span className="text-[11px] text-adv-secondary">
                    Total recorded events
                  </span>
                </div>
                <span className="font-mono font-bold text-adv-text text-sm">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Event Stream Table */}
      <div className="bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-base text-adv-text pb-2 border-b border-adv-border">
          Live Event Activity Stream
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-adv-border text-adv-secondary font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Campaign Sponsor</th>
                <th className="py-2.5 px-3">Viewer / Market</th>
                <th className="py-2.5 px-3">Zone Surface</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adv-border/50">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-adv-surfaceHover/50">
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        evt.type === "click"
                          ? "bg-adv-successBg border-adv-success text-adv-success"
                          : evt.type === "pause_view"
                          ? "bg-adv-warningBg border-adv-warning text-adv-warning"
                          : "bg-adv-sidebar border-adv-border text-adv-secondary"
                      }`}
                    >
                      {evt.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-adv-text">
                    {evt.campaignId}
                  </td>
                  <td className="py-2.5 px-3 text-adv-secondary font-mono">
                    {evt.city} ({evt.viewerId})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-adv-secondary">
                    {evt.zoneId}
                  </td>
                  <td className="py-2.5 px-3 text-adv-secondary text-[11px] font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
