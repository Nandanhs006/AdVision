"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zone, Rules, Viewer, Decision, Point2D, Project } from "@/lib/schema";
import { calculateQuadArea, getQuadMatrix3d } from "@/lib/homography";
import { ProceduralScene } from "@/components/ProceduralScene";
import { AdPoster } from "@/components/AdPoster";
import viewersJson from "@/data/viewers.json";
import projectsJson from "@/data/projects.json";
import {
  Scissors,
  Crosshair,
  Sliders,
  Shield,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Radar,
  Gauge,
  Award,
  Film,
  Upload,
  FileVideo,
  X,
} from "lucide-react";
import { ScoutedSlot } from "@/lib/slotScout";

export default function StudioEditorPage() {
  const projects = projectsJson as Project[];
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0].id);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const pid = urlParams.get("projectId");
      if (pid && projects.some((p) => p.id === pid)) {
        setSelectedProjectId(pid);
      }
    }
  }, [projects]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Active Zone state
  const [zones, setZones] = useState<Zone[]>(activeProject.zones);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState<number>(0);
  const currentZone = zones[selectedZoneIndex] || zones[0];

  // Rules state
  const [rules, setRules] = useState<Rules>(activeProject.rules);

  // When project changes, update zones and rules
  useEffect(() => {
    setZones(activeProject.zones);
    setSelectedZoneIndex(0);
    setRules(activeProject.rules);
  }, [selectedProjectId, activeProject]);

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(2.5);
  const [playing, setPlaying] = useState<boolean>(true);
  const [useVideo, setUseVideo] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Custom Video Upload state
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string | null>(null);
  const [customVideoDuration, setCustomVideoDuration] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveDuration = customVideoDuration || activeProject.durationSec || 15;

  const handleVideoUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Please upload a video file (.mp4, .webm, .mov, etc.)");
      return;
    }
    if (customVideoUrl) {
      URL.revokeObjectURL(customVideoUrl);
    }
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);
    setCustomVideoName(file.name);
    setUseVideo(true);
    setPlaying(true);
    setCurrentTime(0);
  };

  const handleClearCustomVideo = () => {
    if (customVideoUrl) {
      URL.revokeObjectURL(customVideoUrl);
    }
    setCustomVideoUrl(null);
    setCustomVideoName(null);
    setCustomVideoDuration(null);
    setCurrentTime(0);
  };

  // Sync HTML5 video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing]);

  // Container sizing for 3D matrix
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 800, h: 450 });

  // Preview viewer persona
  const [previewViewerId, setPreviewViewerId] = useState<string>("viewer-us");

  useEffect(() => {
    const updateSize = () => {
      if (overlayRef.current) {
        setContainerSize({
          w: overlayRef.current.clientWidth,
          h: overlayRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Interactive Dragging state for 4 corners
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Decisions for all 7 viewers ("Who sees what")
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const previewViewer = (viewersJson as Viewer[]).find((v) => v.id === previewViewerId) || (viewersJson as Viewer[])[0];
  const previewDecision = decisions.find((d) => d.viewerId === previewViewerId);
  const activeWinningCampaign = previewDecision?.winningCampaign;
  const posterW = 380;
  const posterH = 260;
  const matrix3d = getQuadMatrix3d(currentZone.quad, containerSize.w, containerSize.h, posterW, posterH);

  // Trim mode toggle
  const [isTrimming, setIsTrimming] = useState<boolean>(false);

  // AI Slot Scout State
  const [scouting, setScouting] = useState<boolean>(false);
  const [scoutedSlots, setScoutedSlots] = useState<ScoutedSlot[] | null>(null);
  const [activeScorecard, setActiveScorecard] = useState<ScoutedSlot | null>(null);

  const handleRunSlotScout = async () => {
    setScouting(true);
    try {
      const res = await fetch("/api/studio/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filmTitle: customVideoName ? `Custom Video: ${customVideoName}` : activeProject.filmTitle,
          currentSec: currentTime,
          durationSec: effectiveDuration,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const discovered = data.slots as ScoutedSlot[];
        setScoutedSlots(discovered);
        if (discovered.length > 0) {
          const top = discovered[0];
          setActiveScorecard(top);

          // Update zones list with top discovered slot
          const mappedZone: Zone = {
            id: top.id,
            label: top.label,
            quad: top.quad,
            startSec: top.startSec,
            endSec: top.endSec,
            frameShare: top.frameShare,
          };
          setZones([mappedZone, ...zones.filter((z) => z.id !== top.id)]);
          setSelectedZoneIndex(0);

          // Adopt suggested mood
          if (data.sceneAtmosphere) {
            setRules((prev) => ({
              ...prev,
              sceneMood: Array.from(new Set([...prev.sceneMood, ...data.sceneAtmosphere])),
              prominenceCap: top.suggestedCap,
            }));
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setScouting(false);
    }
  };

  // Load from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem("advision_editor_rules");
    if (saved) {
      try {
        setRules(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Fetch batch decisions whenever zone or rules change
  useEffect(() => {
    let isCancelled = false;
    const fetchDecisions = async () => {
      setLoadingDecisions(true);
      try {
        const res = await fetch("/api/decide/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone: currentZone,
            rules,
          }),
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          setDecisions(data.decisions || []);
        }
      } catch {
        // ignore
      } finally {
        if (!isCancelled) setLoadingDecisions(false);
      }
    };

    fetchDecisions();
    return () => {
      isCancelled = true;
    };
  }, [currentZone, rules]);

  // Corner Dragging Handlers
  const handleMouseDownCorner = (cornerIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingCorner(cornerIndex);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingCorner === null || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const updatedQuad: Point2D[] = [...currentZone.quad];
    updatedQuad[draggingCorner] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) };

    const newArea = calculateQuadArea(updatedQuad);
    const updatedZone: Zone = {
      ...currentZone,
      quad: updatedQuad,
      frameShare: Number(newArea.toFixed(3)),
    };

    const newZones = [...zones];
    newZones[selectedZoneIndex] = updatedZone;
    setZones(newZones);
  };

  const handleMouseUp = () => {
    setDraggingCorner(null);
  };

  // Rule Toggles
  const toggleBlockedCategory = (category: string) => {
    const exists = rules.blockedCategories.includes(category);
    const next = exists
      ? rules.blockedCategories.filter((c) => c !== category)
      : [...rules.blockedCategories, category];
    setRules({ ...rules, blockedCategories: next });
  };

  const toggleMoodTag = (tag: string) => {
    const exists = rules.sceneMood.includes(tag);
    const next = exists
      ? rules.sceneMood.filter((t) => t !== tag)
      : [...rules.sceneMood, tag];
    setRules({ ...rules, sceneMood: next });
  };

  const handleSaveToLocalStorage = () => {
    localStorage.setItem("advision_editor_rules", JSON.stringify(rules));
    localStorage.setItem("advision_editor_zones", JSON.stringify(zones));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddNewZone = () => {
    const newZone: Zone = {
      id: `zone-custom-${Date.now()}`,
      label: `Marked Zone ${zones.length + 1}`,
      quad: [
        { x: 0.35, y: 0.25 },
        { x: 0.65, y: 0.25 },
        { x: 0.63, y: 0.55 },
        { x: 0.37, y: 0.53 },
      ],
      startSec: 1.0,
      endSec: 12.0,
      frameShare: 0.08,
    };
    const next = [...zones, newZone];
    setZones(next);
    setSelectedZoneIndex(next.length - 1);
  };

  const availableCategories = ["spirits", "beverage", "electronics", "automotive", "coffee", "tea", "books", "fashion", "travel", "audio"];
  const availableMoods = ["rainy", "cyberpunk", "neon", "introspective", "classical", "warm", "nature", "urban"];

  return (
    <div
      className="p-6 max-w-7xl mx-auto space-y-6"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Studio Header & Save */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-adv-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-adv-accent/20 text-adv-accent border border-adv-accent/30">
              Studio Suite
            </span>
            <span className="text-xs text-adv-secondary font-mono">
              {activeProject.filmTitle}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-adv-text mt-1">
            Editor & Surface Mapping
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-adv-success font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 size={14} /> Saved locally!
            </span>
          )}
          <button
            onClick={handleSaveToLocalStorage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-adv-accent hover:bg-adv-accentHover text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Save size={14} />
            <span>Save Rules & Zones</span>
          </button>
        </div>
      </div>

      {/* Project Switcher Bar & Custom Video Upload */}
      <div className="flex items-center gap-2 bg-adv-surface border border-adv-border p-2 rounded-xl overflow-x-auto">
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

        <span className="text-xs font-semibold uppercase text-adv-secondary whitespace-nowrap pl-2 flex items-center gap-1.5">
          <Film size={14} className="text-adv-accent" />
          Active Scene:
        </span>
        {projects.map((p) => {
          const active = !customVideoUrl && p.id === selectedProjectId;
          return (
            <button
              key={p.id}
              onClick={() => {
                if (customVideoUrl) handleClearCustomVideo();
                setSelectedProjectId(p.id);
                setCurrentTime(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                active
                  ? "bg-adv-accent text-white border-adv-accent shadow-sm"
                  : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-adv-text"
              }`}
            >
              {p.name}
            </button>
          );
        })}

        {/* Custom Uploaded Video Pill or Upload Button */}
        <div className="ml-auto flex items-center gap-2 pl-2 border-l border-adv-border">
          {customVideoUrl ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm animate-in fade-in">
              <FileVideo size={14} className="animate-pulse" />
              <span className="max-w-[200px] truncate" title={customVideoName || ""}>
                {customVideoName}
              </span>
              <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {effectiveDuration.toFixed(1)}s
              </span>
              <button
                onClick={handleClearCustomVideo}
                className="p-1 hover:bg-emerald-500/30 rounded text-emerald-300 hover:text-white transition-colors"
                title="Remove uploaded video and revert to sample scene"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-adv-accent/20 to-emerald-500/20 hover:from-adv-accent/30 hover:to-emerald-500/30 border border-adv-accent/40 text-adv-accent hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Upload your own custom MP4 / WebM video from your computer"
            >
              <Upload size={13} />
              <span>Upload Custom Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Workspace: Left Editor Viewport & Right Rules Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Viewport & Toolbar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Edit Toolbar */}
          <div className="bg-adv-surface border border-adv-border p-2 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRunSlotScout}
                disabled={scouting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-adv-accent to-purple-600 text-white font-semibold hover:brightness-110 transition-all shadow-md"
                title="AI Slot Scout: Auto-detect ad surfaces in current footage"
              >
                <Radar size={13} className={scouting ? "animate-spin" : ""} />
                <span>{scouting ? "Scouting..." : "AI Slot Scout"}</span>
              </button>

              <button
                onClick={handleAddNewZone}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-adv-surfaceHover border border-adv-border text-adv-text font-medium hover:bg-adv-border transition-colors"
                title="Mark a new surface manually"
              >
                <Crosshair size={13} />
                <span>Mark Zone</span>
              </button>

              <button
                onClick={() => setIsTrimming(!isTrimming)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                  isTrimming
                    ? "bg-adv-surfaceHover border-adv-accent text-adv-accent font-bold"
                    : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-white"
                }`}
                title="Trim Zone start and end times"
              >
                <Scissors size={13} />
                <span>Trim Surface</span>
              </button>
            </div>

            {/* Persona Preview Selector */}
            <div className="flex items-center gap-1.5 bg-adv-sidebar border border-adv-border px-2.5 py-1 rounded-lg">
              <span className="text-[10px] font-mono text-adv-secondary uppercase">Preview Ad:</span>
              <select
                value={previewViewerId}
                onChange={(e) => setPreviewViewerId(e.target.value)}
                className="bg-transparent text-xs text-adv-text font-medium outline-none cursor-pointer"
              >
                {(viewersJson as Viewer[]).map((v) => (
                  <option key={v.id} value={v.id} className="bg-adv-sidebar text-white">
                    {v.name} ({v.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Video / Zone Canvas with Drag-and-Drop */}
          <div
            ref={overlayRef}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleVideoUpload(e.dataTransfer.files[0]);
              }
            }}
            className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden border transition-all duration-200 select-none shadow-2xl ${
              isDraggingFile
                ? "border-emerald-400 ring-4 ring-emerald-400/30 scale-[1.01]"
                : "border-adv-border"
            }`}
          >
            {/* Drag & Drop Overlay */}
            {isDraggingFile && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-emerald-400 rounded-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3 animate-bounce">
                  <Upload size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Drop your custom video here</h3>
                <p className="text-xs text-zinc-300 max-w-sm mt-1">
                  AdVision will load your video locally and calibrate Meta SAM 3.1 & Muse Wonder surface detection.
                </p>
              </div>
            )}

            {useVideo ? (
              <video
                ref={videoRef}
                src={customVideoUrl || activeProject.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                  if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
                    setCustomVideoDuration(e.currentTarget.duration);
                  }
                }}
                onError={() => setUseVideo(false)}
              />
            ) : (
              <ProceduralScene
                currentTime={currentTime}
                duration={effectiveDuration}
                playing={playing}
                onTimeUpdate={(t) => setCurrentTime(t)}
              />
            )}

            {/* In-Scene Real Ad Overlay */}
            {activeWinningCampaign && (
              <div
                className="absolute top-0 left-0 pointer-events-none z-10 overflow-hidden rounded-sm"
                style={{
                  width: `${posterW}px`,
                  height: `${posterH}px`,
                  transformOrigin: "0 0",
                  transform: matrix3d,
                  boxShadow: activeWinningCampaign?.palette?.accent
                    ? `0 0 25px ${activeWinningCampaign.palette.accent}99`
                    : "0 0 20px rgba(99, 102, 241, 0.6)",
                  border: `2px solid ${activeWinningCampaign?.palette?.accent || "#6366f1"}`,
                }}
              >
                <AdPoster
                  campaign={activeWinningCampaign}
                  language={previewViewer?.language || "en"}
                  width={posterW}
                  height={posterH}
                />
              </div>
            )}

            {/* 4-Corner Draggable Quad Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon
                points={currentZone.quad.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(" ")}
                fill="rgba(99, 102, 241, 0.22)"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>

            {/* 4 Interactive Corner Drag Handles */}
            {currentZone.quad.map((corner, idx) => (
              <div
                key={idx}
                onMouseDown={(e) => handleMouseDownCorner(idx, e)}
                style={{
                  left: `${corner.x * 100}%`,
                  top: `${corner.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className={`absolute w-5 h-5 rounded-full border-2 border-white cursor-grab active:cursor-grabbing flex items-center justify-center shadow-lg transition-transform hover:scale-125 z-20 ${
                  draggingCorner === idx ? "bg-adv-accent scale-125" : "bg-adv-accent/80"
                }`}
                title={`Corner ${idx + 1}: (${(corner.x * 100).toFixed(0)}%, ${(corner.y * 100).toFixed(0)}%)`}
              >
                <span className="text-[8px] font-bold text-white font-mono">{idx + 1}</span>
              </div>
            ))}

            {/* Info Badge */}
            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white flex items-center gap-2">
              <span className="font-bold text-adv-accent">{currentZone.label}</span>
              <span className="text-adv-secondary font-mono">
                Frame Share: {(currentZone.frameShare * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Timeline & Scrubber with Zone Blocks */}
          <div className="bg-adv-surface border border-adv-border p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying(!playing)}
                  className="w-7 h-7 rounded-lg bg-adv-sidebar border border-adv-border hover:bg-adv-surfaceHover text-white flex items-center justify-center transition-colors"
                >
                  {playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                </button>
                <span className="font-mono text-adv-text">
                  {currentTime.toFixed(1)}s / {effectiveDuration.toFixed(1)}s
                </span>
              </div>

              {/* Zone selector chips */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-adv-secondary uppercase font-semibold">
                  Zone:
                </span>
                {zones.map((z, idx) => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneIndex(idx)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                      idx === selectedZoneIndex
                        ? "bg-adv-accent text-white border-adv-accent"
                        : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-white"
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Timeline Track with Click to Seek */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const seekTime = ratio * effectiveDuration;
                setCurrentTime(seekTime);
                if (videoRef.current) {
                  videoRef.current.currentTime = seekTime;
                }
              }}
              className="relative w-full h-8 bg-adv-sidebar rounded-lg border border-adv-border overflow-hidden cursor-pointer group"
              title="Click anywhere to scrub playback position"
            >
              {/* Zone Active Window Block */}
              <div
                style={{
                  left: `${(currentZone.startSec / effectiveDuration) * 100}%`,
                  width: `${((currentZone.endSec - currentZone.startSec) / effectiveDuration) * 100}%`,
                }}
                className="absolute top-0 bottom-0 bg-adv-accent/25 border-x-2 border-adv-accent flex items-center justify-center text-[10px] font-bold text-adv-accent uppercase tracking-wider"
              >
                {currentZone.label} ({currentZone.startSec}s - {currentZone.endSec}s)
              </div>

              {/* Scrubber Playhead Line */}
              <div
                style={{ left: `${(currentTime / effectiveDuration) * 100}%` }}
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md pointer-events-none z-10"
              />
            </div>

            {/* Real Trim Sliders if Trim Mode Active */}
            {isTrimming && (
              <div className="p-3 bg-adv-sidebar rounded-lg border border-adv-border grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-adv-secondary font-mono block mb-1">
                    Start Sec: {currentZone.startSec.toFixed(1)}s
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={currentZone.endSec - 0.5}
                    step={0.5}
                    value={currentZone.startSec}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const updated = { ...currentZone, startSec: val };
                      const newZ = [...zones];
                      newZ[selectedZoneIndex] = updated;
                      setZones(newZ);
                    }}
                    className="w-full accent-adv-accent"
                  />
                </div>
                <div>
                  <label className="text-adv-secondary font-mono block mb-1">
                    End Sec: {currentZone.endSec.toFixed(1)}s
                  </label>
                  <input
                    type="range"
                    min={currentZone.startSec + 0.5}
                    max={effectiveDuration}
                    step={0.5}
                    value={currentZone.endSec}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const updated = { ...currentZone, endSec: val };
                      const newZ = [...zones];
                      newZ[selectedZoneIndex] = updated;
                      setZones(newZ);
                    }}
                    className="w-full accent-adv-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pre-Flight Quality & Legibility Scorecard */}
          <div className="bg-adv-surface border border-adv-border p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-adv-border">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-adv-accent" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-adv-text">
                  Pre-Flight Surface Quality Scorecard
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-adv-success bg-adv-successBg border border-adv-success/30 px-2 py-0.5 rounded-full">
                {activeScorecard ? `${activeScorecard.placementScore}/100 Grade A+` : "Score: 96/100 Validated"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-adv-sidebar rounded-lg border border-adv-border">
                <span className="text-[10px] text-adv-secondary font-mono block">Placement Score</span>
                <span className="text-base font-black text-adv-text">
                  {activeScorecard?.placementScore || 96}/100
                </span>
              </div>
              <div className="p-2.5 bg-adv-sidebar rounded-lg border border-adv-border">
                <span className="text-[10px] text-adv-secondary font-mono block">Legibility Index</span>
                <span className="text-base font-black text-adv-success">
                  {activeScorecard?.legibilityIndex || 94}%
                </span>
              </div>
              <div className="p-2.5 bg-adv-sidebar rounded-lg border border-adv-border">
                <span className="text-[10px] text-adv-secondary font-mono block">Contrast Ratio</span>
                <span className="text-xs font-mono font-bold text-adv-text mt-1 block">
                  {activeScorecard?.contrastRatio || "14.2:1 (AAA)"}
                </span>
              </div>
              <div className="p-2.5 bg-adv-sidebar rounded-lg border border-adv-border">
                <span className="text-[10px] text-adv-secondary font-mono block">Occlusion Risk</span>
                <span className="text-xs font-mono font-bold text-adv-success mt-1 block uppercase">
                  {activeScorecard?.occlusionRisk || "Low"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Editor Rules Panel */}
        <div className="bg-adv-surface border border-adv-border p-5 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-adv-border">
            <Sliders size={18} className="text-adv-accent" />
            <h2 className="font-bold text-base text-adv-text">Editorial Rules</h2>
          </div>

          {/* Blocked Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-adv-secondary">
                Blocked Categories
              </span>
              <span className="text-[10px] text-adv-danger font-mono font-semibold">
                Never allowed
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableCategories.map((cat) => {
                const isBlocked = rules.blockedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleBlockedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      isBlocked
                        ? "bg-adv-dangerBg border-adv-danger text-adv-danger font-bold"
                        : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-white"
                    }`}
                  >
                    {isBlocked ? "✕ " : "+ "}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prominence Cap Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-adv-secondary">
                Prominence Cap
              </span>
              <span className="font-mono font-bold text-adv-text">
                {(rules.prominenceCap * 100).toFixed(0)}% screen
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.05}
              value={rules.prominenceCap}
              onChange={(e) =>
                setRules({ ...rules, prominenceCap: parseFloat(e.target.value) })
              }
              className="w-full accent-adv-accent h-1.5 rounded-lg bg-adv-sidebar cursor-pointer"
            />
            <p className="text-[11px] text-adv-secondary">
              Ads on surfaces exceeding this frame share will be capped.
            </p>
          </div>

          {/* Approval Toggle */}
          <div className="p-3 bg-adv-sidebar rounded-xl border border-adv-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-adv-text block">
                Require Studio Approval
              </span>
              <span className="text-[11px] text-adv-secondary block">
                Holds decision in review state before broadcast
              </span>
            </div>
            <button
              onClick={() =>
                setRules({ ...rules, requireApproval: !rules.requireApproval })
              }
              className={`w-12 h-6 rounded-full transition-colors relative border ${
                rules.requireApproval
                  ? "bg-adv-accent border-adv-accent"
                  : "bg-adv-surface border-adv-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  rules.requireApproval ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Scene Mood Chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-adv-secondary block">
              Scene Mood & Atmosphere
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableMoods.map((mood) => {
                const isActive = rules.sceneMood.includes(mood);
                return (
                  <button
                    key={mood}
                    onClick={() => toggleMoodTag(mood)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      isActive
                        ? "bg-adv-accent/20 border-adv-accent text-adv-accent font-semibold"
                        : "bg-adv-sidebar border-adv-border text-adv-secondary hover:text-white"
                    }`}
                  >
                    #{mood}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* "Who Sees What" Multi-Market Viewer Matrix Table */}
      <div className="bg-adv-surface border border-adv-border rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-adv-border">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-adv-accent" />
              <h2 className="text-lg font-bold text-adv-text">
                Who Sees What (Real-Time Persona Decisions)
              </h2>
            </div>
            <p className="text-xs text-adv-secondary mt-0.5">
              Simulating in-scene billboard placement for all 7 seeded viewers based on Intent affinity and ad network rules.
            </p>
          </div>
          {loadingDecisions && (
            <span className="text-xs text-adv-accent font-mono animate-pulse">
              Computing Intent & Ad Network rankings...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-adv-border text-adv-secondary font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Viewer</th>
                <th className="py-2.5 px-3">Market</th>
                <th className="py-2.5 px-3">Ad Network Match</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Intent Match</th>
                <th className="py-2.5 px-3">Rule Status</th>
                <th className="py-2.5 px-3">Reasoning Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adv-border/50">
              {(viewersJson as Viewer[]).map((viewer) => {
                const decision = decisions.find((d) => d.viewerId === viewer.id);
                const winnerCamp = decision?.winningCampaign;
                const topRank = decision?.ranked.find(
                  (r) => r.campaignId === decision.winner
                );
                const affinity = topRank ? Math.round(((topRank.intentScore ?? topRank.qlooAffinity) || 0) * 100) : 0;
                const status = topRank?.status || (viewer.adPreference === "adfree" ? "neutral" : "allowed");

                return (
                  <tr key={viewer.id} className="hover:bg-adv-surfaceHover/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-adv-text">
                      {viewer.name}
                    </td>
                    <td className="py-3 px-3 text-adv-secondary font-mono">
                      {viewer.country} ({viewer.language})
                    </td>
                    <td className="py-3 px-3">
                      {winnerCamp ? (
                        <span className="font-semibold text-white">
                          {winnerCamp.brandName}
                        </span>
                      ) : (
                        <span className="text-adv-secondary italic">
                          {viewer.adPreference === "adfree"
                            ? "Neutral Artwork"
                            : "Public Service"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-adv-secondary">
                      {winnerCamp?.category || "none"}
                    </td>
                    <td className="py-3 px-3">
                      {winnerCamp && !winnerCamp.publicService ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-adv-sidebar h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-adv-accent h-full rounded-full"
                              style={{ width: `${affinity}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-adv-text">
                            {affinity}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-adv-secondary font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          status === "selected"
                            ? "bg-adv-successBg border-adv-success text-adv-success"
                            : status === "blocked"
                            ? "bg-adv-dangerBg border-adv-danger text-adv-danger"
                            : status === "capped"
                            ? "bg-adv-warningBg border-adv-warning text-adv-warning"
                            : "bg-adv-sidebar border-adv-border text-adv-secondary"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-adv-secondary text-[11px] max-w-xs truncate">
                      {decision?.explanation || "Awaiting taste evaluation"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
