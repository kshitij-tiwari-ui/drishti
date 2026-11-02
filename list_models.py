import os, json, urllib.request as u
from dotenv import load_dotenv
load_dotenv()
req = u.Request(os.getenv("AI_BASE_URL") + "/models",
                headers={"Authorization": "Bearer " + os.getenv("AI_API_KEY"), "User-Agent": "Drishti/2.0"})
for m in sorted(json.load(u.urlopen(req))["data"], key=lambda m: m["id"]):
    print(m["id"])