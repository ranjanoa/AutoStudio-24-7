import os
import sys
import json
import time
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

try:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    HAS_GOOGLE_API = True
except ImportError:
    HAS_GOOGLE_API = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_PATH = os.path.join(BASE_DIR, "client_secrets.json")
TOKEN_PATH = os.path.join(BASE_DIR, "token.json")
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]

def get_authenticated_service():
    if not HAS_GOOGLE_API:
        print("[YouTube Uploader] google-api-python-client not installed.")
        return None

    creds = None
    if os.path.exists(TOKEN_PATH):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        except Exception as e:
            print(f"[YouTube Uploader] Error reading token.json: {e}")

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[YouTube Uploader] Refresh token failed: {e}")
                creds = None

        if not creds and os.path.exists(CREDENTIALS_PATH):
            try:
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
                creds = flow.run_local_server(port=0)
                with open(TOKEN_PATH, "w", encoding="utf-8") as token_file:
                    token_file.write(creds.to_json())
            except Exception as e:
                print(f"[YouTube Uploader] OAuth Flow error: {e}")
                return None

    if creds and creds.valid:
        return build("youtube", "v3", credentials=creds)
    return None

def upload_to_youtube(video_path, title, description, tags, category_id="27", privacy="unlisted"):
    """Uploads MP4 video file directly to YouTube using YouTube Data API v3."""
    print(f"[YouTube Uploader] Preparing upload for file: {video_path}")
    
    youtube = get_authenticated_service()
    if not youtube:
        print("[YouTube Uploader] OAuth Credentials missing or unauthenticated. Operating in Simulated Upload Mode.")
        sim_id = f"sim_{int(time.time())}"
        return {
            "id": sim_id,
            "status": "simulated",
            "url": f"https://youtube.com/watch?v={sim_id}",
            "message": "Video rendered and queued for YouTube upload. Add client_secrets.json to enable live channel uploads!"
        }

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags,
            "categoryId": category_id
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(video_path, chunksize=-1, resumable=True, mimetype="video/mp4")
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"[YouTube Upload Progress] {int(status.progress() * 100)}%")

    print(f"[YouTube Upload Success] Video ID: {response.get('id')}")
    return response

if __name__ == "__main__":
    if len(sys.argv) > 1:
        vid_p = sys.argv[1]
        res = upload_to_youtube(vid_p, "Test Upload", "Automated Video Upload", ["test"], privacy="unlisted")
        print("Upload Result:", json.dumps(res, indent=2))
    else:
        print("Usage: python youtube_uploader.py <path_to_video.mp4>")
