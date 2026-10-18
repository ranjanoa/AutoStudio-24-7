import os
import sys
from gtts import gTTS

# Force UTF-8 stdout if possible
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips
except ImportError:
    from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips

# German text subtitles and audio for each scene
SCENES_DATA = [
    {"file": "scene1.mp4", "text": "Guten Morgen!", "lang": "de"},
    {"file": "scene2.mp4", "text": "Ich esse einen Apfel.", "lang": "de"},
    {"file": "scene3.mp4", "text": "Ich trinke Wasser.", "lang": "de"},
    {"file": "scene4.mp4", "text": "Gute Nacht!", "lang": "de"}
]

def generate_audio_files():
    """Generates German voiceovers using Google Text-to-Speech"""
    print("[+] Generating German voiceovers...")
    audio_files = []
    for idx, item in enumerate(SCENES_DATA, 1):
        audio_path = f"audio_scene{idx}.mp3"
        if not os.path.exists(audio_path):
            tts = gTTS(text=item["text"], lang=item["lang"])
            tts.save(audio_path)
        audio_files.append(audio_path)
        print(f"    Saved audio for Scene {idx}: '{item['text']}'")
    return audio_files

def build_final_video():
    audio_paths = generate_audio_files()

    print("\n[+] Checking video files...")
    for idx, item in enumerate(SCENES_DATA):
        filename = item["file"]
        if not os.path.exists(filename):
            print(f"[-] Missing file: '{filename}'")
            print(f"    Please download scene {idx+1} from Kling AI and rename it to '{filename}' in this folder.")

    missing_files = [item["file"] for item in SCENES_DATA if not os.path.exists(item["file"])]
    if missing_files:
        print("\n[!] Cannot create final video yet because some scene files are missing.")
        print("[-] Place scene1.mp4, scene2.mp4, scene3.mp4, and scene4.mp4 in this folder and re-run: python combine_video.py")
        return

    clips = []
    for idx, item in enumerate(SCENES_DATA):
        v_clip = VideoFileClip(item["file"])
        a_clip = AudioFileClip(audio_paths[idx])
        
        # MoviePy 2.x uses with_audio, 1.x uses set_audio
        if hasattr(v_clip, "with_audio"):
            v_clip = v_clip.with_audio(a_clip)
        else:
            v_clip = v_clip.set_audio(a_clip)
            
        clips.append(v_clip)

    final_clip = concatenate_videoclips(clips)
    
    output_filename = "final_german_lesson.mp4"
    print(f"\n[+] Exporting final video to '{output_filename}'...")
    final_clip.write_videofile(output_filename, fps=24)
    print("\n[SUCCESS] Your 20-second German lesson video is ready: final_german_lesson.mp4")

if __name__ == "__main__":
    build_final_video()


