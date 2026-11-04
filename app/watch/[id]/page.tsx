"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CompositedPlayer } from "@/components/CompositedPlayer";
import { Project, Viewer, Decision } from "@/lib/schema";
import projectsJson from "@/data/projects.json";
import viewersJson from "@/data/viewers.json";
import { Upload, FileVideo, X, SlidersHorizontal, Sparkles } from "lucide-react";

export default function WatchPlayerPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const projects = projectsJson as Project[];
  const project = projects.find((p) => p.id === projectId) || projects[0];
  const viewers = viewersJson as Viewer[];

  const [currentViewerId, setCurrentViewerId] = useState<string>(viewers[0].id);
  const [decision, setDecision] = useState<Decision | undefined>(undefined);
  const [loadingDecision, setLoadingDecision] = useState<boolean>(false);

  // Custom Video Upload State
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleVideoUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Please upload an MP4, WebM, or MOV video file.");
      return;
    }
    if (customVideoUrl) {
      URL.revokeObjectURL(customVideoUrl);
    }
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);
    setCustomVideoName(file.name);
  };

  const handleClearCustomVideo = () => {
    if (customVideoUrl) {
      URL.revokeObjectURL(customVideoUrl);
    }
    setCustomVideoUrl(null);
    setCustomVideoName(null);
  };

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
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleVideoUpload(e.target.files[0]);
          }
          e.target.value = "";
        }}
      />

      {/* Film Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              Live Cinema Player
            </span>
            <span className="text-xs text-adv-secondary font-mono">
              {customVideoName ? `Custom Upload: ${customVideoName}` : project.filmTitle}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-adv-text mt-1">
            {customVideoName ? customVideoName : project.name}
          </h1>
          <p className="text-xs text-adv-secondary mt-1">
            Compositing the winning brand poster directly onto {activeZone.label} in real-time. Switch personas to watch the creative transform seamlessly.
          </p>
        </div>

        {/* Action Buttons: Upload Video & Open Studio */}
        <div className="flex items-center gap-3">
          {customVideoUrl ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm animate-in fade-in">
              <FileVideo size={15} className="animate-pulse" />
              <span className="max-w-[160px] truncate" title={customVideoName || ""}>
                {customVideoName}
              </span>
              <button
                onClick={handleClearCustomVideo}
                className="p-1 hover:bg-emerald-500/30 rounded text-emerald-300 hover:text-white transition-colors"
                title="Remove uploaded video and revert to scene footage"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20"
              title="Upload your own custom MP4 / WebM video from your computer"
            >
              <Upload size={14} />
              <span>Upload Custom Video</span>
            </button>
          )}

          <Link
            href={`/studio?projectId=${project.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-adv-surface hover:bg-adv-surfaceHover border border-adv-border text-adv-text text-xs font-semibold transition-colors shadow-sm"
            title="Open in Studio to calibrate 3D perspective quad and run Meta SAM 3.1"
          >
            <SlidersHorizontal size={14} />
            <span>Map Surfaces in Studio</span>
          </Link>
        </div>
      </div>

      {/* Composited Player Component */}
      <CompositedPlayer
        videoUrl={customVideoUrl || project.videoUrl}
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
