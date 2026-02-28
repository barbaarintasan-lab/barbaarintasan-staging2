from pathlib import Path
from TTS.api import TTS

MODEL_PATH = "./Hussein_tts"
TEXT_FILE = "./daily_text.txt"
OUTPUT_FOLDER = "./daily_audio"

Path(OUTPUT_FOLDER).mkdir(exist_ok=True)

print("[INFO] Loading model...")
tts = TTS(model_path=MODEL_PATH, progress_bar=True, gpu=False)

if not Path(TEXT_FILE).exists():
    raise FileNotFoundError("daily_text.txt lama helin")

with open(TEXT_FILE, "r", encoding="utf-8") as f:
    lines = [l.strip() for l in f.readlines() if l.strip()]

if not lines:
    raise ValueError("daily_text.txt waa madhan")

for i, text in enumerate(lines, 1):
    out_file = OUTPUT_FOLDER / f"somali_{i}.wav"
    print(f"[INFO] Generating {out_file}")
    tts.tts_to_file(text=text, file_path=str(out_file))

print("[DONE] Audio files created successfully")
