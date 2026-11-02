"""Run from the project folder:  python -m unittest discover -s tests -v"""
import io, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.pop("GEMINI_API_KEY", None)
from PIL import Image
import app as drishti
from services import vision_service

SAMPLE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "images", "sample-timetable.png")

def png(size=(300, 200), color="white"):
    b = io.BytesIO(); Image.new("RGB", size, color).save(b, "PNG"); b.seek(0); return b

class FakeAI(vision_service.VisionProvider):
    def analyze(self, img, ocr_text):
        return {"image_type": "Timetable", "purpose": "Shows classes.", "description": "A weekly class table.",
                "important_details": ["Mon 9:00 Maths"], "attention": ["Lab needs a record"],
                "simple_explanation": "Your classes for the week.", "uncertainty": ""}

class Tests(unittest.TestCase):
    def setUp(self): self.c = drishti.app.test_client()
    def post(self, f, name): return self.c.post("/api/analyze", data={"image": (f, name)}, content_type="multipart/form-data")

    def test_timetable_ocr_fallback(self):
        r = self.post(open(SAMPLE, "rb"), "t.png"); j = r.get_json()
        self.assertEqual(r.status_code, 200); self.assertEqual(j["mode"], "ocr-only")
        self.assertIn("Monday", j["text"]); self.assertTrue(j["info"]); self.assertIn("not AI", j["simple"])
    def test_image_without_text(self):
        j = self.post(png(), "blank.png").get_json(); self.assertEqual(j["text"], ""); self.assertIn("no readable text", j["simple"])
    def test_unsupported_extension(self): self.assertEqual(self.post(io.BytesIO(b"hi"), "a.txt").status_code, 415)
    def test_fake_image_content(self): self.assertEqual(self.post(io.BytesIO(b"not an image"), "a.png").status_code, 400)
    def test_gif_rejected(self):
        b = io.BytesIO(); Image.new("RGB", (20, 20)).save(b, "GIF"); b.seek(0); self.assertEqual(self.post(b, "a.png").status_code, 415)
    def test_too_large(self): self.assertEqual(self.post(io.BytesIO(b"0" * (11 * 1024 * 1024)), "a.png").status_code, 413)
    def test_large_dimensions(self):
        r = self.post(png((4500, 3000)), "big.png"); self.assertEqual(r.status_code, 200)
    def test_no_file(self): self.assertEqual(self.c.post("/api/analyze").status_code, 400)
    def test_source_not_served(self):
        for p in ("/app.py", "/.env", "/requirements.txt"): self.assertEqual(self.c.get(p).status_code, 404)
    def test_ai_path_with_fake_provider(self):
        orig = vision_service.get_provider; vision_service.get_provider = lambda: FakeAI()
        try: j = self.post(open(SAMPLE, "rb"), "t.png").get_json()
        finally: vision_service.get_provider = orig
        self.assertEqual(j["mode"], "ai"); self.assertEqual(j["simple"], "Your classes for the week."); self.assertIn("Monday", j["text"])
    def test_ai_failure_falls_back(self):
        class Bad(vision_service.VisionProvider):
            def analyze(self, i, o): raise vision_service.VisionError("The AI service is busy.")
        orig = vision_service.get_provider; vision_service.get_provider = lambda: Bad()
        try: j = self.post(open(SAMPLE, "rb"), "t.png").get_json()
        finally: vision_service.get_provider = orig
        self.assertEqual(j["mode"], "ocr-only"); self.assertIn("busy", j["notice"])
    def test_home_and_static(self):
        self.assertEqual(self.c.get("/").status_code, 200); self.assertEqual(self.c.get("/static/js/script.js").status_code, 200)



class JsonTests(unittest.TestCase):
    def test_extract_json_fenced(self):
        self.assertEqual(vision_service._extract_json('Sure:\n```json\n{"a": 1}\n```'), {"a": 1})



class ModelFallbackTests(unittest.TestCase):
    def test_retired_model_falls_back(self):
        used = []
        def fake(self, prompt, jpeg, model):
            used.append(model)
            if model == "gemini-2.5-flash":
                raise vision_service.ModelNotFound("gone")
            return '{"description": "ok"}'
        orig = vision_service.GeminiProvider._rest
        orig_sdk = vision_service._sdk_available
        vision_service.GeminiProvider._rest = fake; vision_service._sdk_available = lambda: False
        try:
            out = vision_service.GeminiProvider("k", "gemini-2.5-flash").analyze(Image.new("RGB", (50, 50)), "")
        finally:
            vision_service.GeminiProvider._rest = orig; vision_service._sdk_available = orig_sdk
        self.assertEqual(out["description"], "ok"); self.assertEqual(used[0], "gemini-2.5-flash"); self.assertEqual(used[1], "gemini-3.5-flash")

if __name__ == "__main__": unittest.main()
