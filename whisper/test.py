import whisper_timestamped as whisper

audio = whisper.load_audio("tt.mp3")

model = whisper.load_model("large" , device="cuda")

result = whisper.transcribe(model, audio, language="ar")

import json
print(json.dumps(result, indent = 2, ensure_ascii = False))
