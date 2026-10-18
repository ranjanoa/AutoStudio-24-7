import os
import sys
import json
import time
import subprocess
import warnings
import wsgiref.simple_server
from wsgiref.simple_server import WSGIRequestHandler
warnings.filterwarnings("ignore")

try:
    from googleapiclient.discovery import build
    from google_auth_oauthlib.flow import InstalledAppFlow, _RedirectWSGIApp
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
except ImportError as e:
    print(f"Error: Required Google libraries not found: {e}", flush=True)
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_PATH = os.path.join(BASE_DIR, "client_secrets.json")
TOKEN_PATH = os.path.join(BASE_DIR, "token.json")
URL_FILE = os.path.join(BASE_DIR, "storage", "oauth_url.txt")
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
]

class SilentHandler(WSGIRequestHandler):
    def log_message(self, format, *args):
        pass

def check_token_status():
    if not os.path.exists(CREDENTIALS_PATH):
        return {"status": "missing_secrets", "message": "client_secrets.json not found."}
    
    if not os.path.exists(TOKEN_PATH):
        return {"status": "missing_token", "message": "token.json not found. Re-authorization required."}
    
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        if creds.valid:
            return {"status": "valid", "message": "OAuth token is active and valid."}
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(TOKEN_PATH, "w", encoding="utf-8") as f:
                    f.write(creds.to_json())
                return {"status": "valid", "message": "OAuth token refreshed successfully."}
            except Exception as e:
                return {"status": "expired", "message": f"Refresh token failed: {e}"}
        return {"status": "invalid", "message": "Token invalid or expired."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def authenticate(port=8090):
    if not os.path.exists(CREDENTIALS_PATH):
        print(f"[Auth Error] {CREDENTIALS_PATH} not found.", flush=True)
        return False

    success_html = """
    <html>
      <head>
        <title>YouTube Connected - AutoStudio 24/7</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1E293B; padding: 2.5rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 450px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h2 { color: #34D399; margin-top: 0; }
          p { color: #94A3B8; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>&#10004; YouTube Connected Successfully!</h2>
          <p>Your YouTube Channel authorization has been renewed. You can now close this tab and return to AutoStudio 24/7.</p>
        </div>
      </body>
    </html>
    """

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
    wsgi_app = _RedirectWSGIApp(success_html)

    # Bind to port
    local_server = None
    actual_port = port
    for p in [port, 8091, 8092, 0]:
        try:
            local_server = wsgiref.simple_server.make_server('localhost', p, wsgi_app, handler_class=SilentHandler)
            actual_port = local_server.server_port
            break
        except Exception:
            continue

    if not local_server:
        print("[Auth Error] Could not bind local HTTP server for OAuth callback.", flush=True)
        return False

    try:
        flow.redirect_uri = f"http://localhost:{actual_port}/"
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")

        # Save auth URL to file
        os.makedirs(os.path.dirname(URL_FILE), exist_ok=True)
        with open(URL_FILE, "w", encoding="utf-8") as f:
            f.write(auth_url)

        print("\n" + "="*80, flush=True)
        print("GOOGLE_AUTH_URL_START", flush=True)
        print(auth_url, flush=True)
        print("GOOGLE_AUTH_URL_END", flush=True)
        print("="*80 + "\n", flush=True)

        # Trigger Windows default browser launch
        try:
            subprocess.Popen(f'start "" "{auth_url}"', shell=True)
        except Exception as e:
            pass

        print(f"Waiting for authorization callback on http://localhost:{actual_port}/...", flush=True)
        local_server.timeout = 300 # 5 minutes timeout
        local_server.handle_request()

        try:
            response_uri = wsgi_app.last_request_uri.replace("http:", "https:")
        except Exception as e:
            print("[Auth Error] Timed out waiting for browser login response.", flush=True)
            return False

        flow.fetch_token(authorization_response=response_uri)
        creds = flow.credentials

        with open(TOKEN_PATH, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

        # Clean up URL file
        try:
            if os.path.exists(URL_FILE):
                os.remove(URL_FILE)
        except Exception:
            pass

        print("\n[Success] YouTube OAuth token renewed successfully!", flush=True)

        try:
            youtube = build("youtube", "v3", credentials=creds)
            resp = youtube.channels().list(part="snippet", mine=True).execute()
            items = resp.get("items", [])
            if items:
                ch_title = items[0]["snippet"]["title"]
                print(f"[Success] Connected to Channel: '{ch_title}'", flush=True)
        except Exception as err:
            pass

        return True

    finally:
        try:
            local_server.server_close()
        except Exception:
            pass

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        print(json.dumps(check_token_status()), flush=True)
    else:
        success = authenticate()
        sys.exit(0 if success else 1)
