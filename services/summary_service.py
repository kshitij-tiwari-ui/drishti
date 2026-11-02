"""Builds the JSON the frontend shows. Keeps OCR-only output clearly labelled."""
import re

DATE = r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b"
TIME = r"\b\d{1,2}[:.]\d{2}\s?(?:AM|PM|am|pm)?(?:\s?[-–to]+\s?\d{1,2}[:.]\d{2}\s?(?:AM|PM|am|pm)?)?"
PRICE = r"(?:₹|Rs\.?|INR|\$|€|£)\s?\d[\d,]*(?:\.\d+)?"
PATTERNS = [re.compile(p) for p in (DATE, TIME, PRICE)]


def find_details(text: str, limit: int = 12) -> list:
    """Lines of the OCR text that contain a date, time or price."""
    out = []
    for line in text.splitlines():
        if any(p.search(line) for p in PATTERNS) and line not in out:
            out.append(line)
    return out[:limit]


def _strs(v):
    return [str(x).strip() for x in v if str(x).strip()] if isinstance(v, list) else []


def build_response(ocr: dict, ai: dict | None, ai_error: str | None, ai_configured: bool) -> dict:
    text = ocr["text"]
    details = find_details(text)
    res = {"text": text, "mode": "ai" if ai else "ocr-only", "ocr_error": ocr["error"], "notice": ""}

    if ai:
        res.update(
            description=str(ai.get("description", "")).strip(),
            simple=str(ai.get("simple_explanation", "")).strip(),
            info=_strs(ai.get("important_details")) or details,
            details={"image_type": str(ai.get("image_type", "")).strip(),
                     "purpose": str(ai.get("purpose", "")).strip(),
                     "attention": _strs(ai.get("attention")),
                     "uncertainty": str(ai.get("uncertainty", "")).strip()},
        )
        return res

    if not ai_configured:
        res["notice"] = "No API key was loaded. Create a file named .env (not .env.example) containing GEMINI_API_KEY=your_key, then restart the server."
    else:
        res["notice"] = (ai_error or "AI analysis failed.") + " Showing an OCR-only result instead."

    lines = [l for l in text.splitlines() if l.strip()]
    if lines:
        res["description"] = "No AI description is available. " + res["notice"]
        res["simple"] = f"Basic summary (not AI): Drishti found {len(lines)} lines of text. It starts with: {lines[0][:120]}"
    else:
        res["description"] = "No AI description is available, and no readable text was found. " + res["notice"]
        res["simple"] = "Basic summary (not AI): no readable text was found. Try a clearer or larger image."
    res["info"] = details
    res["details"] = {"image_type": "", "purpose": "", "attention": [], "uncertainty": "OCR can make mistakes. Check important details."}
    return res
