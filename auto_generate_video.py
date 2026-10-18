import os
import sys
import time
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Get API Token from environment variable
REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

def run_automation():
    if not REPLICATE_API_TOKEN:
        print("[!] REPLICATE_API_TOKEN is missing!")
        return

    import replicate
    from gtts import gTTS
    from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips

    scenes = [
        {"prompt": "3D animated red panda wearing a green hoodie waking up in a cozy bed, stretching arms, Pixar style", "text": "Guten Morgen!", "out": "scene1.mp4"},
        {"prompt": "3D animated red panda wearing a green hoodie happily eating a juicy red apple, Pixar style", "text": "Ich esse einen Apfel.", "out": "scene2.mp4"},
        {"prompt": "3D animated red panda wearing a green hoodie drinking water from a glass with a straw, Pixar style", "text": "Ich trinke Wasser.", "out": "scene3.mp4"},
        {"prompt": "3D animated red panda wearing a green hoodie yawning and sleeping peacefully in bed, Pixar style", "text": "Gute Nacht!", "out": "scene4.mp4"}
    ]

    image_path = "cute_3d_character.png"
    if not os.path.exists(image_path):
        print(f"[!] {image_path} not found in current folder!")
        return

    clips = []
    print("[+] Starting automatic AI video generation via Replicate...")

    for idx, scene in enumerate(scenes, 1):
        print(f"\n[+] Generating Scene {idx}/4: '{scene['text']}'...")
        
        try:
            with open(image_path, "rb") as img_file:
                output = replicate.run(
                    "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
                    input={
                        "input_image": img_file,
                        "motion_bucket_id": 127,
                        "fps": 7,
                        "cond_aug": 0.02
                    }
                )

            video_url = str(output)
            print(f"    Video generated! Downloading scene {idx}...")
            r = requests.get(video_url)
            with open(scene["out"], "wb") as v_out:
                v_out.write(r.content)

        except Exception as e:
            print(f"    [!] Error generating motion video for scene {idx}: {e}")
            if "Insufficient credit" in str(e):
                print("    [!] Replicate account has 0 credits! Add billing at https://replicate.com/account/billing")
            return

        # Generate German Voiceover
        audio_path = f"audio_{idx}.mp3"
        if not os.path.exists(audio_path):
            tts = gTTS(text=scene["text"], lang="de")
            tts.save(audio_path)

        # Combine video & audio clip
        v_clip = VideoFileClip(scene["out"])
        a_clip = AudioFileClip(audio_path)
        
        # Match durations
        if v_clip.duration < a_clip.duration:
            v_clip = v_clip.with_duration(a_clip.duration + 0.5)
            
        if hasattr(v_clip, "with_audio"):
            v_clip = v_clip.with_audio(a_clip)
        else:
            v_clip = v_clip.set_audio(a_clip)

        clips.append(v_clip)

    print("\n[+] Stitching 4 scenes into final video...")
    final_clip = concatenate_videoclips(clips)
    final_output = "final_german_lesson.mp4"
    final_clip.write_videofile(final_output, fps=24)
    print(f"\n[SUCCESS] Your 20-second video is ready: {final_output}")

if __name__ == "__main__":
    run_automation()


