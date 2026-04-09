# 🔍 DeepFake Detector — Full-Stack App

A mobile-responsive deepfake detection app with a **React** frontend and **Flask** backend.

---

## 📁 Project Structure

```
deepfake-detector/
├── backend/
│   ├── app.py               ← Flask API server
│   └── requirements.txt     ← Python dependencies
└── frontend/
    ├── public/index.html
    ├── src/
│   │   ├── App.jsx          ← Full React UI
│   │   └── index.js
    └── package.json
```

---

## 🚀 Quick Start

### 1. Backend (Flask)

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
# → Runs at http://localhost:5000
```

### 2. Frontend (React)

```bash
cd frontend

# Install packages
npm install

# Start dev server
npm start
# → Runs at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧠 How It Works

### API Endpoint

```
POST /analyze
Content-Type: multipart/form-data
Body: file=<image or video>
```

**Response:**
```json
{
  "success": true,
  "label": "FAKE",           // or "AUTHENTIC"
  "confidence": 87.4,        // % confidence in the verdict
  "fake_probability": 87.4,
  "authentic_probability": 12.6,
  "media_type": "image",
  "processing_time_ms": 142,
  "features": {
    "sharpness": 45.2,
    "noise_level": 2.1,
    "color_variance": 3.8,
    "frequency_artifacts": 612.0
  }
}
```

### Detection Logic

The current backend uses **heuristic analysis**:
- **Laplacian sharpness** — GANs over-smooth images, reducing variance
- **Noise residual analysis** — Real photos contain natural sensor noise; synthetics don't
- **DCT frequency artifacts** — GAN-generated images have characteristic frequency signatures
- **Color channel statistics** — Synthesised faces often have unnatural colour distributions

For **video**, it samples up to 15 evenly-spaced frames and averages scores.

---

## 🔧 Upgrading to a Real AI Model

Replace `heuristic_deepfake_score()` in `app.py` with a CNN inference call:

```python
# Example with EfficientNet-B4 (trained on FaceForensics++)
import torch
from torchvision import transforms
from efficientnet_pytorch import EfficientNet

model = EfficientNet.from_pretrained('efficientnet-b4')
model.load_state_dict(torch.load('deepfake_model.pth'))
model.eval()

def predict(image_array):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    tensor = transform(Image.fromarray(image_array)).unsqueeze(0)
    with torch.no_grad():
        logits = model(tensor)
        prob = torch.sigmoid(logits).item()
    return prob  # 0 = real, 1 = fake
```

**Recommended pretrained models:**
- [FaceForensics++ EfficientNet](https://github.com/ondyari/FaceForensics)
- [DFDC Kaggle winners](https://www.kaggle.com/c/deepfake-detection-challenge)
- [Deepware Scanner model](https://deepware.ai)

---

## 📱 Mobile Responsive

The React UI is fully responsive using fluid typography (`clamp()`), CSS grid breakpoints, and a touch-friendly drag-and-drop zone.

---

## ⚙️ Environment Notes

- Flask CORS is enabled for `localhost:3000` (all origins in dev mode)
- For production, restrict CORS: `CORS(app, origins=["https://yourdomain.com"])`
- The `uploads/` folder in backend is used as temporary storage for video analysis and is cleaned up automatically
