"""OCR with Tesseract (pytesseract) plus light Pillow preprocessing."""
import os
import re
from functools import lru_cache

import pytesseract
from PIL import Image, ImageOps
from pytesseract import TesseractError, TesseractNotFoundError

WINDOWS_DEFAULT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def configure():
    """Use TESSERACT_CMD if set, else the Windows default path if it exists."""
    cmd = os.getenv("TESSERACT_CMD") or (WINDOWS_DEFAULT if os.path.exists(WINDOWS_DEFAULT) else None)
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd


@lru_cache(maxsize=1)
def languages() -> str:
    """English, plus Hindi when its Tesseract language data (hin) is installed."""
    try:
        have = set(pytesseract.get_languages(config=""))
    except Exception:
        return "eng"
    return "+".join(l for l in ("eng", "hin") if l in have) or "eng"


def preprocess(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img).convert("L")
    longest = max(img.size)
    if longest < 1500:  # small images OCR poorly: upscale (max 3x)
        scale = min(3.0, 1500 / longest)
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    elif longest > 4000:
        scale = 4000 / longest
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    return ImageOps.autocontrast(img)


def clean(text: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def _read(img: Image.Image):
    """OCR one variant. Returns (text, average word confidence)."""
    d = pytesseract.image_to_data(img, lang=languages(), config="--psm 6", output_type=pytesseract.Output.DICT)
    lines, confs, order = {}, [], []
    for i, word in enumerate(d["text"]):
        if not word.strip():
            continue
        key = (d["block_num"][i], d["par_num"][i], d["line_num"][i])
        if key not in lines:
            lines[key] = []; order.append(key)
        lines[key].append(word)
        if float(d["conf"][i]) >= 0:
            confs.append(float(d["conf"][i]))
    text = "\n".join(" ".join(lines[k]) for k in order)
    return text, (sum(confs) / len(confs) if confs else 0.0)


def extract_text(img: Image.Image) -> dict:
    """Returns {"text": str, "error": str | None}. Never raises."""
    try:
        base = preprocess(img)
        best = max((_read(v) for v in (base, ImageOps.invert(base))), key=lambda r: r[1])
        return {"text": clean(best[0]), "error": None}
    except TesseractNotFoundError:
        return {"text": "", "error": "Tesseract OCR was not found. Set TESSERACT_CMD in your .env file."}
    except TesseractError:
        return {"text": "", "error": "Text extraction failed for this image."}
