"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CompositedPlayer } from "@/components/CompositedPlayer";
import { Project, Viewer, Decision } from "@/lib/schema";
import projectsJson from "@/data/projects.json";
import viewersJson from "@/data/viewers.json";

export default function WatchPlayerPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const projects = projectsJson as Project[];
  const project = projects.find((p) => p.id === projectId) || projects[0];
  const viewers = viewersJson as Viewer[];

  const [currentViewerId, setCurrentViewerId] = useState<string>(viewers[0].id);
  const [decision, setDecision] = useState<Decision | undefined>(undefined);
  const [loadingDecision, setLoadingDecision] = useState<boolean>(false);

  const currentViewer = viewers.find((v) => v.id === currentViewerId) || viewers[0];
  const activeZone = project.zones[0];

  useEffect(() => {
    let isCancelled = false;
    const fetchDecision = async () => {
      setLoadingDecision(true);
      try {
        const res = await fetch("/api/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone: activeZone,
            rules: project.rules,
            viewer: currentViewer,
          }),
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          setDecision(data);
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setLoadingDecision(false);
      }
    };

    fetchDecision();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentViewerId, project, activeZone]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Film Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              Live Cinema Player
            </span>
            <span className="text-xs text-adv-secondary font-mono">
              {project.filmTitle}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-adv-text mt-1">
            {project.name}
          </h1>
          <p className="text-xs text-adv-secondary mt-1">
            Compositing the winning brand poster directly onto {activeZone.label} in real-time. Switch personas to watch the creative transform seamlessly.
          </p>
        </div>
      </div>

      {/* Composited Player Component */}
      <CompositedPlayer
        videoUrl={project.videoUrl}
        duration={project.durationSec}
        zone={activeZone}
        viewer={currentViewer}
        decision={decision}
        onPersonaChange={(id) => setCurrentViewerId(id)}
        allViewers={viewers}
      />
    </div>
  );
}
