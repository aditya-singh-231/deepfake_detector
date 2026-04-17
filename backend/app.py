from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import time
import os
import random
import cv2
import base64
import subprocess
import shutil
import uuid
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
CONVERTED_FOLDER = "converted"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)

# Extensions browsers cannot play natively
UNSUPPORTED_VIDEO_EXTS = {".avi", ".mov", ".mkv", ".flv", ".wmv", ".3gp"}
VIDEO_EXTS = {".mp4", ".webm", ".avi", ".mov", ".mkv", ".flv", ".wmv", ".3gp"}

# ──────────────────────────────────────────────
# ffmpeg helpers
# ──────────────────────────────────────────────

# ── Try to locate ffmpeg automatically, fall back to common Windows paths ──
def find_ffmpeg():
    # 1. Check PATH first
    found = shutil.which("ffmpeg")
    if found:
        return found
    # 2. Fallback to common Windows install locations
    candidates = [
        os.path.join("C:", os.sep, "ffmpeg", "bin", "ffmpeg.exe"),
        os.path.join("C:", os.sep, "Program Files", "ffmpeg", "bin", "ffmpeg.exe"),
        os.path.join("C:", os.sep, "Program Files (x86)", "ffmpeg", "bin", "ffmpeg.exe"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None

FFMPEG_PATH = find_ffmpeg()

def ffmpeg_available():
    return FFMPEG_PATH is not None

def get_video_codec(video_path):
    """
    Detect video codec by running ffmpeg on the file and parsing its stderr output.
    ffmpeg always prints codec info when it opens a file, even with no output.
    This works on all ffmpeg versions including old ones without -select_streams.
    """
    if not FFMPEG_PATH:
        return ""
    try:
        # ffmpeg prints file info to stderr; we read that to find the codec
        result = subprocess.run(
            [FFMPEG_PATH, "-i", video_path],
            capture_output=True, text=True, timeout=15
        )
        stderr = result.stderr.lower()
        # Parse lines like: "Stream #0:0: Video: hevc (Main)"
        import re
        match = re.search(r"stream #\S+: video: (\w+)", stderr)
        codec = match.group(1) if match else ""
        print(f"[codec-detect] {os.path.basename(video_path)} → codec='{codec}'")
        return codec
    except Exception as e:
        print(f"[codec-detect] ERROR: {e}")
        return ""

def needs_conversion(video_path):
    """Returns True if the video codec is not browser-safe (H.264/VP8/VP9/AV1)."""
    codec = get_video_codec(video_path)
    BROWSER_SAFE_CODECS = {"h264", "vp8", "vp9", "av1", "avc"}
    result = bool(codec) and codec not in BROWSER_SAFE_CODECS
    print(f"[needs-conversion] codec='{codec}' needs_conversion={result}")
    return result

def convert_to_mp4(input_path, output_path):
    """Convert any video to H.264 mp4 using ffmpeg."""
    if not FFMPEG_PATH:
        return False
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", input_path,
        "-vcodec", "libx264",
        "-acodec", "aac",
        "-movflags", "+faststart",
        "-preset", "fast",
        "-crf", "23",
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=300)
    return result.returncode == 0

# ──────────────────────────────────────────────
# Deepfake Detection Logic
# Replace heuristic functions below with your model
# ──────────────────────────────────────────────

def extract_facial_features(image_array):
    gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    noise = np.std(gray.astype(float) - blur.astype(float))
    b, g, r = cv2.split(image_array)
    color_std = np.std([np.mean(b), np.mean(g), np.mean(r)])
    dct = cv2.dct(np.float32(gray) / 255.0)
    high_freq_energy = np.sum(np.abs(dct[32:, 32:]))
    return {
        "laplacian_var": float(laplacian_var),
        "noise_level": float(noise),
        "color_std": float(color_std),
        "high_freq_energy": float(high_freq_energy),
    }

def heuristic_deepfake_score(features):
    score = 0.0
    if features["laplacian_var"] < 80:
        score += 0.25
    elif features["laplacian_var"] < 200:
        score += 0.10
    if features["noise_level"] < 3.0:
        score += 0.20
    elif features["noise_level"] < 6.0:
        score += 0.08
    if features["high_freq_energy"] > 500:
        score += 0.15
    if features["color_std"] < 5:
        score += 0.15
    return min(score, 0.95)

def analyze_image(file_bytes):
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    img_resized = cv2.resize(img, (224, 224))
    features = extract_facial_features(img_resized)
    fake_prob = heuristic_deepfake_score(features)
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

def analyze_video(video_path):
    """Analyse video using 1 frame per second."""
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_interval = max(1, int(fps))  # 1 frame per second

    frame_results = []
    frame_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_index % frame_interval == 0:
            frame_resized = cv2.resize(frame, (224, 224))
            features = extract_facial_features(frame_resized)
            fake_prob = heuristic_deepfake_score(features)
            frame_results.append(fake_prob)
        frame_index += 1

    cap.release()

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
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "ffmpeg": ffmpeg_available(),
        "ffmpeg_path": FFMPEG_PATH,   # shows exact path Flask is using
    })


@app.route("/ffmpeg-path", methods=["GET"])
def ffmpeg_path_debug():
    """Debug endpoint — visit http://localhost:5000/ffmpeg-path to see what Flask finds."""
    import sys
    return jsonify({
        "ffmpeg_found": ffmpeg_available(),
        "ffmpeg_path": FFMPEG_PATH,
        "python_executable": sys.executable,
        "system_PATH": os.environ.get("PATH", "").split(os.pathsep),
    })


@app.route("/preview/<filename>", methods=["GET"])
def preview(filename):
    """Serve converted mp4 for browser preview."""
    path = os.path.join(CONVERTED_FOLDER, filename)
    if not os.path.exists(path):
        return jsonify({"error": "Preview not found"}), 404
    return send_file(path, mimetype="video/mp4", conditional=True)


@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    orig_filename = file.filename
    ext = os.path.splitext(orig_filename)[1].lower()
    file_bytes = file.read()
    start_time = time.time()

    # Save uploaded file
    uid = uuid.uuid4().hex[:8]
    saved_name = f"{uid}{ext}"
    saved_path = os.path.join(UPLOAD_FOLDER, saved_name)
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    preview_url = None
    should_convert = False

    if ext in VIDEO_EXTS:
        print(f"[analyze] file={orig_filename} ext={ext} ffmpeg={ffmpeg_available()}")

        ext_needs_conv  = ext in UNSUPPORTED_VIDEO_EXTS
        codec_needs_conv = ffmpeg_available() and needs_conversion(saved_path)
        should_convert  = ext_needs_conv or codec_needs_conv

        print(f"[analyze] ext_needs_conv={ext_needs_conv} codec_needs_conv={codec_needs_conv} should_convert={should_convert}")

        if should_convert and ffmpeg_available():
            converted_name = f"{uid}_converted.mp4"
            converted_path = os.path.join(CONVERTED_FOLDER, converted_name)
            print(f"[analyze] converting → {converted_path}")
            success = convert_to_mp4(saved_path, converted_path)
            print(f"[analyze] conversion success={success}")
            if success:
                preview_url = f"http://localhost:5000/preview/{converted_name}"
                result = analyze_video(converted_path)
            else:
                # Conversion failed — still try to analyse original
                result = analyze_video(saved_path)
        else:
            # Codec detection said H.264 — but still re-encode to be safe.
            # This handles edge cases: old ffprobe errors, weird profiles,
            # missing moov atom, etc. Re-encoding guarantees browser compatibility.
            if ffmpeg_available():
                converted_name = f"{uid}_direct.mp4"
                converted_path = os.path.join(CONVERTED_FOLDER, converted_name)
                success = convert_to_mp4(saved_path, converted_path)
                if success:
                    preview_url = f"http://localhost:5000/preview/{converted_name}"
                    print(f"[analyze] re-encoded ok → {preview_url}")
                else:
                    print(f"[analyze] re-encode failed, serving original")
            result = analyze_video(saved_path)

        media_type = "video"
    else:
        result = analyze_image(file_bytes)
        media_type = "image"

    # Cleanup original upload
    try:
        os.remove(saved_path)
    except Exception:
        pass

    if result is None:
        return jsonify({"error": "Could not process the file. Ensure it contains valid media."}), 422

    elapsed = round((time.time() - start_time) * 1000)

    response = {
        "success": True,
        "media_type": media_type,
        "filename": orig_filename,
        "processing_time_ms": elapsed,
        "ffmpeg_available": ffmpeg_available(),
        "was_converted": should_convert if ext in VIDEO_EXTS else False,
        **result,
    }

    if preview_url:
        response["preview_url"] = preview_url

    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
