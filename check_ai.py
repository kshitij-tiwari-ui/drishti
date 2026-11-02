"""Run:  python check_ai.py     Tests your AI setup and prints the exact problem (never prints your key)."""
import logging, os, sys
logging.basicConfig(level=logging.WARNING, format="  detail: %(message)s")
try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    print("python-dotenv missing: run  pip install -r requirements.txt"); sys.exit(1)
from PIL import Image, ImageDraw
from services import vision_service as v

print(".env file found:", os.path.exists(".env"))
key = os.getenv("GEMINI_API_KEY", "").strip()
print("GEMINI_API_KEY set:", bool(key), "| starts with:", key[:2] or "-", "| length:", len(key))
print("Model:", os.getenv("GEMINI_MODEL", v.DEFAULT_MODEL))
print("google-genai SDK installed:", v._sdk_available())
p = v.get_provider()
if not p:
    print("RESULT: no key loaded. Create a file named .env (not .env.example) containing GEMINI_API_KEY=..."); sys.exit(1)
img = Image.new("RGB", (500, 160), "white"); ImageDraw.Draw(img).text((20, 60), "Class at 9:00 AM, Room 204", fill="black")
try:
    out = p.analyze(img, "Class at 9:00 AM, Room 204")
    print("RESULT: AI is working. Sample answer:", out.get("description", out))
except v.VisionError as e:
    print("RESULT: FAILED -", e)
