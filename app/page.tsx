"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Film, LayoutGrid, Globe, Clock, ArrowRight, Play, SlidersHorizontal, Sparkles } from "lucide-react";
import { Project } from "@/lib/schema";
import projectsJson from "@/data/projects.json";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(projectsJson as Project[]);

  useEffect(() => {
    // Check localStorage for any editor-updated projects
    const saved = localStorage.getItem("advision_projects");
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch {
        // use default
      }
    }
  }, []);

  const totalFilms = projects.length;
  const totalZones = projects.reduce((acc, p) => acc + p.zones.length, 0);
  const totalMarkets = 5; // Tokyo, Vizag, SF, BLR, Paris
  const pendingApprovals = projects.filter((p) => p.status === "review" || p.rules.requireApproval).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              In-Scene Ads · Meta AI & Meta Audience Network
            </span>
            <span className="text-xs text-adv-secondary">
              Production Workspace
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-adv-text">
            AdVision Projects
          </h1>
          <p className="text-adv-secondary text-sm mt-1 max-w-2xl">
            Dynamic in-scene virtual product placement where Meta AI models (Muse Spark, SAM 3.1) and Meta Audience Network personalize physical surfaces for every viewer without altering the cinematic story.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-adv-accent hover:bg-adv-accentHover text-white text-sm font-semibold transition-all shadow-md"
          >
            <SlidersHorizontal size={16} />
            <span>Open Studio</span>
          </Link>
          <Link
            href="/compare"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-sm font-medium transition-colors"
          >
            <Sparkles size={16} className="text-adv-accent" />
            <span>4-Way Sync Demo</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Active Films
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {totalFilms}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Across 3 production cuts
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-accent">
            <Film size={24} />
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Marked Surfaces
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {totalZones}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Billboards & signs tracked
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-success">
            <LayoutGrid size={24} />
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Global Markets
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {totalMarkets}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Tokyo, Vizag, SF, BLR, Paris
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-warning">
            <Globe size={24} />
          </div>
        </div>

        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-adv-secondary font-medium uppercase tracking-wider block">
              Pending Approvals
            </span>
            <span className="text-3xl font-black text-adv-text mt-1 block">
              {pendingApprovals}
            </span>
            <span className="text-[11px] text-adv-secondary mt-1 block">
              Awaiting editorial sign-off
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-adv-sidebar flex items-center justify-center border border-adv-border text-adv-danger">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-adv-text">Projects Library</h2>
          <span className="text-xs text-adv-secondary">
            Select a project to edit zones or view composited playback
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const isLive = proj.status === "live";
            const isReview = proj.status === "review";

            return (
              <div
                key={proj.id}
                className="bg-adv-surface border border-adv-border rounded-2xl p-5 flex flex-col justify-between hover:border-adv-secondary transition-all shadow-sm group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-adv-secondary">
                      {proj.filmTitle}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        isLive
                          ? "bg-adv-successBg border-adv-success text-adv-success"
                          : isReview
                          ? "bg-adv-warningBg border-adv-warning text-adv-warning"
                          : "bg-adv-surfaceHover border-adv-border text-adv-secondary"
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-adv-text group-hover:text-adv-accent transition-colors">
                    {proj.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs text-adv-secondary">
                    <div className="flex items-center justify-between py-1 border-b border-adv-border/40">
                      <span>Marked Zones:</span>
                      <span className="font-semibold text-adv-text">
                        {proj.zones.length} surface(s)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-adv-border/40">
                      <span>Clip Duration:</span>
                      <span className="font-mono text-adv-text">
                        {proj.durationSec}s
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Blocked:</span>
                      <span className="font-mono text-adv-danger">
                        {proj.rules.blockedCategories.length > 0
                          ? proj.rules.blockedCategories.join(", ")
                          : "none"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-adv-border flex items-center justify-between gap-2">
                  <Link
                    href={`/watch/${proj.id}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-adv-accent hover:bg-adv-accentHover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Play size={13} />
                    <span>Watch Clip</span>
                  </Link>

                  <Link
                    href={`/studio?projectId=${proj.id}`}
                    className="py-2 px-3 rounded-xl bg-adv-sidebar hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-xs font-medium flex items-center justify-center transition-colors"
                    title="Edit in Studio"
                  >
                    <SlidersHorizontal size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
