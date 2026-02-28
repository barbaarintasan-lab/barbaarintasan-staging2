import os
from huggingface_hub import InferenceClient
from pathlib import Path

# =========================
# Hugging Face API Token
# =========================
hf_token = os.getenv("HF_TOKEN")  # Ka soo qaado GitHub Secrets
client = InferenceClient(token=hf_token)

# =========================
# Folder lagu kaydinayo audio
# =========================
AUDIO_FOLDER = Path("daily_audio")
AUDIO_FOLDER.mkdir(exist_ok=True)

# =========================
# Qoraalka Af-Soomaali
# =========================
text_somali = (
    "Subax wanaagsan waalidiin, sheekadan maanta waa sheeko caruurta ah "
    "oo ku saabsan xayawaanka iyo saaxiibtinimada."
)

# =========================
# Reference audio (6-sec codkaaga)
# =========================
reference_audio = "my_voice.mp3"  # Ku bedel path sax ah

# =========================
# Output file
# =========================
output_file = AUDIO_FOLDER / "output.wav"

# =========================
# Model TTS cross-lingual
# =========================
model_id = "coqui/XTTS-v2"  # Multilingual / cross-lingual

# =========================
# Abuur audio
# =========================
audio_bytes = client.text_to_speech(
    model=model_id,
    text=text_somali,
    speaker_wav=reference_audio,
    language="so"  # Af-Soomaali
)

# =========================
# Kaydi audio
# =========================
with open(output_file, "wb") as f:
    f.write(audio_bytes)

print(f"[INFO] Audio saved: {output_file}")
