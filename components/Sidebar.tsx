"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  SlidersHorizontal,
  Sparkles,
  PlaySquare,
  Columns3,
  Megaphone,
  BarChart3,
  Sun,
  Moon,
  Info,
  Palette,
  Share2,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { label: "Projects", href: "/", icon: Film },
  { label: "Studio Editor", href: "/studio", icon: SlidersHorizontal },
  { label: "Intent Targeting", href: "/targeting", icon: Sparkles },
  { label: "Player", href: "/watch/proj-tokyo-nightfall", icon: PlaySquare },
  { label: "4-Way Sync", href: "/compare", icon: Columns3 },
  { label: "Ad Studio", href: "/ad-studio", icon: Palette },
  { label: "Ad Networks & Social", href: "/connections", icon: Share2 },
  { label: "Brand Studio", href: "/campaigns", icon: Megaphone },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 flex-shrink-0 bg-adv-sidebar border-r border-adv-border flex flex-col justify-between p-4 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-adv-border mb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-adv-accent flex items-center justify-center font-black text-white shadow-md text-base">
              A
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-adv-text block leading-none">
                AdVision
              </span>
              <span className="text-[10px] text-adv-secondary font-mono tracking-wider uppercase mt-1 block">
                Meta AI · Audience Net
              </span>
            </div>
          </Link>

          {/* Quick Header Theme Switcher (Light / Dark Mode) */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-lg border border-adv-border bg-adv-surface hover:bg-adv-surfaceHover text-adv-text transition-all flex items-center justify-center shadow-sm group"
            title={`Switch to ${theme === "dark" ? "Light (Warm Neutral)" : "Dark (Charcoal)"} Mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun size={16} className="text-amber-400 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon size={16} className="text-adv-accent group-hover:-rotate-12 transition-transform" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                  isActive
                    ? "bg-adv-surface border-adv-border text-adv-text shadow-sm"
                    : "border-transparent text-adv-secondary hover:text-adv-text hover:bg-adv-surfaceHover hover:border-adv-border"
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-adv-accent" : "text-adv-secondary"}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom status & controls */}
      <div className="pt-4 border-t border-adv-border space-y-3">
        {/* Intent Engine status pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-adv-surface border border-adv-border text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-adv-success animate-pulse" />
            <span className="text-adv-secondary font-medium">Intent Engine</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-adv-successBg text-adv-success border border-adv-success/30 font-semibold">
            Meta AI Active
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-adv-border bg-adv-surface hover:bg-adv-surfaceHover text-adv-text text-sm transition-colors"
          title="Toggle light/dark theme"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-adv-secondary">
            {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            {theme === "dark" ? "Dark Charcoal" : "Warm Neutral"}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-adv-surfaceHover text-adv-secondary border border-adv-border">
            Toggle
          </span>
        </button>

        {/* Info label */}
        <div className="text-[11px] text-adv-secondary flex items-center gap-1.5 px-1">
          <Info size={12} className="flex-shrink-0" />
          <span>Same actors, only the billboard changes</span>
        </div>
      </div>
    </aside>
  );
}
