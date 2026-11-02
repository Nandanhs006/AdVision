#!/usr/bin/env python3
"""
SceneCast 2.5-Minute Master Video Generator
- Professional voiceover via Microsoft Edge TTS (en-US-AndrewNeural at rate +14%)
- Target duration: ~151 seconds (~2.5 minutes)
- Full 1080p automated recording via Playwright
- Structure:
  1. Introduction & Dashboard (Dark Mode)
  2. In-Scene Cinema Player & 3D Homography (Profile Personalization, Pause-to-Shop)
  3. 4-Way Persona Sync (Frame-accurate synchronized streaming)
  4. Spatial Studio Editor & AI Slot Scout (Quad pins & real-time slot heuristic)
  5. Intent Classification & Ad Network Inspector
  6. Ad Studio Multi-Aspect Creative Generator (1:1, 4:5, 9:16)
  7. Final segment: Switch to Warm Neutral Light Mode & Showcase Google AdSense + Meta Ads Connectivity!
"""

import os
import sys
import time
import asyncio
import subprocess
import shutil

BASE_DIR = "/Volumes/DiskD/HACKATHONS/scenecast"
TEMP_DIR = os.path.join(BASE_DIR, "scripts", "video_temp")
OUTPUT_VIDEO = os.path.join(BASE_DIR, "scenecast-demo-2.5min.mp4")
BACKUP_VIDEO = "/Volumes/DiskD/Devpost/Advision/scenecast-demo-2.5min.mp4"

os.makedirs(TEMP_DIR, exist_ok=True)

NARRATION_SECTIONS = [
    {
        "id": "part1_intro_dashboard",
        "title": "Introduction & SceneCast Dashboard",
        "text": (
            "Welcome to SceneCast, the intent-based in-scene advertising platform that transforms video content into dynamic, programmatic ad inventory. "
            "Instead of interruptive pre-roll or mid-roll commercials, SceneCast seamlessly blends brand creatives onto physical surfaces like billboards, "
            "digital facades, and transit screens directly inside video footage."
        ),
    },
    {
        "id": "part2_cinema_player",
        "title": "In-Scene Cinema Player & 3D Homography",
        "text": (
            "Here in the Cinema Player, we are watching locked 1080p footage of Times Square. "
            "Using mathematical 3D perspective homography, ads are sub-pixel mapped to the physical structure. "
            "As we toggle viewer profiles, the placement adapts dynamically: Alex sees Red Bull based on sports intent, Maya sees Sony Alpha for photography, "
            "and Liam on a kids profile receives a civic public-service announcement. "
            "Pausing the video reveals an interactive Pause-to-Shop QR checkout."
        ),
    },
    {
        "id": "part3_compare_sync",
        "title": "4-Way Persona Sync",
        "text": (
            "In our 4-Way Persona Sync view, all four viewports stream in locked frame synchronization. "
            "One scene, four viewers, and zero storyline interruption. "
            "Each viewer receives an intent-classified creative matching their profile, "
            "while strict editorial prominence caps guarantee the ad never exceeds thirty-five percent frame share."
        ),
    },
    {
        "id": "part4_studio_editor",
        "title": "Spatial Studio Editor & AI Slot Scout",
        "text": (
            "For streaming editors and filmmakers, the Spatial Studio provides an interactive workbench. "
            "Editors can drag 4-corner homography pins directly over video frames, calibrate perspective matrices, and define active flight windows. "
            "Our AI Slot Scout scans frames in real time, scoring candidate surfaces for contrast ratios and prominence."
        ),
    },
    {
        "id": "part5_intent_inspector",
        "title": "Intent Classification & Ad Network Inspector",
        "text": (
            "Under the Intent Targeting Inspector, SceneCast evaluates real-time commercial purchase intent signals. "
            "Winning creatives are ranked across Google AdSense programmatic auctions and Meta Ads social matching, "
            "then passed through deterministic guardrails for brand safety."
        ),
    },
    {
        "id": "part6_ad_studio",
        "title": "Ad Studio Multi-Aspect Creative Generator",
        "text": (
            "Our built-in Ad Studio takes audience intent signals and automatically synthesizes production-grade multi-aspect creatives. "
            "Using server-side canvas rendering, it generates one-to-one square feed units, four-to-five Meta portrait posts, "
            "and nine-to-sixteen vertical formats with WCAG AAA contrast compliance."
        ),
    },
    {
        "id": "part7_light_mode_connections",
        "title": "Warm Neutral Light Mode & Ad Networks Connectivity",
        "text": (
            "Now, let us switch to SceneCast Warm Neutral Light Mode to inspect our ad network distribution and connectivity. "
            "SceneCast integrates directly with Google AdSense and Google Ad Manager for programmatic in-scene Real-Time Bidding, "
            "auctioning video billboard real estate with dynamic eCPMs. "
            "Alongside AdSense, our Meta Ads connector bridges in-scene placements with Instagram Professional and Facebook Pages via Graph API v21.0. "
            "With AES-256 encrypted credentials and dual live and simulated modes, "
            "SceneCast delivers non-intrusive, evergreen video monetization for the streaming era."
        ),
    },
]


async def generate_speech_tracks():
    import edge_tts
    print("\n--- [Phase 1/4] Generating Voiceover Narration via Edge TTS ---")
    durations = []
    
    for idx, sec in enumerate(NARRATION_SECTIONS):
        audio_file = os.path.join(TEMP_DIR, f"narration_{idx:02d}_{sec['id']}.mp3")
        print(f"Generating audio {idx+1}/{len(NARRATION_SECTIONS)}: {sec['title']}...")
        # rate +14% yields exactly ~151 seconds (~2.5 minutes) total
        communicate = edge_tts.Communicate(sec["text"], "en-US-AndrewNeural", rate="+14%")
        await communicate.save(audio_file)
        
        # Probe exact duration
        res = subprocess.run([
            "/opt/homebrew/bin/ffprobe", "-i", audio_file,
            "-show_entries", "format=duration", "-v", "quiet", "-of", "csv=p=0"
        ], capture_output=True, text=True)
        dur = float(res.stdout.strip())
        durations.append(dur)
        sec["audio_file"] = audio_file
        sec["duration"] = dur
        print(f"  -> Duration: {dur:.2f}s")
        
    total_dur = sum(durations)
    print(f"\nTotal Narration Duration: {total_dur:.2f} seconds ({total_dur/60:.2f} minutes)")
    return durations


def record_playwright_video(durations):
    from playwright.sync_api import sync_playwright
    print("\n--- [Phase 2/4] Recording 1080p Interactive UI Flow via Playwright ---")
    
    record_dir = os.path.join(TEMP_DIR, "raw_capture")
    if os.path.exists(record_dir):
        shutil.rmtree(record_dir)
    os.makedirs(record_dir, exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
                "--autoplay-policy=no-user-gesture-required",
                "--window-size=1920,1080"
            ]
        )
        
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=record_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        # =====================================================================
        # PART 1: Introduction & Dashboard (Default Dark Mode)
        # =====================================================================
        t0 = time.time()
        target_dur1 = durations[0]
        print(f"[Part 1] Dashboard & Catalog Overview (Target: {target_dur1:.2f}s)...")
        page.goto("http://localhost:3000/?theme=dark")
        page.wait_for_load_state("networkidle")
        time.sleep(1.5)
        
        # Smooth hover over cards
        cards = page.locator(".grid a[href*='/watch/']")
        card_count = cards.count()
        if card_count > 0:
            for i in range(min(card_count, 3)):
                try:
                    cards.nth(i).hover()
                    time.sleep(2.0)
                except Exception:
                    pass
        
        elapsed = time.time() - t0
        rem = max(0.5, target_dur1 - elapsed)
        time.sleep(rem)

        # =====================================================================
        # PART 2: In-Scene Cinema Player (/watch/proj-tokyo-nightfall)
        # =====================================================================
        t0 = time.time()
        target_dur2 = durations[1]
        print(f"[Part 2] Cinema Player & Homography (Target: {target_dur2:.2f}s)...")
        page.goto("http://localhost:3000/watch/proj-tokyo-nightfall")
        page.wait_for_load_state("networkidle")
        time.sleep(2.5)

        # Switch persona to Maya (Sony Alpha)
        try:
            maya_btn = page.locator("button:has-text('Maya')").first
            if maya_btn.is_visible():
                maya_btn.click()
                print("Switched to Maya (Sony Alpha)")
            time.sleep(2.5)
        except Exception:
            pass

        # Switch persona to Alex (Red Bull)
        try:
            alex_btn = page.locator("button:has-text('Alex')").first
            if alex_btn.is_visible():
                alex_btn.click()
                print("Switched to Alex (Red Bull)")
            time.sleep(2.5)
        except Exception:
            pass

        # Switch to Liam (Kids Civic PSA)
        try:
            liam_btn = page.locator("button:has-text('Liam')").first
            if liam_btn.is_visible():
                liam_btn.click()
                print("Switched to Liam (Kids Civic PSA)")
            time.sleep(2.5)
        except Exception:
            pass

        # Switch back to Alex and trigger Pause-to-Shop
        try:
            if alex_btn.is_visible():
                alex_btn.click()
            time.sleep(1.0)
            # Click video container to pause
            player_vid = page.locator("video").first
            if player_vid.is_visible():
                player_vid.click()
                print("Paused video to show Pause-to-Shop QR")
            time.sleep(2.5)
        except Exception:
            pass

        elapsed = time.time() - t0
        rem = max(0.5, target_dur2 - elapsed)
        time.sleep(rem)

        # =====================================================================
        # PART 3: 4-Way Persona Sync (/compare)
        # =====================================================================
        t0 = time.time()
        target_dur3 = durations[2]
        print(f"[Part 3] 4-Way Persona Sync (Target: {target_dur3:.2f}s)...")
        page.goto("http://localhost:3000/compare")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)

        # Hover over synchronized viewports
        try:
            page.locator(".aspect-video").first.hover()
            time.sleep(3.0)
            page.evaluate("window.scrollBy({ top: 200, behavior: 'smooth' });")
            time.sleep(2.0)
        except Exception:
            pass

        elapsed = time.time() - t0
        rem = max(0.5, target_dur3 - elapsed)
        time.sleep(rem)

        # =====================================================================
        # PART 4: Spatial Studio Editor (/studio)
        # =====================================================================
        t0 = time.time()
        target_dur4 = durations[3]
        print(f"[Part 4] Spatial Studio Editor (Target: {target_dur4:.2f}s)...")
        page.goto("http://localhost:3000/studio")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)

        # Click AI Slot Scout
        try:
            scout_btn = page.locator("button:has-text('AI Slot Scout'), button:has-text('Run AI')").first
            if scout_btn.is_visible():
                scout_btn.click()
                print("Triggered AI Slot Scout")
                time.sleep(2.5)
        except Exception:
            pass

        # Inspect prominence slider / inputs
        try:
            page.hover("text=Prominence Cap")
            time.sleep(2.0)
        except Exception:
            pass

        elapsed = time.time() - t0
        rem = max(0.5, target_dur4 - elapsed)
        time.sleep(rem)

        # =====================================================================
        # PART 5: Intent Targeting Inspector (/targeting)
        # =====================================================================
        t0 = time.time()
        target_dur5 = durations[4]
        print(f"[Part 5] Intent Targeting Inspector (Target: {target_dur5:.2f}s)...")
        page.goto("http://localhost:3000/targeting")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)

        try:
            page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' });")
            time.sleep(2.5)
            page.evaluate("window.scrollBy({ top: -300, behavior: 'smooth' });")
            time.sleep(1.5)
        except Exception:
            pass

        elapsed = time.time() - t0
        rem = max(0.5, target_dur5 - elapsed)
        time.sleep(rem)

        # =====================================================================
        # PART 6: Ad Studio Multi-Aspect Generator (/ad-studio)
        # =====================================================================
        t0 = time.time()
        target_dur6 = durations[5]
        print(f"[Part 6] Ad Studio Multi-Aspect Generator (Target: {target_dur6:.2f}s)...")
        page.goto("http://localhost:3000/ad-studio")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)

        try:
            page.evaluate("window.scrollBy({ top: 350, behavior: 'smooth' });")
            time.sleep(2.5)
        except Exception:
            pass

        elapsed = time.time() - t0
        rem = max(0.5, target_dur6 - elapsed)
        time.sleep(rem)

        # =====================================================================
        # PART 7: Switch to Warm Neutral Light Mode & Ad Networks (/connections)
        # =====================================================================
        t0 = time.time()
        target_dur7 = durations[6]
        print(f"[Part 7] Navigating to Connections & SWITCHING TO LIGHT MODE (Target: {target_dur7:.2f}s)...")
        page.goto("http://localhost:3000/connections")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)

        # CLICK THE THEME TOGGLE BUTTON TO SWITCH TO WARM NEUTRAL LIGHT MODE!
        try:
            theme_btn = page.locator("button[aria-label='Toggle theme']").first
            if theme_btn.is_visible():
                theme_btn.click()
                print(">>> CLICKED THEME TOGGLE BUTTON: Transitioned to Warm Neutral Light Mode! <<<")
                time.sleep(1.5)
        except Exception as e:
            print("Theme toggle click note:", e)
        
        # Ensure class is applied
        page.evaluate("document.documentElement.classList.add('light');")
        time.sleep(1.5)

        # Showcase Google AdSense Card & Click Sync Inventory
        try:
            adsense_card = page.locator("text=Google AdSense").first
            if adsense_card.is_visible():
                adsense_card.hover()
                time.sleep(2.0)
            
            sync_btn = page.locator("button:has-text('Sync AdSense Inventory')").first
            if sync_btn.is_visible():
                sync_btn.click()
                print("Clicked Sync AdSense Inventory button in Light Mode")
                time.sleep(2.0)
        except Exception:
            pass

        # Scroll to show ad units table and Meta Ads connector
        try:
            page.evaluate("window.scrollBy({ top: 300, behavior: 'smooth' });")
            time.sleep(3.0)
            
            meta_header = page.locator("text=Meta Ads").first
            if meta_header.is_visible():
                meta_header.hover()
                time.sleep(2.5)
            
            page.evaluate("window.scrollBy({ top: 250, behavior: 'smooth' });")
            time.sleep(3.0)
        except Exception:
            pass

        elapsed = time.time() - t0
        rem = max(0.5, target_dur7 - elapsed)
        time.sleep(rem)

        # Finish recording
        print("Closing browser context and finalizing capture...")
        page.close()
        context.close()
        browser.close()

    # Find the recorded video file
    recorded_files = [
        os.path.join(record_dir, f)
        for f in os.listdir(record_dir)
        if f.endswith(".webm") or f.endswith(".mp4")
    ]
    if not recorded_files:
        raise RuntimeError("No raw recording file found from Playwright.")
    
    raw_video = recorded_files[0]
    print(f"Raw recording saved: {raw_video}")
    return raw_video


def compose_master_video(raw_video):
    print("\n--- [Phase 3/4] Composing Master Narration & Ambient Audio ---")
    concat_list_path = os.path.join(TEMP_DIR, "audio_concat.txt")
    with open(concat_list_path, "w") as f:
        for sec in NARRATION_SECTIONS:
            f.write(f"file '{sec['audio_file']}'\n")

    master_narration = os.path.join(TEMP_DIR, "master_narration.mp3")
    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list_path, "-c", "copy", master_narration
    ], check=True)

    # Get master narration length
    res = subprocess.run([
        "/opt/homebrew/bin/ffprobe", "-i", master_narration,
        "-show_entries", "format=duration", "-v", "quiet", "-of", "csv=p=0"
    ], capture_output=True, text=True)
    narration_duration = float(res.stdout.strip())
    print(f"Master narration duration: {narration_duration:.2f}s ({narration_duration/60:.2f} min)")

    # Generate warm, gentle 432 Hz harmonic ambient pad
    ambient_audio = os.path.join(TEMP_DIR, "ambient_pad.mp3")
    fade_out_start = max(0, narration_duration - 4)
    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-y", "-f", "lavfi",
        "-i", f"sine=frequency=432:sample_rate=48000:duration={narration_duration + 3}",
        "-af", f"lowpass=f=450,volume=0.032,afade=t=in:ss=0:d=3,afade=t=out:st={fade_out_start:.2f}:d=4",
        ambient_audio
    ], check=True)

    # Mix narration with ambient track
    mixed_audio = os.path.join(TEMP_DIR, "mixed_soundtrack.mp3")
    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-y",
        "-i", master_narration,
        "-i", ambient_audio,
        "-filter_complex", "[0:a]volume=1.0[v];[1:a]volume=0.8[a];[v][a]amix=inputs=2:duration=first:dropout_transition=2[out]",
        "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "192k",
        mixed_audio
    ], check=True)

    print("\n--- [Phase 4/4] Muxing 1080p Video and Master Soundtrack ---")
    
    # Get raw video duration
    res_v = subprocess.run([
        "/opt/homebrew/bin/ffprobe", "-i", raw_video,
        "-show_entries", "format=duration", "-v", "quiet", "-of", "csv=p=0"
    ], capture_output=True, text=True)
    video_duration = float(res_v.stdout.strip())
    print(f"Raw video duration: {video_duration:.2f}s")

    # Target duration matches master narration
    target_duration = narration_duration
    speed_factor = video_duration / target_duration
    print(f"Synchronizing video speed factor: {speed_factor:.4f}")

    # Build broadcast-grade H.264 1080p MP4
    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-y",
        "-i", raw_video,
        "-i", mixed_audio,
        "-filter_complex", f"[0:v]setpts={1.0/speed_factor:.5f}*PTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v]",
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", f"{target_duration:.2f}",
        OUTPUT_VIDEO
    ], check=True)

    print(f"\n Master broadcast video generated: {OUTPUT_VIDEO}")
    
    # Copy to backup location
    try:
        shutil.copy2(OUTPUT_VIDEO, BACKUP_VIDEO)
        print(f" Backup copy saved to: {BACKUP_VIDEO}")
    except Exception as e:
        print("Note: Could not copy to backup location:", e)

    # Print final video info
    res_final = subprocess.run([
        "/opt/homebrew/bin/ffprobe", "-i", OUTPUT_VIDEO,
        "-show_entries", "format=duration,size,bit_rate", "-v", "quiet", "-of", "json"
    ], capture_output=True, text=True)
    print(f"Final video details:\n{res_final.stdout}")


def main():
    durations = asyncio.run(generate_speech_tracks())
    raw_video = record_playwright_video(durations)
    compose_master_video(raw_video)
    print("\n All tasks completed successfully!")


if __name__ == "__main__":
    main()
