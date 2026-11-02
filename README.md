# Drishti — Your Intelligent Screen Companion

Upload a screenshot, timetable, menu, poster or chart. Drishti reads the text (Tesseract OCR), optionally describes the image with an AI vision model, and reads the results aloud.

## Run on Windows (PowerShell, in this folder)

```powershell
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Open http://127.0.0.1:5000. Tesseract is expected at `C:\Program Files\Tesseract-OCR\tesseract.exe`; otherwise set `TESSERACT_CMD` in `.env`.
If PowerShell blocks `activate`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
Python 3.15 is a pre-release: if any package fails to install, use Python 3.12 or 3.13 (`py -3.12 -m venv venv`).

## Turn on AI image understanding (optional)

1. Create an API key in Google AI Studio (https://aistudio.google.com) and check its current free-tier terms and limits yourself.
2. Put it in `.env`: `GEMINI_API_KEY=your_key`
3. Restart `python app.py`. Results are then labelled "AI-generated".

The key stays on the server. Without a key, Drishti works in OCR-only mode and labels results "Basic summary, not AI". The image is sent to Google's API only when a key is set.
To use another provider, subclass `VisionProvider` in `services/vision_service.py` and return it from `get_provider()`.

## Tests

```powershell
python -m unittest discover -s tests -v
```

## Structure

`app.py` (routes, validation) · `services/ocr_service.py` · `services/vision_service.py` · `services/summary_service.py` · `templates/index.html` · `static/css/style.css` · `static/js/script.js` · `static/images/sample-timetable.png`

Uploaded images are processed in memory and never saved to disk. Drishti is an accessibility companion, not a screen reader replacement.
