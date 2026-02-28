from pathlib import Path
import torch
from TTS.api import TTS  # TTS library

# Folder model-kaaga local
MODEL_PATH = "./Hussein_tts"
OUTPUT_FOLDER = "./output_audio"
Path(OUTPUT_FOLDER).mkdir(exist_ok=True)

# Load model
tts = TTS(model_path=MODEL_PATH, progress_bar=True, gpu=False)  # GPU haddii available

# Qoraalka Somali
somali_text = "Asalaamu calaykum, tani waa tijaabo cod Somali ah."

# Output
output_file = f"{OUTPUT_FOLDER}/output.wav"
tts.tts_to_file(text=somali_text, file_path=output_file)

print(f"Audio saved to {output_file}")
