import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "SceneCast — In-Scene Ads with Meta AI & Meta Audience Network",
  description:
    "Dynamic, contextual in-scene ad placement powered by Meta AI models (Muse Spark, SAM 3.1, Muse Image) and Meta Ads / Audience Network. Story, timing, and cinematic footage stay identical while ads adapt dynamically in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-adv-main text-adv-text antialiased">
        <ThemeProvider>
          <div className="flex w-full min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto min-w-0 bg-adv-main">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
