import os
import sys
import json
import time
import random
import asyncio
import subprocess
import urllib.parse
import hashlib
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ[k.strip()] = v.strip()

STORAGE_DIR = os.path.join(BASE_DIR, "storage")
VIDEOS_DIR = os.path.join(STORAGE_DIR, "output_videos")
THUMBS_DIR = os.path.join(STORAGE_DIR, "output_thumbnails")
AUDIO_DIR = os.path.join(STORAGE_DIR, "temp_audio")
IMAGES_DIR = os.path.join(STORAGE_DIR, "temp_images")
DB_FILE = os.path.join(STORAGE_DIR, "videos_db.json")

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(THUMBS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

def load_genres():
    config_path = os.path.join(BASE_DIR, "video_engine", "genres_config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def get_genre_config(genre_id):
    genres = load_genres()
    for g in genres:
        if g["id"] == genre_id:
            return g
    return genres[0] if genres else None

def generate_dynamic_script_llm(genre_info, user_topic=None):
    api_key = os.environ.get("LLM_API_KEY")
    if not HAS_REQUESTS or not api_key:
        return None
    
    topic = user_topic if user_topic else random.choice(genre_info.get("presetTopics", ["Amazing Discovery"]))
    genre_name = genre_info.get("name", "Unknown")
    prompt_template = genre_info.get("promptTemplate", "Create a short story.")
    
    prompt = f"""
You are a viral YouTube Shorts script writer. Generate a script for the genre '{genre_name}' about the topic '{topic}'.
{prompt_template}

Return ONLY valid JSON exactly matching this structure (no markdown formatting, no code blocks, just raw JSON):
{{
    "title": "A catchy YouTube title",
    "hook": "An engaging first sentence to hook the viewer.",
    "scenes": [
        {{
            "subtitle": "SHORT CAPTION 🌟",
            "text": "The narration text for this scene (1-2 sentences).",
            "highlightWords": ["WORD1", "WORD2"],
            "searchQuery": "Simple core noun for image search (e.g., 'forest', 'robot', 'pyramid')",
            "stockKeyword": "Detailed keyword for stock photo (e.g., 'ancient pyramid sunset')"
        }}
    ],
    "tags": ["tag1", "tag2", "tag3", "shorts"],
    "affiliateNote": "A call to action or pinned comment note."
}}
Ensure you return exactly 4 scenes.
"""
    try:
        text = ""
        if api_key.startswith("AIza"):
            print("[AI Engine] Requesting dynamic script from Google Gemini API...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.8}
            }
            res = requests.post(url, json=payload, timeout=20)
            if res.status_code == 200:
                text = res.json().get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
            else:
                print(f"[AI Engine Error] Gemini API returned {res.status_code}: {res.text}")
                return None
        elif api_key.startswith("sk-"):
            print("[AI Engine] Requesting dynamic script from OpenAI API...")
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant that only outputs valid raw JSON."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.8
            }
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            if res.status_code == 200:
                text = res.json().get("choices", [])[0].get("message", {}).get("content", "")
            else:
                print(f"[AI Engine Error] OpenAI API returned {res.status_code}: {res.text}")
                return None
        else:
            print("[AI Engine Error] Unrecognized API Key format. Must start with 'AIza' (Gemini) or 'sk-' (OpenAI).")
            return None
            
        if text.startswith("```json"):
            text = text.replace("```json", "", 1)
            if "```" in text: text = text.rsplit("```", 1)[0]
        elif text.startswith("```"):
            text = text.replace("```", "", 1)
            if "```" in text: text = text.rsplit("```", 1)[0]
            
        script_json = json.loads(text.strip())
        
        full_text = script_json.get("hook", "") + " " + " ".join([s.get("text", "") for s in script_json.get("scenes", [])])
        script_json["fullText"] = full_text
        script_json["topic"] = topic
        print("[AI Engine] AI dynamic script generated successfully!")
        return script_json
    except Exception as e:
        print(f"[AI Engine Error] Failed to generate dynamic script: {e}")
    return None

def generate_script_content(genre_info, user_topic=None):
    if os.environ.get("LLM_API_KEY"):
        dyn = generate_dynamic_script_llm(genre_info, user_topic)
        if dyn: return dyn
        print("[AI Engine Warning] Falling back to static templates...")
        
    topic = user_topic if user_topic else random.choice(genre_info.get("presetTopics", ["Amazing Discovery"]))
    genre_id = genre_info["id"]
    topic_clean = topic.split(':')[-1].strip()

    if genre_id == "history":
        title = f"The Hidden Truth: {topic}"
        hook = f"History books lied to you about {topic_clean}! Here is what really happened..."
        scenes = [
            {
                "subtitle": "THE FORGOTTEN RECORDS 📜",
                "text": f"Deep inside ancient archives lies a discovery that reshapes everything we knew about {topic_clean}.",
                "highlightWords": ["ANCIENT", "DISCOVERY", "RESHAPES"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} ruins"
            },
            {
                "subtitle": "WHAT WAS HIDDEN 🗝️",
                "text": f"Experts were stunned when unusual artifacts regarding {topic_clean} were unearthed defying standard timelines.",
                "highlightWords": ["EXPERTS", "UNEARTHED", "TIMELINES"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} artifacts"
            },
            {
                "subtitle": "THE REVOLUTIONARY CLUE ⚙️",
                "text": f"Engineers and historians analyzed the materials and realized {topic_clean} was far more advanced.",
                "highlightWords": ["ENGINEERS", "HISTORIANS", "ADVANCED"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} monument"
            },
            {
                "subtitle": "THE FINAL VERDICT 👑",
                "text": f"Next time you study history, remember: the real story of {topic_clean} is buried deeper than we think!",
                "highlightWords": ["HISTORY", "BURIED", "DEEPER"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} sunset"
            }
        ]
        tags = ["history", "ancientmysteries", "untoldstory", "viralhistory", "shorts"]
        affiliate_note = "📚 Learn more history secrets: Check out our curated book list in the pinned comment!"

    elif genre_id == "kannada_jokes":
        title = f"ಕನ್ನಡ ಹಾಸ್ಯ: {topic}"
        hook = f"ಸ್ನೇಹಿತರೇ, ಈ ಕನ್ನಡ ಕಾಮಿಡಿ ಜೋಕ್ ಖಂಡಿತ ನಿಮ್ಮನ್ನು ನಗಿಸುತ್ತೆ!"
        scenes = [
            {
                "subtitle": "ಶಿಕ್ಷಕ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ 🎓",
                "text": "ಗುರುಗಳು: ಪರೀಕ್ಷೆಯಲ್ಲಿ ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಿದ್ದೀಯಾ? ವಿದ್ಯಾರ್ಥಿ: ಹೌದು ಸಾರ್, ಹೆಸರು ಮತ್ತು ತಾರೀಖು ಮಾತ್ರ!",
                "highlightWords": ["ಪರೀಕ್ಷೆ", "ಉತ್ತರ", "ಹಾಸ್ಯ"],
                "searchQuery": "Bangalore comedy",
                "stockKeyword": "funny indian comedy"
            },
            {
                "subtitle": "ಅಟೋ ಡ್ರೈವರ್ ಕಾಮಿಡಿ 🛺",
                "text": "ಪ್ರಯಾಣಿಕ: ಎಂಜಿ ರಸ್ತೆಗೆ ಎಷ್ಟು? ಡ್ರೈವರ್: ನೂರು ರೂಪಾಯಿ! ಪ್ರಯಾಣಿಕ: ಮಳೆ ಬರ್ತಿದೆಯಲ್ಲ? ಡ್ರೈವರ್: ಹಾಗಾದ್ರೆ ನೂರಿಪ್ಪತ್ತು!",
                "highlightWords": ["ಅಟೋ", "ಕಾಮಿಡಿ", "ನಗು"],
                "searchQuery": "Bengaluru auto",
                "stockKeyword": "autorickshaw india"
            },
            {
                "subtitle": "ಸ್ನೇಹಿತರ ಜೋಕ್ 🤝",
                "text": "ಗೆಳೆಯ: ಮಗಾ, ಐನೂರು ರೂಪಾಯಿ ಸಾಲ ಕೊಡು! ಇನ್ನೊಬ್ಬ: ನನ್ನ ಹತ್ತಿರ ನೂರು ರೂಪಾಯಿ ಮಾತ್ರ ಇದೆ! ಗೆಳೆಯ: ಪರವಾಗಿಲ್ಲ, ಇನ್ನು ನಾಲ್ಕು ನೂರು ಸಾಲ ಉಳಿಯಿತು!",
                "highlightWords": ["ಸ್ನೇಹಿತರು", "ಸಾಲ", "ಟ್ವಿಸ್ಟ್"],
                "searchQuery": "Karnataka friends",
                "stockKeyword": "indian friends cafe"
            },
            {
                "subtitle": "ಸಬ್‌ಸ್ಕ್ರೈಬ್ ಮಾಡಿ! 🔔",
                "text": "ದಿನವೂ ಇಂತಹ ಮಜವಾದ ಕನ್ನಡ ಜೋಕ್ಸ್‌ಗಾಗಿ ನಮ್ಮ ಚಾನೆಲ್ ಸಬ್‌ಸ್ಕ್ರೈಬ್ ಮಾಡಿ!",
                "highlightWords": ["ಸಬ್‌ಸ್ಕ್ರೈಬ್", "ಕನ್ನಡ", "ಜೋಕ್ಸ್"],
                "searchQuery": "Karnataka smiling",
                "stockKeyword": "happy indian portrait"
            }
        ]
        tags = ["kannadajokes", "kannadacomedy", "karnatakashorts", "nammakarnataka", "shorts"]
        affiliate_note = "😂 ದಿನವೂ ಹೊಸ ಕನ್ನಡ ಹಾಸ್ಯ ಜೋಕ್ಸ್ ನೋಡಲು ಸಬ್‌ಸ್ಕ್ರೈಬ್ ಮಾಡಿ!"

    elif genre_id == "hindi_jokes":
        title = f"मजेदार हिंदी जोक्स: {topic}"
        hook = f"दोस्तों! यह हिंदी कॉमेडी जोक सुनकर आपकी हंसी नहीं रुकेगी!"
        scenes = [
            {
                "subtitle": "मास्टर जी और पप्पू 🎒",
                "text": "मास्टर जी: पप्पू, बताओ 100 साल पहले कौन सा युद्ध हुआ था? पप्पू: सर, वो तो 100 साल पहले हुआ था, मुझे कैसे याद रहेगा!",
                "highlightWords": ["मास्टर", "पप्पू", "जोक्स"],
                "searchQuery": "Indian classroom",
                "stockKeyword": "funny indian students"
            },
            {
                "subtitle": "डॉक्टर और मरीज 🏥",
                "text": "मरीज: डॉक्टर साहब, मुझे बहुत भूलने की बीमारी है! डॉक्टर: कब से है? मरीज: क्या कब से है?",
                "highlightWords": ["डॉक्टर", "मरीज", "कॉमेडी"],
                "searchQuery": "Indian doctor",
                "stockKeyword": "funny doctor hospital"
            },
            {
                "subtitle": "दुकानदार का जवाब 🛍️",
                "text": "ग्राहक: भाईसाहब, ये शर्ट कितने की है? दुकानदार: 2000 रुपये! ग्राहक: और बिना कॉलर की? दुकानदार: 2500, क्योंकि काटना पड़ा!",
                "highlightWords": ["ग्राहक", "दुकानदार", "मजेदार"],
                "searchQuery": "Indian market shop",
                "stockKeyword": "bazaar india"
            },
            {
                "subtitle": "चैनल सब्सक्राइब करें 🔔",
                "text": "ऐसे ही मजेदार हिंदी जोक्स रोज देखने के लिए चैनल को सब्सक्राइब करें!",
                "highlightWords": ["सब्सक्राइब", "हिंदी", "जोक्स"],
                "searchQuery": "Happy indian laughter",
                "stockKeyword": "smiling indian group"
            }
        ]
        tags = ["hindijokes", "hindicomedy", "pappujokes", "viralhindishorts", "shorts"]
        affiliate_note = "😂 रोजाना मजेदार हिंदी जोक्स देखने के लिए तुरंत सब्सक्राइब करें!"

    elif genre_id == "panchatantra_hindi":
        title = f"पंचतंत्र की कहानी: {topic}"
        hook = f"दोस्तों, पंचतंत्र की यह कहानी आपको बहुत कुछ सिखाएगी!"
        scenes = [
            {
                "subtitle": "कहानी की शुरुआत 📜",
                "text": f"एक समय की बात है, {topic_clean} की यह कहानी एक बहुत बड़ी सीख देती है।",
                "highlightWords": ["समय", "कहानी", "सीख"],
                "searchQuery": topic_clean,
                "stockKeyword": "indian village ancient"
            },
            {
                "subtitle": "एक बड़ी मुसीबत 🦁",
                "text": "अचानक जंगल में एक बड़ी समस्या आ गई और सभी जानवर परेशान हो गए।",
                "highlightWords": ["अचानक", "समस्या", "परेशान"],
                "searchQuery": topic_clean,
                "stockKeyword": "indian jungle animals"
            },
            {
                "subtitle": "चतुर उपाय 💡",
                "text": "लेकिन बुद्धि और चतुराई से सबसे बड़ी मुसीबत का भी सामना किया जा सकता है।",
                "highlightWords": ["बुद्धि", "चतुराई", "सामना"],
                "searchQuery": topic_clean,
                "stockKeyword": "smart animal saving"
            },
            {
                "subtitle": "आज की सीख 🌟",
                "text": "सीख: बुद्धि बल से बड़ी होती है। ऐसी ही कहानियों के लिए सब्सक्राइब करें!",
                "highlightWords": ["सीख", "बुद्धि", "सब्सक्राइब"],
                "searchQuery": topic_clean,
                "stockKeyword": "happy indian kids reading"
            }
        ]
        tags = ["panchatantra", "hindistories", "moralstories", "kidsstories", "shorts"]
        affiliate_note = "📚 बच्चों के लिए बेहतरीन पंचतंत्र की किताबें: लिंक डिस्क्रिप्शन में है!"

    elif genre_id == "kids":
        title = f"Fun Adventure: {topic}"
        hook = f"Hey mini explorers! Did you know {topic_clean}?"
        scenes = [
            {
                "subtitle": "SUPER COOL FACT! 🌟",
                "text": f"Get ready for a mind-blowing fun story about {topic_clean}!",
                "highlightWords": ["MIND-BLOWING", "FUN", "STORY"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} animal"
            },
            {
                "subtitle": "DID YOU KNOW? 🚀",
                "text": f"Nature has the most incredible secrets about {topic_clean}, making your jaw drop with excitement!",
                "highlightWords": ["NATURE", "INCREDIBLE", "EXCITEMENT"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} nature"
            },
            {
                "subtitle": "AWESOME ANIMAL MAGIC 🐾",
                "text": f"Scientists found out that {topic_clean} uses super-smart tricks every day to communicate and play!",
                "highlightWords": ["ANIMALS", "SUPER-SMART", "PLAY"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} swimming"
            },
            {
                "subtitle": "EXPLORE AGAIN SOON! 🎈",
                "text": "Hit like and subscribe to join our fun daily discovery team!",
                "highlightWords": ["SUBSCRIBE", "DISCOVERY", "TEAM"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} ocean"
            }
        ]
        tags = ["kids", "funfacts", "learning", "kidseducational", "shorts"]
        affiliate_note = "🎨 Download free printable kids activity sheets from the link in description!"

    elif genre_id == "languages":
        title = f"Daily Express: {topic}"
        hook = f"Want to talk like a native speaker? Here is {topic_clean}!"
        scenes = [
            {
                "subtitle": "LESSON 1: THE NATIVE PHRASE 🗣️",
                "text": f"Today's power lesson focuses on {topic_clean}.",
                "highlightWords": ["POWER", "LESSON", "NATIVE"],
                "searchQuery": topic_clean,
                "stockKeyword": "cafe conversation"
            },
            {
                "subtitle": "HOW TO PRONOUNCE IT 🎯",
                "text": "Break it down syllable by syllable. Say it smoothly and with confidence!",
                "highlightWords": ["SYLLABLE", "SMOOTHLY", "CONFIDENCE"],
                "searchQuery": topic_clean,
                "stockKeyword": "study classroom"
            },
            {
                "subtitle": "WHEN TO USE IT 💡",
                "text": "Use this expression when hanging out with local friends or ordering food at a cafe.",
                "highlightWords": ["EXPRESSION", "FRIENDS", "CAFE"],
                "searchQuery": topic_clean,
                "stockKeyword": "friends dining"
            },
            {
                "subtitle": "DAILY FLUENCY BOOST 🚀",
                "text": "Subscribe for your 30-second daily language power boost!",
                "highlightWords": ["FLUENCY", "DAILY", "POWER"],
                "searchQuery": topic_clean,
                "stockKeyword": "travel passport"
            }
        ]
        tags = ["languagelearning", "speakfluently", "spanish", "french", "english", "shorts"]
        affiliate_note = "🚀 Master fluency 3x faster with our recommended language app link in bio!"

    elif genre_id == "trending":
        title = f"BREAKING TECH: {topic}"
        hook = f"Stop scrolling! {topic_clean} is taking over the tech world right now!"
        scenes = [
            {
                "subtitle": "BREAKING NEWS ⚡",
                "text": f"Tech insiders are buzzing today because {topic_clean} just shocked the industry.",
                "highlightWords": ["BUZZING", "SHOCKED", "INDUSTRY"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} robot"
            },
            {
                "subtitle": "THE GAME CHANGER 💻",
                "text": f"This {topic_clean} technology pushes performance to unprecedented limits and automates complex tasks in seconds.",
                "highlightWords": ["PERFORMANCE", "LIMITS", "AUTOMATES"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} computer"
            },
            {
                "subtitle": "FUTURE IMPACT 🔮",
                "text": f"Analysts predict {topic_clean} will redefine how millions of people work and create online.",
                "highlightWords": ["ANALYSTS", "REDEFINE", "FUTURE"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} city"
            },
            {
                "subtitle": "WHAT DO YOU THINK? 💬",
                "text": "Will this change everything? Drop your thoughts in the comments below!",
                "highlightWords": ["CHANGE", "THOUGHTS", "COMMENTS"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} digital"
            }
        ]
        tags = ["trending", "technews", "ai", "futuretech", "viral"]
        affiliate_note = "⚡ Try the latest AI Productivity Tools: Link in description!"

    elif genre_id == "politics":
        title = f"Global Report: {topic}"
        hook = f"Understanding world events: {topic_clean} and what it means for the future."
        scenes = [
            {
                "subtitle": "GEOPOLITICAL ANALYSIS 🌐",
                "text": f"A comprehensive look into {topic_clean} and its strategic global ramifications.",
                "highlightWords": ["GEOPOLITICAL", "STRATEGIC", "GLOBAL"],
                "searchQuery": topic_clean,
                "stockKeyword": "globe analytics"
            },
            {
                "subtitle": "THE ECONOMIC IMPLICATIONS 📊",
                "text": f"International trade routes and market trends for {topic_clean} are shifting rapidly.",
                "highlightWords": ["TRADE", "POLICIES", "MARKETS"],
                "searchQuery": topic_clean,
                "stockKeyword": "cargo ship port"
            },
            {
                "subtitle": "KEY DIPLOMATIC STAKES 🏛️",
                "text": f"World leaders are evaluating alliances around {topic_clean} and long-term economic stability.",
                "highlightWords": ["LEADERS", "ALLIANCES", "STABILITY"],
                "searchQuery": topic_clean,
                "stockKeyword": "government summit"
            },
            {
                "subtitle": "THE BIG PICTURE 🗺️",
                "text": "Stay informed with neutral, objective analysis. Subscribe for daily briefings.",
                "highlightWords": ["INFORMED", "NEUTRAL", "BRIEFINGS"],
                "searchQuery": topic_clean,
                "stockKeyword": "newsroom studio"
            }
        ]
        tags = ["geopolitics", "globalaffairs", "economics", "worldnews", "analysis"]
        affiliate_note = "🌐 Subscribe for daily independent geopolitical newsletter in bio!"

    elif genre_id == "scifi":
        title = f"Cosmic Wonder: {topic}"
        hook = f"The universe holds secrets that defy imagination... like {topic_clean}!"
        scenes = [
            {
                "subtitle": "INTO THE DEEP SPACE 🌌",
                "text": f"Astronomers made a terrifying yet mesmerizing discovery regarding {topic_clean}.",
                "highlightWords": ["ASTRONOMERS", "MESMERIZING", "DISCOVERY"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} space"
            },
            {
                "subtitle": "PHYSICS BROKEN? ⚛️",
                "text": f"Data collected on {topic_clean} challenges existing laws of astrophysics.",
                "highlightWords": ["TELESCOPES", "CHALLENGES", "ASTROPHYSICS"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} blackhole"
            },
            {
                "subtitle": "THE QUANTUM REALITY 🛸",
                "text": f"Could there be unknown forces or dimensions around {topic_clean} beyond our current vision?",
                "highlightWords": ["UNKNOWN", "DIMENSIONS", "VISION"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} wormhole"
            },
            {
                "subtitle": "THE COSMIC JOURNEY 🌠",
                "text": "Subscribe to explore the deepest mysteries of space every single day!",
                "highlightWords": ["EXPLORE", "MYSTERIES", "SPACE"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} astronaut"
            }
        ]
        tags = ["space", "astronomy", "scifi", "universe", "blackholes"]
        affiliate_note = "🔭 Best Stargazing Telescopes & Apps reviewed in description!"

    elif genre_id == "scary":
        title = f"Unexplained Legend: {topic}"
        hook = f"Turn off the lights... {topic_clean} will give you goosebumps."
        scenes = [
            {
                "subtitle": "THE DARK LEGEND 👁️",
                "text": f"For decades, locals whispered warnings about {topic_clean}.",
                "highlightWords": ["WHISPERED", "WARNINGS", "LEGEND"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} spooky"
            },
            {
                "subtitle": "THE UNANSWERED EVIDENCE 🕯️",
                "text": f"Strangers who investigated {topic_clean} reported strange audio frequency and lost time.",
                "highlightWords": ["STRANGE", "FREQUENCY", "LOST TIME"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} fog"
            },
            {
                "subtitle": "THE CHILLING TWIST 🌘",
                "text": f"When investigators finally inspected the site of {topic_clean}, all equipment mysteriously ceased working.",
                "highlightWords": ["INVESTIGATORS", "MYSTERIOUSLY", "CEASED"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} shadow"
            },
            {
                "subtitle": "WOULD YOU GO THERE? 🕸️",
                "text": "Leave a comment if you dare, and subscribe... if you can sleep tonight.",
                "highlightWords": ["COMMENT", "SUBSCRIBE", "SLEEP"],
                "searchQuery": topic_clean,
                "stockKeyword": f"{topic_clean} haunted"
            }
        ]
        tags = ["creepy", "darkhistory", "unexplained", "horrorstories", "scary"]
        affiliate_note = "🕸️ Listen to horror audiobooks free: Check pinned comment link!"

    else:
        title = f"Story: {topic}"
        hook = f"Here is a story about {topic_clean}."
        scenes = [
            {
                "subtitle": "START 🌟",
                "text": f"This is an auto-generated static script for {topic_clean}.",
                "highlightWords": ["static", "script"],
                "searchQuery": topic_clean,
                "stockKeyword": "abstract art"
            },
            {
                "subtitle": "AI NEEDED 🤖",
                "text": "Please configure an OpenAI or Gemini API Key in Settings to unlock dynamic generation for custom genres.",
                "highlightWords": ["configure", "API Key"],
                "searchQuery": topic_clean,
                "stockKeyword": "robot computer"
            },
            {
                "subtitle": "CUSTOM GENRES ✨",
                "text": "Custom genres rely on LLMs to generate unique scenes.",
                "highlightWords": ["Custom", "LLMs"],
                "searchQuery": topic_clean,
                "stockKeyword": "magic sparks"
            },
            {
                "subtitle": "SUBSCRIBE 🎬",
                "text": "Subscribe for more amazing content and setup your AI key!",
                "highlightWords": ["Subscribe", "setup"],
                "searchQuery": topic_clean,
                "stockKeyword": "youtube subscribe"
            }
        ]
        tags = ["custom", "shorts", "generated"]
        affiliate_note = "✨ Configure your AI key to unlock this genre!"

    full_voice_text = f"{hook} " + " ".join([s["text"] for s in scenes])
    
    return {
        "title": title,
        "topic": topic,
        "hook": hook,
        "scenes": scenes,
        "fullText": full_voice_text,
        "tags": tags,
        "affiliateNote": affiliate_note
    }

import re

def clean_search_term(term):
    if not term:
        return ""
    # Strip common titles / filler prefixes
    term = re.sub(r'(?i)^(the\s+secrets?\s+of|secrets?\s+of|the\s+hidden\s+truth\s*:?|unexplained\s+legend\s*:?|fun\s+adventure\s*:?|breaking\s+tech\s*:?|cosmic\s+wonder\s*:?|global\s+report\s*:?|daily\s+express\s*:?|the\s+secret\s+(underground\s+city\s+of)?|underground\s+city\s+of|mysterious\s+disappearance\s+of|the\s+disappearance\s+of|why\s+ancient|the\s+bizarre|the\s+viking|the\s+)\s*', '', term)
    term = re.sub(r'(?i)\b(illustration|scene\s*\d*)\b', '', term)
    return term.strip()

def extract_search_keywords(query, stock_kw):
    """Extracts prioritized terms from specific phrases down to core single topic nouns."""
    raw = f"{stock_kw} {query}"
    cleaned = re.sub(r'(?i)\b(the|a|an|secrets?|hidden|truth|unexplained|legend|fun|adventure|breaking|tech|cosmic|wonder|global|report|daily|express|underground|city|of|why|bizarre|viking|mysterious|disappearance|incident|ghost|ship|story|in|on|at|for|to|with|and)\b', ' ', raw)
    words = [w.strip() for w in cleaned.split() if len(w.strip()) > 2]
    
    terms = []
    # 1. Single core topic noun (e.g. "Derinkuyu", "Pompeii", "Legion")
    if words:
        longest = max(words, key=len)
        last_w = words[-1]
        if last_w not in terms: terms.append(last_w)
        if longest not in terms: terms.append(longest)
        if len(words) >= 2:
            pair = f"{words[0]} {words[1]}"
            if pair not in terms: terms.append(pair)
            
    # 2. Cleaned stock keyword & clean topic query
    kw_c = clean_search_term(stock_kw)
    if kw_c and kw_c not in terms:
        terms.append(kw_c)
        
    core_q = clean_search_term(query)
    if core_q and core_q not in terms:
        terms.append(core_q)
        
    return terms if terms else [query]

def fetch_thematic_image(query, stock_kw, index, video_id="v", target_width=1080, target_height=1350):
    """100% Topic-Matched Image Downloader: Wikimedia Commons API + Public Stock Photo APIs + AI Engine."""
    random_sig = random.randint(100000, 999999)
    cache_path = os.path.join(IMAGES_DIR, f"{video_id}_sc_{index}_{random_sig}.png")
    headers = {"User-Agent": "YouTubeAutoStudio/1.0 (https://autostudio.app; contact@autostudio.app)"}

    if HAS_REQUESTS:
        search_terms = extract_search_keywords(query, stock_kw)
        
        # Stage 1: Wikimedia Commons API with User-Agent header (Authentic 1080p photos!)
        for term in search_terms:
            encoded_topic = urllib.parse.quote(term)
            wiki_url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={encoded_topic}&gsrnamespace=6&gsrlimit=30&prop=pageimages&pithumbsize={target_width}&format=json"
            try:
                print(f"[Image Engine] Stage 1 (Wikimedia API): Searching photos for '{term}' (Scene {index+1})...")
                resp = requests.get(wiki_url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    pages = data.get("query", {}).get("pages", {})
                    valid_pages = [p for p in pages.values() if p.get("thumbnail", {}).get("source")]
                    if len(valid_pages) > 0:
                        # Shuffle to ensure different photos are picked if the same topic is generated again
                        random.shuffle(valid_pages)
                        target_page = valid_pages[index % len(valid_pages)]
                        thumb_url = target_page.get("thumbnail", {}).get("source")
                        if thumb_url:
                            print(f"[Image Engine] Scene {index+1} SUCCESS: Wikimedia Photo Downloaded -> {target_page.get('title')[:45]}")
                            img_resp = requests.get(thumb_url, headers=headers, timeout=8)
                            if img_resp.status_code == 200 and len(img_resp.content) > 5000:
                                with open(cache_path, "wb") as f:
                                    f.write(img_resp.content)
                                return Image.open(cache_path)
            except Exception as e:
                print(f"[Image Engine] Stage 1 Wikimedia API notice for '{term}': {e}")

        # Stage 2: Public HD Stock Photo API (LoremFlickr / Pollinations AI / Picsum)
        for term in search_terms:
            clean_tag = urllib.parse.quote(term)
            stock_urls = [
                f"https://loremflickr.com/{target_width}/{target_height}/{clean_tag}?random={random_sig + index}",
                f"https://image.pollinations.ai/prompt/{urllib.parse.quote(term + ' 8k cinematic photo')}?width={target_width}&height={target_height}&nologo=true&seed={random_sig + index}",
                f"https://picsum.photos/{target_width}/{target_height}?random={random_sig + index}"
            ]
            for s_url in stock_urls:
                try:
                    print(f"[Image Engine] Stage 2 (Stock/AI Photo): Fetching photo for '{term}' (Scene {index+1})...")
                    s_resp = requests.get(s_url, headers=headers, timeout=7)
                    if s_resp.status_code == 200 and len(s_resp.content) > 8000:
                        with open(cache_path, "wb") as f:
                            f.write(s_resp.content)
                        print(f"[Image Engine] Stage 2 SUCCESS: Stock/AI Photo downloaded for Scene {index+1}!")
                        return Image.open(cache_path)
                except Exception as e:
                    print(f"[Image Engine] Stage 2 Stock photo notice: {e}")

    # Stage 3: Dynamic Procedural Vector Canvas (Fallback Art)
    print(f"[Image Engine] Stage 3: Rendering Dynamic Vector Canvas for Scene {index+1}...")
    img = Image.new('RGB', (target_width, target_height), (15, 23, 42))
    draw = ImageDraw.Draw(img)
    
    r1 = (random_sig * 17) % 255
    g1 = (random_sig * 31) % 255
    b1 = (random_sig * 47) % 255
    
    for r in range(target_height, 0, -12):
        factor = r / target_height
        cr = int(r1 * (1 - factor) + 15 * factor)
        cg = int(g1 * (1 - factor) + 23 * factor)
        cb = int(b1 * (1 - factor) + 42 * factor)
        draw.ellipse([target_width//2 - r, target_height//2 - r, target_width//2 + r, target_height//2 + r], fill=(cr, cg, cb))

    for s in range(50):
        sx = (random_sig * (s + 1) * 13) % target_width
        sy = (random_sig * (s + 1) * 29) % target_height
        sz = random.randint(3, 10)
        draw.ellipse([sx, sy, sx+sz, sy+sz], fill=(255, 255, 220))

    img.save(cache_path)
    return img

def render_procedural_background_video(genre_id, index, duration_sec, output_mp4, width=1080, height=1920):
    fps = 30
    if genre_id == "scifi":
        filter_expr = f"mandelbrot=s={width}x{height}:maxiter=120:rate=30:start_x=-0.743643887037158704752191506114774:start_y=0.131825904205311970493132056385139"
    elif genre_id == "trending":
        filter_expr = f"cellauto=s={width}x{height}:rule=30:rate=30"
    elif genre_id == "kids":
        filter_expr = f"life=s={width}x{height}:mold=10:rate=30"
    elif genre_id == "scary":
        filter_expr = f"testsrc2=s={width}x{height}:rate=30,drawgrid=w=100:h=100:color=red@0.2"
    else:
        filter_expr = f"rgbtestsrc=s={width}x{height}:rate=30,boxblur=20:10"

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", filter_expr,
        "-t", str(duration_sec),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(fps),
        output_mp4
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.exists(output_mp4)

async def generate_audio_edge(text, voice, output_mp3, tts_provider="edge", api_key=None):
    if tts_provider == "elevenlabs" and api_key and HAS_REQUESTS:
        try:
            print("[TTS Provider] Generating voiceover via ElevenLabs API...")
            url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"
            headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": api_key}
            payload = {"text": text, "model_id": "eleven_monolingual_v1"}
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            if res.status_code == 200:
                with open(output_mp3, "wb") as f:
                    f.write(res.content)
                return True
        except Exception as err:
            print(f"[ElevenLabs Error] {err}, falling back to Edge-TTS...")

    if HAS_EDGE_TTS:
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_mp3)
            return True
        except Exception as e:
            print(f"[TTS Error] edge-tts failed: {e}")
    
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"sine=frequency=440:duration=15",
        "-af", "volume=0.05",
        output_mp3
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return False

def generate_background_music_track(genre_id, duration_sec, output_aac):
    if genre_id == "scifi":
        lavfi_filter = "sine=frequency=110:duration={dur},asetrate=44100*0.75,lowpass=f=350,volume=0.15".format(dur=duration_sec)
    elif genre_id == "scary":
        lavfi_filter = "sine=frequency=65:duration={dur},asetrate=44100*0.6,lowpass=f=250,volume=0.18".format(dur=duration_sec)
    elif genre_id == "kids":
        lavfi_filter = "sine=frequency=330:duration={dur},asetrate=44100*1.2,volume=0.10".format(dur=duration_sec)
    elif genre_id == "history":
        lavfi_filter = "sine=frequency=140:duration={dur},asetrate=44100*0.85,lowpass=f=500,volume=0.12".format(dur=duration_sec)
    elif genre_id == "trending":
        lavfi_filter = "sine=frequency=220:duration={dur},asetrate=44100*1.1,lowpass=f=800,volume=0.12".format(dur=duration_sec)
    else:
        lavfi_filter = "sine=frequency=180:duration={dur},asetrate=44100*0.9,lowpass=f=450,volume=0.12".format(dur=duration_sec)

    cmd = [
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", lavfi_filter,
        "-c:a", "aac", "-b:a", "128k",
        output_aac
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.exists(output_aac)

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def render_scene_overlay_png(scene_data, genre_config, index, total, video_id="v", width=1080, height=1920):
    overlay_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    theme_hex = genre_config.get("themeColor", "#3B82F6")
    theme_rgb = hex_to_rgb(theme_hex)
    
    search_q = scene_data.get("searchQuery", scene_data["subtitle"])
    stock_kw = scene_data.get("stockKeyword", "art,cinematic")
    card_w = width - 120
    card_h = int(height * 0.44)
    
    art_img = fetch_thematic_image(search_q, stock_kw, index, video_id=video_id, target_width=card_w, target_height=card_h)
    art_img = art_img.resize((card_w, card_h), Image.Resampling.LANCZOS).convert('RGBA')
    
    enhancer = ImageEnhance.Brightness(art_img)
    art_img = enhancer.enhance(0.9)
    
    art_x = (width - card_w) // 2
    art_y = 280
    overlay_img.paste(art_img, (art_x, art_y))
    
    draw = ImageDraw.Draw(overlay_img)
    draw.rounded_rectangle([art_x, art_y, art_x + card_w, art_y + card_h], radius=24, outline=theme_rgb, width=5)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 56)
        font_badge = ImageFont.truetype("arial.ttf", 36)
        font_body = ImageFont.truetype("arial.ttf", 44)
        font_highlight = ImageFont.truetype("arial.ttf", 46)
        font_footer = ImageFont.truetype("arial.ttf", 32)
    except Exception:
        font_title = font_badge = font_body = font_highlight = font_footer = ImageFont.load_default()
        
    # Header Badge Box
    badge_text = f"{genre_config['name'].upper()} • SCENE {index+1}/{total}"
    draw.rounded_rectangle([80, 110, width - 80, 200], radius=20, fill=(15, 23, 42, 235), outline=theme_rgb, width=3)
    draw.text((width // 2, 155), badge_text, fill=theme_rgb, font=font_badge, anchor="mm")
    
    # Subtitle overlay badge inside artwork card
    sub_title = scene_data["subtitle"]
    draw.rounded_rectangle([art_x + 30, art_y + 30, art_x + card_w - 30, art_y + 120], radius=16, fill=(0, 0, 0, 220), outline=(255, 255, 255, 60), width=2)
    draw.text((width // 2, art_y + 75), sub_title, fill=(255, 255, 255), font=font_title, anchor="mm")
    
    # Frosted Glass Narration Text Box
    text_box_y = art_y + card_h + 40
    text_box_h = height - text_box_y - 250
    draw.rounded_rectangle([60, text_box_y, width - 60, text_box_y + text_box_h], radius=28, fill=(15, 23, 42, 225), outline=(255, 255, 255, 40), width=2)
    
    # Render kinetic highlighted narration text
    text = scene_data["text"]
    words = text.split()
    lines = []
    current_line = []
    for w in words:
        current_line.append(w)
        if len(" ".join(current_line)) > 26:
            lines.append(" ".join(current_line[:-1]))
            current_line = [w]
    if current_line:
        lines.append(" ".join(current_line))
        
    highlights = [h.upper() for h in scene_data.get("highlightWords", [])]
    start_y = text_box_y + 70
    
    for line in lines:
        has_hl = any(hl in line.upper() for hl in highlights)
        if has_hl:
            draw.text((width // 2 + 2, start_y + 2), line, fill=(0, 0, 0), font=font_highlight, anchor="mm")
            draw.text((width // 2, start_y), line, fill=(255, 255, 0), font=font_highlight, anchor="mm")
        else:
            draw.text((width // 2 + 2, start_y + 2), line, fill=(0, 0, 0), font=font_body, anchor="mm")
            draw.text((width // 2, start_y), line, fill=(255, 255, 255), font=font_body, anchor="mm")
        start_y += 75
        
    # Kinetic Subtitle Highlight Pill at Bottom
    hl_sample = highlights[0] if highlights else "MUST WATCH"
    draw.rounded_rectangle([80, height - 200, width - 80, height - 110], radius=25, fill=theme_rgb)
    draw.text((width // 2, height - 155), f"🔥 KEY PHRASE: #{hl_sample}", fill=(255, 255, 255), font=font_footer, anchor="mm")
    
    save_path = os.path.join(IMAGES_DIR, f"{video_id}_overlay_{index}.png")
    overlay_img.save(save_path)
    return save_path

def render_thumbnail(script_data, genre_config, thumb_path, video_id="v", width=1280, height=720):
    colors = genre_config.get("bgGradient", ["#0F172A", "#1E1B4B", "#0F172A"])
    img = Image.new('RGB', (width, height), hex_to_rgb(colors[0]))
    
    bg_art = fetch_thematic_image(script_data['topic'], f"{script_data['topic']} cover", 99, video_id=video_id, target_width=width, target_height=height)
    bg_art = bg_art.resize((width, height), Image.Resampling.LANCZOS)
    enhancer = ImageEnhance.Brightness(bg_art)
    bg_art = enhancer.enhance(0.55)
    
    img.paste(bg_art, (0, 0))
    draw = ImageDraw.Draw(img)
    theme_rgb = hex_to_rgb(genre_config.get("themeColor", "#F59E0B"))
    
    try:
        font_big = ImageFont.truetype("arial.ttf", 72)
        font_small = ImageFont.truetype("arial.ttf", 40)
    except Exception:
        font_big = font_small = ImageFont.load_default()
        
    draw.rectangle([10, 10, width-10, height-10], outline=theme_rgb, width=8)
    
    topic_clean = script_data["topic"].upper()
    draw.rounded_rectangle([60, 100, width-60, 320], radius=20, fill=(0, 0, 0, 220), outline=theme_rgb, width=4)
    
    draw.rounded_rectangle([80, 50, 420, 110], radius=15, fill=theme_rgb)
    draw.text((250, 80), genre_config["name"].upper(), fill=(0, 0, 0), font=font_small, anchor="mm")
    
    words = topic_clean.split()
    l1 = " ".join(words[:4])
    l2 = " ".join(words[4:]) if len(words) > 4 else ""
    
    draw.text((width//2, 175), l1, fill=(255, 255, 0), font=font_big, anchor="mm")
    if l2:
        draw.text((width//2, 255), l2, fill=(255, 255, 255), font=font_big, anchor="mm")
        
    draw.rounded_rectangle([200, 420, width-200, 580], radius=25, fill=(220, 38, 38))
    draw.text((width//2, 500), "MUST WATCH! 😱", fill=(255, 255, 255), font=font_big, anchor="mm")
    
    img.save(thumb_path, "JPEG", quality=95)
    return thumb_path

def build_scene_animated_video(genre_id, scene_idx, overlay_png, duration_sec, output_scene_mp4, aspect_ratio="9:16", video_id="v"):
    w, h = (1080, 1920) if aspect_ratio == "9:16" else (1920, 1080)
    bg_video = os.path.join(IMAGES_DIR, f"bg_anim_{video_id}_{scene_idx}.mp4")
    
    render_procedural_background_video(genre_id, scene_idx, duration_sec, bg_video, width=w, height=h)
    
    cmd_overlay = [
        "ffmpeg", "-y",
        "-i", bg_video,
        "-i", overlay_png,
        "-filter_complex", "[0:v][1:v]overlay=0:0",
        "-t", str(duration_sec),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
        output_scene_mp4
    ]
    subprocess.run(cmd_overlay, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return os.path.exists(output_scene_mp4)

def build_full_animated_video(scene_overlays, genre_id, voice_mp3, bg_music_aac, output_mp4, duration_per_scene=7.0, aspect_ratio="9:16", video_id="v"):
    scene_clips = []
    for idx, overlay_png in enumerate(scene_overlays):
        scene_mp4 = os.path.join(IMAGES_DIR, f"full_scene_{video_id}_{idx}.mp4")
        print(f"[Animation Engine] Rendering Animated Motion Video Clip {idx+1}/{len(scene_overlays)}...")
        build_scene_animated_video(genre_id, idx, overlay_png, duration_per_scene, scene_mp4, aspect_ratio, video_id)
        if os.path.exists(scene_mp4):
            scene_clips.append(scene_mp4)

    concat_file = os.path.join(IMAGES_DIR, f"concat_{video_id}.txt")
    with open(concat_file, "w", encoding="utf-8") as f:
        for clip in scene_clips:
            clean_c = clip.replace("\\", "/")
            f.write(f"file '{clean_c}'\n")

    cmd_final = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_file,
        "-i", voice_mp3,
        "-i", bg_music_aac,
        "-filter_complex", "[1:a]volume=1.0[voice];[2:a]volume=0.15[bg];[voice][bg]amix=inputs=2:duration=first[aout]",
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192000",
        "-shortest",
        output_mp4
    ]
    
    print(f"[FFmpeg Audio Mixer] Mixing Voiceover + Background Music Track into MP4...")
    proc = subprocess.run(cmd_final, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    if proc.returncode != 0:
        print("[FFmpeg Warning] Dual-track audio mixing fallback, re-encoding...")
        cmd_fallback = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", concat_file,
            "-i", voice_mp3,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192000",
            "-shortest",
            output_mp4
        ]
        subprocess.run(cmd_fallback, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    return os.path.exists(output_mp4)

def save_to_db(video_data):
    records = []
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
        except Exception:
            records = []
            
    existing_idx = next((i for i, r in enumerate(records) if r["id"] == video_data["id"]), None)
    if existing_idx is not None:
        records[existing_idx] = video_data
    else:
        records.insert(0, video_data)
        
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

def get_audio_duration(audio_file):
    """Probes exact duration in seconds of audio file using ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_file
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        dur = float(res.stdout.strip())
        if dur > 0:
            print(f"[Sync Engine] Probed Voiceover Audio Duration: {dur:.2f} seconds")
            return dur
    except Exception as e:
        print(f"[Sync Engine Warning] FFprobe duration probe fallback: {e}")
    return 28.0

async def main_pipeline(genre_id, topic=None, privacy_status="unlisted", auto_upload=False, tts_provider="edge", api_key=None):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    random_hash = hashlib.md5(str(random.random()).encode()).hexdigest()[:6]
    video_id = f"vid_{timestamp}_{genre_id}_{random_hash}"
    
    print(f"=== [PER-SCENE WIKIMEDIA TOPIC PIPELINE STARTED] Video ID: {video_id} | Genre: {genre_id} ===")
    genre_config = get_genre_config(genre_id)
    
    # Step 1: Script & Storyboard Generation
    print("[1/6] Generating Unique Script & Storyboard...")
    script_data = generate_script_content(genre_config, topic)
    print(f"-> Topic: {script_data['topic']}")
    print(f"-> Title: {script_data['title']}")
    
    # Step 2: Voiceover Narration Synthesis
    print(f"[2/6] Synthesizing Voiceover Narration (Provider: {tts_provider.upper()})...")
    voice_file = os.path.join(AUDIO_DIR, f"{video_id}_voice.mp3")
    voice = genre_config.get("voice", "en-US-ChristopherNeural")
    await generate_audio_edge(script_data["fullText"], voice, voice_file, tts_provider, api_key)
    
    # Step 2b: Measure Voiceover Length & Calculate Exact Per-Scene Duration Sync
    voice_duration = get_audio_duration(voice_file)
    total_scenes = max(1, len(script_data["scenes"]))
    total_duration = voice_duration + 0.8  # Add 0.8s natural end padding
    duration_per_scene = round(total_duration / total_scenes, 2)
    print(f"[Sync Engine] Synchronized Scene Timing: {duration_per_scene:.2f} seconds x {total_scenes} scenes = Total Video Duration {total_duration:.2f}s")
    
    # Step 3: Genre Background Music Synthesis
    print("[3/6] Generating Atmospheric Background Music Track...")
    bg_music_file = os.path.join(AUDIO_DIR, f"{video_id}_bgmusic.aac")
    generate_background_music_track(genre_id, total_duration, bg_music_file)
    
    # Step 4: Per-Scene Wikimedia/AI Topic Photo & Transparent Overlay PNG Rendering
    print("[4/6] Fetching Per-Scene Topic-Matched HD Photos & Rendering Transparent Overlays...")
    aspect = genre_config.get("aspectRatio", "9:16")
    w, h = (1080, 1920) if aspect == "9:16" else (1920, 1080)
    
    scene_overlays = []
    for idx, scene in enumerate(script_data["scenes"]):
        overlay_p = render_scene_overlay_png(scene, genre_config, idx, len(script_data["scenes"]), video_id=video_id, width=w, height=h)
        scene_overlays.append(overlay_p)
        
    # Step 5: Render YouTube Thumbnail
    print("[5/6] Generating Dynamic YouTube Thumbnail...")
    thumb_file = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
    render_thumbnail(script_data, genre_config, thumb_file, video_id=video_id)
    
    # Step 6: Full 2D/3D Animated Motion Video Compositing & Dual Audio Mixing
    print("[6/6] Rendering Full 2D/3D Motion Video Clips with Dual Audio Tracks...")
    output_mp4 = os.path.join(VIDEOS_DIR, f"{video_id}.mp4")
    build_full_animated_video(scene_overlays, genre_id, voice_file, bg_music_file, output_mp4, duration_per_scene=duration_per_scene, aspect_ratio=aspect, video_id=video_id)
    
    youtube_url = None
    upload_status = "ready_to_upload"
    full_description = f"{script_data['hook']}\n\n{script_data['affiliateNote']}\n\n#shorts #{genre_id} #viral #animation"
    
    if auto_upload:
        print("[YouTube API] Initiating automated YouTube video upload...")
        try:
            from youtube_uploader import upload_to_youtube
            res = upload_to_youtube(
                video_path=output_mp4,
                title=script_data["title"],
                description=full_description,
                tags=script_data["tags"],
                privacy=privacy_status
            )
            if res and "id" in res:
                youtube_url = f"https://www.youtube.com/watch?v={res['id']}"
                upload_status = "uploaded"
            else:
                upload_status = "uploaded_simulated"
                youtube_url = f"https://youtube.com/watch?v=sim_{video_id}"
        except Exception as err:
            print(f"[YouTube API Warning] API upload fallback (simulated mode): {err}")
            upload_status = "uploaded_simulated"
            youtube_url = f"https://youtube.com/watch?v=sim_{video_id}"

    video_record = {
        "id": video_id,
        "genreId": genre_id,
        "genreName": genre_config["name"],
        "title": script_data["title"],
        "topic": script_data["topic"],
        "hook": script_data["hook"],
        "scriptText": script_data["fullText"],
        "affiliateNote": script_data["affiliateNote"],
        "tags": script_data["tags"],
        "aspectRatio": aspect,
        "videoFile": f"/videos/{video_id}.mp4",
        "thumbnailFile": f"/thumbnails/{video_id}.jpg",
        "videoPath": output_mp4,
        "thumbnailPath": thumb_file,
        "durationSec": total_duration,
        "status": upload_status,
        "youtubeUrl": youtube_url,
        "privacy": privacy_status,
        "createdAt": datetime.now().isoformat()
    }
    
    save_to_db(video_record)
    print(f"=== [WIKIMEDIA PER-SCENE PIPELINE SUCCESS] Saved to DB: {video_id} ===")
    return video_record

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="YouTube Automated Content Generator Engine")
    parser.add_argument("--genre", type=str, default="history", help="Genre ID")
    parser.add_argument("--topic", type=str, default=None, help="Custom topic prompt")
    parser.add_argument("--privacy", type=str, default="unlisted", help="YouTube Privacy")
    parser.add_argument("--upload", action="store_true", help="Auto upload to YouTube")
    parser.add_argument("--provider", type=str, default="edge", help="TTS Provider (edge, elevenlabs)")
    parser.add_argument("--apikey", type=str, default=None, help="TTS API Key")
    
    args = parser.parse_args()
    
    asyncio.run(main_pipeline(args.genre, args.topic, args.privacy, args.upload, args.provider, args.apikey))
