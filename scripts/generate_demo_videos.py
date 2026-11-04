#!/usr/bin/env python3
"""
Generates 4 high-quality 1080p demo video clips for SceneCast using FFmpeg drawbox & color filters:
1. 01-sports-arena-courtside.mp4 (Sports Stadium Courtside Ribbon & Upper Jumbotron)
2. 02-luxury-lounge-cafe.mp4 (Aesthetic Shibuya Craft Roastery Vertical Digital Display)
3. 03-cyber-cinema-drama.mp4 (Cinematic Streaming Film Scene with Central Display)
4. 04-paris-daylight-boulevard.mp4 (Paris Daylight Fashion Boulevard Storefront Vitrine)
"""

import os
import shutil
import subprocess

OUT_DIR = "/Volumes/DiskD/Nanda/Advision - Scenecast/demo-videos"
PUBLIC_DIR = "/Volumes/DiskD/Nanda/Advision - Scenecast/public/demo-videos"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

VIDEOS = [
    {
        "filename": "01-sports-arena-courtside.mp4",
        "name": "Championship Sports Arena (Courtside Cut)",
        "filmTitle": "Metaverse Arena: Championship Finals",
        "filter": (
            "color=c=0x060f1f:s=1920x1080:d=15:r=30,"
            # Court floor line and arena boundaries
            "drawbox=x=0:y=720:w=1920:h=360:color=0x1e3a5f@0.6:t=fill,"
            "drawbox=x=0:y=718:w=1920:h=4:color=0x38bdf8@0.8:t=fill,"
            # Sweeping arena floodlight beams
            "drawbox=x='960+450*sin(t*1.2)':y=40:w=120:h=900:color=0x0284c7@0.12:t=fill,"
            "drawbox=x='960-450*sin(t*1.2)':y=40:w=120:h=900:color=0x38bdf8@0.10:t=fill,"
            # Perimeter courtside LED ribbon (Bottom)
            "drawbox=x=0:y=680:w=1920:h=36:color=0x0284c7@0.4:t=fill,"
            # Target billboard surface: Upper Right Elevated Jumbotron Screen
            "drawbox=x=1240:y=110:w=540:h=350:color=0x38bdf8@0.8:t=3,"
            "drawbox=x=1243:y=113:w=534:h=344:color=0x0a1d37@0.92:t=fill,"
            "drawbox=x=1255:y=125:w=510:h=20:color=0x0284c7@0.5:t=fill"
        )
    },
    {
        "filename": "02-luxury-lounge-cafe.mp4",
        "name": "Tokyo Craft Roastery (Lounge Cut)",
        "filmTitle": "Kissa Shibuya: Artisanal Roast",
        "filter": (
            "color=c=0x140c08:s=1920x1080:d=15:r=30,"
            # Architectural wood slat background
            "drawbox=x=0:y=0:w=1920:h=1080:color=0x23140c@0.4:t=fill,"
            "drawbox=x=0:y='300+150*sin(t*0.6)':w=1920:h=200:color=0xd97706@0.05:t=fill,"
            # Cafe counter bar edge
            "drawbox=x=0:y=760:w=1920:h=320:color=0x2a170d@0.85:t=fill,"
            "drawbox=x=0:y=758:w=1920:h=4:color=0xf59e0b@0.6:t=fill,"
            # Target billboard surface: Left Vertical Architectural Display
            "drawbox=x=320:y=180:w=420:h=560:color=0xf59e0b@0.8:t=3,"
            "drawbox=x=323:y=183:w=414:h=554:color=0x211209@0.92:t=fill,"
            "drawbox=x=335:y=195:w=390:h=24:color=0xb45309@0.5:t=fill"
        )
    },
    {
        "filename": "03-cyber-cinema-drama.mp4",
        "name": "Neo-Tokyo 2049 (Streaming Cut)",
        "filmTitle": "Cyber Noir: The Crossing Episode 4",
        "filter": (
            "color=c=0x050d18:s=1920x1080:d=15:r=30,"
            # Cinematic anamorphic horizontal lens flare pulses
            "drawbox=x=0:y='480+180*sin(t*1.4)':w=1920:h=40:color=0x06b6d4@0.09:t=fill,"
            "drawbox=x=0:y='560-180*sin(t*1.4)':w=1920:h=20:color=0x38bdf8@0.08:t=fill,"
            # Floor reflections
            "drawbox=x=0:y=800:w=1920:h=280:color=0x0a1a2e@0.6:t=fill,"
            # Target billboard surface: Center Futuristic Wall Display Screen
            "drawbox=x=600:y=200:w=720:h=460:color=0x22d3ee@0.8:t=3,"
            "drawbox=x=603:y=203:w=714:h=454:color=0x081628@0.92:t=fill,"
            "drawbox=x=615:y=215:w=690:h=24:color=0x0891b2@0.5:t=fill"
        )
    },
    {
        "filename": "04-paris-daylight-boulevard.mp4",
        "name": "Paris Fashion Promenade (Daylight Cut)",
        "filmTitle": "Avenue Montaigne: High Fashion Walk",
        "filter": (
            "color=c=0x1f2633:s=1920x1080:d=15:r=30,"
            # European limestone boulevard background
            "drawbox=x=0:y=0:w=1920:h=600:color=0x374151@0.5:t=fill,"
            # Daylight sidewalk pavement
            "drawbox=x=0:y=600:w=1920:h=480:color=0x1e2430@0.85:t=fill,"
            "drawbox=x='200*sin(t*0.5)':y=0:w=1920:h=1080:color=0xfef08a@0.04:t=fill,"
            # Target billboard surface: Right Street-Level Storefront Vitrine Lightbox
            "drawbox=x=1360:y=240:w=360:h=580:color=0xc084fc@0.8:t=3,"
            "drawbox=x=1363:y=243:w=354:h=574:color=0x151c28@0.92:t=fill,"
            "drawbox=x=1375:y=255:w=330:h=24:color=0x9333ea@0.5:t=fill"
        )
    }
]

print("Rendering 4 1080p demo videos using FFmpeg...")

for v in VIDEOS:
    target_path = os.path.join(OUT_DIR, v["filename"])
    public_path = os.path.join(PUBLIC_DIR, v["filename"])

    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-f", "lavfi",
        "-i", v["filter"],
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        target_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        print(f"Error rendering {v['filename']}:", res.stderr.decode()[-300:])
    else:
        shutil.copy2(target_path, public_path)
        size_mb = os.path.getsize(target_path) / (1024 * 1024)
        print(f"✓ Created {v['filename']} ({size_mb:.2f} MB)")

print("All 4 demo videos successfully rendered in demo-videos/ and public/demo-videos/!")
