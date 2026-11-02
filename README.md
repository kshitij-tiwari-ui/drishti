# 👁️ Drishti: Your Intelligent Screen Companion

> A web app that reads text from screenshots, timetables, menus and charts, describes them with optional AI, and reads the results aloud.

Drishti is a web app that makes visual content easier to understand and access. Upload a screenshot, timetable, menu, poster or chart, and Drishti extracts the text, optionally describes the image with AI, and reads the results aloud.

It's built as an accessibility companion for people who find it hard to read or interpret on-screen content, and it works fully offline in OCR-only mode.

## ✨ Features

- **Text extraction:** reads text from images using Tesseract OCR
- **AI image understanding (optional):** describes charts, posters and layouts using Google's Gemini vision model
- **Read aloud:** speaks the extracted text and description
- **Clear labelling:** results are marked "AI-generated" or "Basic summary, not AI", so you always know the source
- **Privacy-first:** images are processed in memory and never saved to disk
- **Pluggable AI:** swap in another vision provider by subclassing `VisionProvider`

## 🛠️ Tech Stack

- **Backend:** Python (Flask)
- **OCR:** Tesseract
- **AI vision:** Google Gemini API (optional)
- **Frontend:** HTML, CSS, JavaScript

## 🚀 Getting Started (Windows)

Prerequisites: Python 3.12 or 3.13 and [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki).

```powershell
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Open http://127.0.0.1:5000.

- If Tesseract isn't at `C:\Program Files\Tesseract-OCR\tesseract.exe`, set `TESSERACT_CMD` in `.env`.
- If PowerShell blocks `activate`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- Python 3.15 is a pre-release. If any package fails to install, use Python 3.12 or 3.13 (`py -3.12 -m venv venv`).

## 🤖 Enable AI Image Understanding (Optional)

1. Get an API key from [Google AI Studio](https://aistudio.google.com) and check its current free-tier terms and limits yourself.
2. Add it to `.env`: `GEMINI_API_KEY=your_key`
3. Restart `python app.py`. Results are then labelled "AI-generated".

The key stays on the server. Without a key, Drishti works in OCR-only mode and labels results "Basic summary, not AI". The image is sent to Google's API only when a key is set.

To use another provider, subclass `VisionProvider` in `services/vision_service.py` and return it from `get_provider()`.

## 🧪 Tests

```bash
python -m unittest discover -s tests -v
```

## 📁 Project Structure

```
drishti/
├── app.py                  # Routes and validation
├── services/
│   ├── ocr_service.py      # Tesseract OCR
│   ├── vision_service.py   # AI vision providers
│   └── summary_service.py  # Summaries
├── templates/index.html
├── static/
│   ├── css/style.css
│   ├── js/script.js
│   └── images/sample-timetable.png
└── tests/
```

Uploaded images are processed in memory and never saved to disk. Drishti is an accessibility companion, not a screen reader replacement.
