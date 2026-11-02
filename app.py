"""Drishti backend: Flask + Tesseract OCR + optional AI vision."""
import io
import os

from flask import Flask, jsonify, render_template, request
from PIL import Image, UnidentifiedImageError

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass

from services import ocr_service, summary_service, vision_service

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}

app = Flask(__name__)  # serves only /static and templates/, never project files
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024 + 4096
Image.MAX_IMAGE_PIXELS = 40_000_000
ocr_service.configure()


def error(msg, code):
    return jsonify({"error": msg}), code


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "ai_configured": vision_service.get_provider() is not None})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    file = request.files.get("image")
    if file is None or not file.filename:
        return error("No image was uploaded. Please choose an image.", 400)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        return error("Unsupported file type. Please upload a PNG, JPG or WEBP image.", 415)

    data = file.read()
    if len(data) > 10 * 1024 * 1024:
        return error("Image is too large. Maximum size is 10 MB.", 413)
    try:  # check the real content, not the filename; nothing is saved to disk
        Image.open(io.BytesIO(data)).verify()
        img = Image.open(io.BytesIO(data))
        if img.format not in ALLOWED_FORMATS:
            return error("This file is not a valid PNG, JPG or WEBP image.", 415)
        img.load()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError):
        return error("This file could not be read as an image. Please try another one.", 400)

    ocr = ocr_service.extract_text(img)
    provider = vision_service.get_provider()
    ai, ai_error = None, None
    if provider:
        try:
            ai = provider.analyze(img, ocr["text"])
        except vision_service.VisionError as e:
            ai_error = str(e) + (f" (Google said: {e.detail})" if e.detail else "")
            key = getattr(provider, "api_key", "")
            if key:
                ai_error = ai_error.replace(key, "[key hidden]")
        except Exception:
            app.logger.exception("Unexpected AI error")
            ai_error = "The AI analysis failed unexpectedly."
    return jsonify(summary_service.build_response(ocr, ai, ai_error, provider is not None))


@app.errorhandler(413)
def too_large(_):
    return error("Image is too large. Maximum size is 10 MB.", 413)


@app.errorhandler(404)
def not_found(_):
    return error("Not found.", 404)


@app.errorhandler(500)
def server_error(_):
    return error("Something went wrong on the server. Please try again.", 500)


if __name__ == "__main__":
    print("Drishti is starting. Open http://127.0.0.1:5000")
    app.run(debug=os.getenv("FLASK_DEBUG") == "1")
