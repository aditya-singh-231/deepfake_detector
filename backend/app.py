from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import time
import os
import random
import cv2
import base64
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ──────────────────────────────────────────────
# Deepfake Detection Logic
# In production, replace this with a real model:
#   e.g. EfficientNet / XceptionNet trained on FaceForensics++
# ──────────────────────────────────────────────

def extract_facial_features(image_array):
    """
    Extract basic facial / texture features from image.
    Production: use dlib / mediapipe for face landmarks,
    then feed crops into a CNN classifier.
    """
    gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)

    # Laplacian variance — measures sharpness / blurriness
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Noise level estimate via high-frequency residuals
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    noise = np.std(gray.astype(float) - blur.astype(float))

    # Color channel statistics
    b, g, r = cv2.split(image_array)
    color_std = np.std([np.mean(b), np.mean(g), np.mean(r)])

    # Frequency domain — DCT artifact analysis (JPEG-style)
    dct = cv2.dct(np.float32(gray) / 255.0)
    high_freq_energy = np.sum(np.abs(dct[32:, 32:]))

    return {
        "laplacian_var": float(laplacian_var),
        "noise_level": float(noise),
        "color_std": float(color_std),
        "high_freq_energy": float(high_freq_energy),
    }


def heuristic_deepfake_score(features):
    """
    Heuristic scoring from extracted features.
    Returns probability [0-1] of being FAKE.

    In production: feed image crops to a fine-tuned
    EfficientNet-B4 trained on FaceForensics++ or DFDC.
    """
    score = 0.0

    # Unusually low sharpness → GAN smoothing artifact
    if features["laplacian_var"] < 80:
        score += 0.25
    elif features["laplacian_var"] < 200:
        score += 0.10

    # Low noise → over-smoothed skin typical of GANs
    if features["noise_level"] < 3.0:
        score += 0.20
    elif features["noise_level"] < 6.0:
        score += 0.08

    # Suspicious high-frequency DCT energy → compression artifacts
    if features["high_freq_energy"] > 500:
        score += 0.15

    # Low color variance → color-graded / synthesised
    if features["color_std"] < 5:
        score += 0.15

    # Clamp
    score = min(score, 0.95)
    return score


def analyze_image(file_bytes):
    """Analyze a single image for deepfake indicators."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return None

    # Resize for consistent analysis
    img_resized = cv2.resize(img, (224, 224))

    features = extract_facial_features(img_resized)
    fake_prob = heuristic_deepfake_score(features)

    # Small deterministic jitter tied to image content
    seed = int(np.sum(img_resized[::10, ::10, 0]))
    rng = random.Random(seed)
    fake_prob = min(0.98, max(0.02, fake_prob + rng.uniform(-0.05, 0.05)))

    label = "FAKE" if fake_prob >= 0.5 else "AUTHENTIC"
    confidence = fake_prob if label == "FAKE" else 1 - fake_prob

    return {
        "label": label,
        "confidence": round(confidence * 100, 2),
        "fake_probability": round(fake_prob * 100, 2),
        "authentic_probability": round((1 - fake_prob) * 100, 2),
        "features": {
            "sharpness": round(features["laplacian_var"], 2),
            "noise_level": round(features["noise_level"], 2),
            "color_variance": round(features["color_std"], 2),
            "frequency_artifacts": round(features["high_freq_energy"], 2),
        },
    }


def analyze_video(file_bytes, filename):
    """Sample frames from a video and aggregate results."""
    tmp_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(tmp_path, "wb") as f:
        f.write(file_bytes)

    cap = cv2.VideoCapture(tmp_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25

    # Sample up to 15 evenly-spaced frames
    sample_count = min(15, max(1, total_frames))
    frame_indices = np.linspace(0, max(1, total_frames - 1), sample_count, dtype=int)

    frame_results = []
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if not ret:
            continue
        frame_resized = cv2.resize(frame, (224, 224))
        features = extract_facial_features(frame_resized)
        fake_prob = heuristic_deepfake_score(features)
        frame_results.append(fake_prob)

    cap.release()
    os.remove(tmp_path)

    if not frame_results:
        return None

    avg_fake_prob = float(np.mean(frame_results))
    seed = int(sum(frame_results) * 1000) % 10000
    rng = random.Random(seed)
    avg_fake_prob = min(0.98, max(0.02, avg_fake_prob + rng.uniform(-0.05, 0.05)))

    label = "FAKE" if avg_fake_prob >= 0.5 else "AUTHENTIC"
    confidence = avg_fake_prob if label == "FAKE" else 1 - avg_fake_prob

    return {
        "label": label,
        "confidence": round(confidence * 100, 2),
        "fake_probability": round(avg_fake_prob * 100, 2),
        "authentic_probability": round((1 - avg_fake_prob) * 100, 2),
        "frames_analyzed": len(frame_results),
        "total_frames": total_frames,
        "duration_seconds": round(total_frames / fps, 1),
    }


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})


@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    filename = file.filename.lower()
    file_bytes = file.read()

    start_time = time.time()

    # Route to image or video analyser
    video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv"}
    ext = os.path.splitext(filename)[1]

    if ext in video_extensions:
        result = analyze_video(file_bytes, file.filename)
        media_type = "video"
    else:
        result = analyze_image(file_bytes)
        media_type = "image"

    if result is None:
        return jsonify({"error": "Could not process the file. Ensure it contains valid media."}), 422

    elapsed = round((time.time() - start_time) * 1000)  # ms

    return jsonify({
        "success": True,
        "media_type": media_type,
        "filename": file.filename,
        "processing_time_ms": elapsed,
        **result,
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
