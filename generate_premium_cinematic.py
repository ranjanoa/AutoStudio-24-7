import os
import sys
import time
import requests
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

import replicate
from gtts import gTTS
from moviepy import VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip, concatenate_videoclips

SCENES_CONFIG = [
    {
        "image": "scene1_bedroom.png",
        "prompt": "A 3D Pixar-style fluffy red panda in a cozy bedroom waking up, smiling cheerfully at the camera, stretching arms happily, cinematic lighting, 4k resolution",
        "german": "Guten Morgen!",
        "english": "Good Morning!",
        "raw_video": "minimax_raw_scene1.mp4",
        "audio": "audio_scene1_de.mp3",
        "final_scene": "premium_scene1.mp4"
    },
    {
        "image": "scene2_kitchen.png",
        "prompt": "A 3D Pixar-style fluffy red panda sitting at a wooden kitchen table, happily crunching on a juicy red apple, chewing with a joyful smile, 4k resolution",
        "german": "Ich esse einen Apfel.",
        "english": "I am eating an apple.",
        "raw_video": "minimax_raw_scene2.mp4",
        "audio": "audio_scene2_de.mp3",
        "final_scene": "premium_scene2.mp4"
    },
    {
        "image": "scene3_dining.png",
        "prompt": "A 3D Pixar-style fluffy red panda sitting at a dining table taking a sip of water from a glass tumbler with a straw, smiling happily, 4k resolution",
        "german": "Ich trinke Wasser.",
        "english": "I am drinking water.",
        "raw_video": "minimax_raw_scene3.mp4",
        "audio": "audio_scene3_de.mp3",
        "final_scene": "premium_scene3.mp4"
    },
    {
        "image": "scene4_night.png",
        "prompt": "A 3D Pixar-style fluffy red panda in a cozy bedroom under a starry night window, yawning cutely, wrapping up in a blanket and closing eyes peacefully, 4k resolution",
        "german": "Gute Nacht!",
        "english": "Good Night!",
        "raw_video": "minimax_raw_scene4.mp4",
        "audio": "audio_scene4_de.mp3",
        "final_scene": "premium_scene4.mp4"
    }
]

def add_subtitles_and_audio(video_path, audio_path, german_text, english_text, output_path):
    """Combines video, German voiceover audio, and translucent subtitle overlay"""
    print(f"  [+] Adding audio and subtitles to {output_path}...")
    v_clip = VideoFileClip(video_path)
    a_clip = AudioFileClip(audio_path)
    
    # Ensure video is at least as long as audio
    if v_clip.duration < a_clip.duration:
        v_clip = v_clip.with_duration(a_clip.duration + 0.5)
        
    if hasattr(v_clip, "with_audio"):
        v_clip = v_clip.with_audio(a_clip)
    else:
        v_clip = v_clip.set_audio(a_clip)

    # Subtitle image generation
    sub_img = Image.new("RGBA", (v_clip.w, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sub_img)
    
    banner_margin = 40
    draw.rounded_rectangle(
        [(banner_margin, 10), (v_clip.w - banner_margin, 150)],
        radius=20,
        fill=(0, 0, 0, 180)
    )
    
    try:
        font_large = ImageFont.truetype("arial.ttf", 34)
        font_small = ImageFont.truetype("arial.ttf", 24)
    except IOError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
        
    draw.text((v_clip.w / 2, 40), german_text, font=font_large, fill=(255, 220, 0), anchor="mm")
    draw.text((v_clip.w / 2, 100), f"({english_text})", font=font_small, fill=(255, 255, 255), anchor="mm")
    
    sub_overlay_path = f"subtitle_temp_{output_path}.png"
    sub_img.save(sub_overlay_path)
    
    sub_clip = ImageClip(sub_overlay_path).with_duration(v_clip.duration).with_position(("center", v_clip.h - 180))
    final = CompositeVideoClip([v_clip, sub_clip])
    final.write_videofile(output_path, fps=24, codec="libx264")
    return output_path

def generate_scene(cfg, idx):
    print(f"\n==========================================")
    print(f"[+] Scene {idx}/4: '{cfg['german']}'")
    print(f"==========================================")
    
    # 1. Generate Raw Video via MiniMax Hailuo on Replicate (if not already rendered)
    if not os.path.exists(cfg["raw_video"]):
        print(f"  [+] Requesting MiniMax Hailuo Video generation...")
        with open(cfg["image"], "rb") as img_f:
            prediction = replicate.predictions.create(
                version="5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912",
                input={
                    "first_frame_image": img_f,
                    "prompt": cfg["prompt"],
                    "prompt_optimizer": True
                }
            )

        print(f"  Prediction ID: {prediction.id}. Waiting for render...")
        while prediction.status not in ["succeeded", "failed", "canceled"]:
            time.sleep(5)
            prediction.reload()
            print(f"  Status: {prediction.status}...")

        if prediction.status != "succeeded":
            print(f"  [!] MiniMax generation failed for Scene {idx}: {prediction.error}")
            return None

        video_url = str(prediction.output)
        print(f"  [+] Downloading Scene {idx} video...")
        r = requests.get(video_url)
        with open(cfg["raw_video"], "wb") as f:
            f.write(r.content)
    else:
        print(f"  [i] Using existing raw video: {cfg['raw_video']}")

    # 2. Generate German Audio
    if not os.path.exists(cfg["audio"]):
        tts = gTTS(text=cfg["german"], lang="de")
        tts.save(cfg["audio"])

    # 3. Add Subtitles & Voiceover
    return add_subtitles_and_audio(cfg["raw_video"], cfg["audio"], cfg["german"], cfg["english"], cfg["final_scene"])

def build_full_video():
    scene_files = []
    for idx, cfg in enumerate(SCENES_CONFIG, 1):
        scene_path = generate_scene(cfg, idx)
        if scene_path and os.path.exists(scene_path):
            scene_files.append(scene_path)

    if len(scene_files) < 4:
        print(f"[!] Warning: Only {len(scene_files)} scenes completed!")
        if not scene_files:
            return

    print("\n🎬 Concatenating all 4 scenes into final 20-second video...")
    clips = [VideoFileClip(f) for f in scene_files]
    final_clip = concatenate_videoclips(clips)
    
    final_output = "final_premium_german_lesson.mp4"
    final_clip.write_videofile(final_output, fps=24, codec="libx264")
    print(f"\n🎉 [SUCCESS] Complete 20-Second Premium Video Ready: {final_output}")

if __name__ == "__main__":
    build_full_video()
