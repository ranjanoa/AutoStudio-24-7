import os
import sys
import time
import threading
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

app = Flask(__name__, static_folder="public")
CORS(app)

REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")
os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_TOKEN

import replicate
from gtts import gTTS
from moviepy import VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip, concatenate_videoclips

# Global state for generation progress
current_job = {
    "status": "idle", # idle, generating, completed, error
    "progress": 0,
    "current_scene": 0,
    "message": "Ready to generate",
    "video_url": "",
    "error": ""
}

# German A1 Series Curriculum Episodes
GERMAN_A1_CURRICULUM = [
    {
        "id": "ep1",
        "title": "Episode 1: Daily Routine",
        "level": "A1.1 - Beginner",
        "description": "Learn basic daily activities: Good morning, eating an apple, drinking water, good night.",
        "scenes": [
            {
                "german": "Guten Morgen!",
                "english": "Good Morning!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie waking up in a warm cozy bedroom with morning sunlight streaming through the window, cheerful expression, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda in a cozy bedroom waking up, smiling cheerfully at the camera, stretching arms happily, 4k"
            },
            {
                "german": "Ich esse einen Apfel.",
                "english": "I am eating an apple.",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie sitting at a wooden kitchen table holding a delicious red apple, warm kitchen background, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda sitting at a wooden kitchen table, happily crunching on a juicy red apple, chewing with a joyful smile, 4k"
            },
            {
                "german": "Ich trinke Wasser.",
                "english": "I am drinking water.",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie sitting at a dining table with a glass tumbler of water with a straw, bright cozy room, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda sitting at a dining table taking a sip of water from a glass tumbler with a straw, smiling happily, 4k"
            },
            {
                "german": "Gute Nacht!",
                "english": "Good Night!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie tucked under a blanket in bed, starry night sky visible through bedroom window, cozy night glow, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda in a cozy bedroom under a starry night window, yawning cutely, wrapping up in a blanket and closing eyes peacefully, 4k"
            }
        ]
    },
    {
        "id": "ep2",
        "title": "Episode 2: Greetings & Intro",
        "level": "A1.1 - Beginner",
        "description": "Learn to introduce yourself: Hello, what is your name, my name is Bao, nice to meet you!",
        "scenes": [
            {
                "german": "Hallo! Wie heißt du?",
                "english": "Hello! What is your name?",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie standing in a friendly green park, waving hand cheerfully at camera, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda standing in a sunny park, waving hand enthusiastically, smiling and asking a question, 4k"
            },
            {
                "german": "Ich heiße Bao.",
                "english": "My name is Bao.",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie pointing to himself with a proud cute smile in a cozy living room, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda pointing to his chest with a cute smile, nodding head happily, 4k"
            },
            {
                "german": "Schön dich kennenzulernen!",
                "english": "Nice to meet you!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie extending a hand for a handshake, joyful friendly expression, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda bowing slightly and extending a warm hand, smiling widely, 4k"
            },
            {
                "german": "Tschüss! Bis bald!",
                "english": "Bye! See you soon!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie walking away and waving goodbye over shoulder with a big grin, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda waving goodbye cheerfully with both hands, smiling happily, 4k"
            }
        ]
    },
    {
        "id": "ep3",
        "title": "Episode 3: Cafe & Ordering",
        "level": "A1.1 - Beginner",
        "description": "Order coffee and snacks: A coffee please, with milk and sugar, very delicious, thank you!",
        "scenes": [
            {
                "german": "Ein Kaffee, bitte!",
                "english": "A coffee, please!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie sitting at a cozy wooden cafe counter with a steaming coffee cup, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda in a cozy cafe pointing at a steaming mug of coffee, nodding politely, 4k"
            },
            {
                "german": "Mit Milch und Zucker.",
                "english": "With milk and sugar.",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie pouring a small pitcher of milk into coffee, cafe background, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda carefully pouring milk into a coffee cup, looking focused and happy, 4k"
            },
            {
                "german": "Das ist sehr lecker!",
                "english": "This is very delicious!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie taking a sip of coffee and looking delighted with eyes wide open, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda taking a delicious sip of coffee, licking lips and giving a thumbs up, 4k"
            },
            {
                "german": "Vielen Dank!",
                "english": "Thank you very much!",
                "image_prompt": "A 3D Pixar-style fluffy red panda wearing a green hoodie placing hands together gratefully, warm cafe lighting, 4k",
                "video_prompt": "A 3D Pixar-style fluffy red panda smiling warmly, placing hands over heart in sincere gratitude, 4k"
            }
        ]
    }
]

def add_subtitles_and_audio(video_path, audio_path, german_text, english_text, output_path):
    """Adds audio and styled subtitle overlays"""
    v_clip = VideoFileClip(video_path)
    a_clip = AudioFileClip(audio_path)
    
    if v_clip.duration < a_clip.duration:
        v_clip = v_clip.with_duration(a_clip.duration + 0.5)
        
    if hasattr(v_clip, "with_audio"):
        v_clip = v_clip.with_audio(a_clip)
    else:
        v_clip = v_clip.set_audio(a_clip)

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
    
    sub_overlay_path = f"subtitle_temp_{int(time.time())}.png"
    sub_img.save(sub_overlay_path)
    
    sub_clip = ImageClip(sub_overlay_path).with_duration(v_clip.duration).with_position(("center", v_clip.h - 180))
    final = CompositeVideoClip([v_clip, sub_clip])
    final.write_videofile(output_path, fps=24, codec="libx264")
    if os.path.exists(sub_overlay_path):
        os.remove(sub_overlay_path)
    return output_path

def process_video_generation_task(episode_data):
    global current_job
    try:
        current_job["status"] = "generating"
        current_job["progress"] = 5
        current_job["message"] = "Initializing generation pipeline..."
        
        ep_id = episode_data.get("id", "custom")
        scenes = episode_data["scenes"]
        rendered_scene_files = []
        
        for idx, scene in enumerate(scenes, 1):
            current_job["current_scene"] = idx
            current_job["message"] = f"Generating 3D Background Image for Scene {idx}/4: '{scene['german']}'..."
            current_job["progress"] = 10 + (idx - 1) * 20

            # 1. Automatically generate unique 3D background reference image for this scene
            img_filename = f"{ep_id}_scene{idx}.png"
            if not os.path.exists(img_filename):
                print(f"[+] Generating 3D scene image for Scene {idx}: '{scene['image_prompt']}'...")
                try:
                    img_output = replicate.run(
                        "black-forest-labs/flux-schnell",
                        input={
                            "prompt": scene["image_prompt"],
                            "aspect_ratio": "16:9",
                            "output_format": "png"
                        }
                    )
                    img_url = str(img_output[0]) if isinstance(img_output, list) else str(img_output)
                    r_img = requests.get(img_url)
                    with open(img_filename, "wb") as f_img:
                        f_img.write(r_img.content)
                    
                    with open(os.path.join("public", img_filename), "wb") as f_img_pub:
                        f_img_pub.write(r_img.content)
                except Exception as img_err:
                    print(f"[!] Warning: FLUX Image generation error ({img_err}), using default master character.")
                    img_filename = "cute_3d_character.png"

            # 2. Render raw video via MiniMax Hailuo on Replicate
            current_job["message"] = f"Rendering MiniMax AI Video for Scene {idx}/4..."
            raw_video = f"{ep_id}_raw_scene{idx}.mp4"
            if not os.path.exists(raw_video):
                with open(img_filename, "rb") as img_f:
                    prediction = replicate.predictions.create(
                        version="5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912",
                        input={
                            "first_frame_image": img_f,
                            "prompt": scene["video_prompt"],
                            "prompt_optimizer": True
                        }
                    )

                while prediction.status not in ["succeeded", "failed", "canceled"]:
                    time.sleep(4)
                    prediction.reload()

                if prediction.status != "succeeded":
                    raise Exception(f"Replicate error: {prediction.error}")

                video_url = str(prediction.output)
                r = requests.get(video_url)
                with open(raw_video, "wb") as f:
                    f.write(r.content)

            # 3. Audio & Subtitles
            audio_path = f"{ep_id}_audio_scene{idx}.mp3"
            if not os.path.exists(audio_path):
                tts = gTTS(text=scene["german"], lang="de")
                tts.save(audio_path)

            final_scene_file = f"{ep_id}_final_scene{idx}.mp4"
            add_subtitles_and_audio(raw_video, audio_path, scene["german"], scene["english"], final_scene_file)
            rendered_scene_files.append(final_scene_file)

        # 4. Concatenate scenes
        current_job["message"] = "Concatenating scenes & rendering final episode..."
        current_job["progress"] = 90
        
        clips = [VideoFileClip(f) for f in rendered_scene_files]
        final_clip = concatenate_videoclips(clips)
        
        final_video_name = f"{ep_id}_german_lesson.mp4"
        final_output_path = os.path.join("public", final_video_name)
        final_clip.write_videofile(final_output_path, fps=24, codec="libx264")

        current_job["status"] = "completed"
        current_job["progress"] = 100
        current_job["message"] = "Episode video generation complete!"
        current_job["video_url"] = f"/videos/{final_video_name}"


    except Exception as e:
        current_job["status"] = "error"
        current_job["error"] = str(e)
        current_job["message"] = f"Generation failed: {str(e)}"

@app.route("/")
def serve_index():
    return send_from_directory("public", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(os.path.join("public", path)):
        return send_from_directory("public", path)
    elif os.path.exists(path):
        return send_from_directory(".", path)
    else:
        return send_from_directory("public", "index.html")

@app.route("/api/episodes", methods=["GET"])
def get_episodes():
    return jsonify(GERMAN_A1_CURRICULUM)


@app.route("/api/status", methods=["GET"])
def get_status():
    return jsonify(current_job)

@app.route("/api/generate", methods=["POST"])
def start_generation():
    global current_job
    if current_job["status"] == "generating":
        return jsonify({"error": "A generation task is already in progress!"}), 400

    data = request.json
    episode_data = data.get("episode")
    if not episode_data:
        return jsonify({"error": "No episode data provided!"}), 400

    threading.Thread(target=process_video_generation_task, args=(episode_data,)).start()
    return jsonify({"message": "Generation started!", "status": "generating"})

@app.route("/videos/<filename>")
def serve_video(filename):
    # Serve video file from root or public folder
    if os.path.exists(os.path.join("public", filename)):
        return send_from_directory("public", filename)
    elif os.path.exists(filename):
        return send_from_directory(".", filename)
    else:
        return jsonify({"error": "Video not found"}), 404

if __name__ == "__main__":
    if not os.path.exists("public"):
        os.makedirs("public")
    print("🚀 DeutschPanda Studio Web App running at: http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
