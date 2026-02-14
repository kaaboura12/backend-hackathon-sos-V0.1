"""
Voice Anonymizer Microservice - SOS Village Integration
Uses librosa for pitch shift, time stretch, and noise masking.
"""

from flask import Flask, request, jsonify, send_file
import librosa
import soundfile as sf
import numpy as np
import os
import uuid
import tempfile

app = Flask(__name__)
TEMP_FOLDER = tempfile.gettempdir()


def anonymize_voice(input_path: str, output_path: str):
    y, sr = librosa.load(input_path, sr=None)
    y_pitch_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=4)
    y_stretched = librosa.effects.time_stretch(y_pitch_shifted, rate=0.95)
    noise = np.random.normal(0, 0.002, len(y_stretched))
    y_final = (y_stretched + noise) / np.max(np.abs(y_stretched + noise))
    sf.write(output_path, y_final, sr)


@app.route("/anonymize", methods=["POST"])
def anonymize_endpoint():
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "No audio file provided"}), 400
    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"success": False, "error": "Empty filename"}), 400

    unique_id = str(uuid.uuid4())
    ext = os.path.splitext(audio_file.filename)[1] or ".wav"
    input_path = os.path.join(TEMP_FOLDER, f"input_{unique_id}{ext}")
    output_path = os.path.join(TEMP_FOLDER, f"output_{unique_id}.wav")

    try:
        audio_file.save(input_path)
        anonymize_voice(input_path, output_path)
        return send_file(
            output_path,
            mimetype="audio/wav",
            as_attachment=True,
            download_name="anonymized_report.wav",
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "voice-anonymizer"})


if __name__ == "__main__":
    port = int(os.environ.get("VOICE_ANONYMIZER_PORT", "5002"))
    print(f"Voice Anonymizer starting on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
