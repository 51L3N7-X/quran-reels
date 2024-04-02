import whisper_timestamped as whisper
import json

# Load audio and model
audio = whisper.load_audio("tt.mp3")
model = whisper.load_model("large", device="cuda")
result = whisper.transcribe(model, audio, language="ar")

# Prepare the JSON data
# Keep indentation and handle non-ASCII characters
data = json.dumps(result, indent=2, ensure_ascii=False)

# Write data to JSON file
with open("../data/data.json", "w", encoding="utf-8") as outfile:
    outfile.write(data)

print("Transcription written to data.json")
