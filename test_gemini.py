import os
import requests
import json

api_key = None
with open(".env", "r") as f:
    for line in f:
        if line.startswith("LLM_API_KEY="):
            api_key = line.strip().split("=")[1]
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
res = requests.get(url, timeout=10)
if res.status_code == 200:
    data = res.json()
    veo_models = [m["name"] for m in data.get("models", []) if "veo" in m["name"].lower()]
    print("Veo Models:", veo_models)
else:
    print(f"Failed to list models: {res.status_code} | {res.text}")
