import whisper_timestamped as whisper
import json

audio = whisper.load_audio("tt.mp3")

model = whisper.load_model("large", device="cuda")

result = whisper.transcribe(model, audio, language="ar")

data = json.dumps(result, indent=2, ensure_ascii=False).encode(
    'utf-8')

with open("../data/data.json", "w", encoding="utf-8") as outfile:
    outfile.write(data)
