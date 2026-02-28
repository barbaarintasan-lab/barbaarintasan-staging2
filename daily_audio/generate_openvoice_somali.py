from pathlib import Path
from openvoice_app import OpenVoiceV2  # hubi inaad install gareysay OpenVoice

# Folder lagu kaydinayo output audio
AUDIO_FOLDER = Path("daily_audio")
AUDIO_FOLDER.mkdir(exist_ok=True)

# Qoraalka Af-Soomaali ee la rabo in la hadlo
text_somali = "Subax wanaagsan waalidiin, sheekadan maanta waa sheeko caruurta ah oo ku saabsan Saxaabadii."

# ✅ Reference audio (codkaaga 3–6 sec)
reference_audio = "audio_reference/my_voice.mp3"

# Model OpenVoice V2
model = OpenVoiceV2(checkpoint_dir="checkpoints_v2")  # hubi inaad download gareysay checkpoint-ka V2

# Generate codka
output_file = AUDIO_FOLDER / "output.wav"
model.clone_voice(
    reference_audio_path=reference_audio,
    text=text_somali,
    output_path=str(output_file),
    language="so"  # Haddii model uu taageero Somali ama cross-lingual
)

print(f"Audio saved: {output_file}")
