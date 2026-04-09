import { useState, useRef, useCallback } from "react";

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconShield = ({fill}) => (
  <svg viewBox="0 0 24 24" fill={fill||"none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconWarning = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:"100%",height:"100%"}}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconFilm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
    <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>
    <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
    <line x1="17" y1="7" x2="22" y2="7"/>
  </svg>
);
const IconScan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
  </svg>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#030712",
    color: "#e2e8f0",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "fixed", inset: 0, pointerEvents: "none",
    backgroundImage: `linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    zIndex: 0,
  },
  noise: {
    position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    zIndex: 0,
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 680, margin: "0 auto",
    padding: "24px 16px 80px",
  },
  header: {
    textAlign: "center", marginBottom: 40, paddingTop: 20,
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 4, padding: "4px 12px", marginBottom: 20,
    fontSize: 11, letterSpacing: "0.15em", color: "#10b981",
    textTransform: "uppercase",
  },
  dot: {
    width: 6, height: 6, borderRadius: "50%", background: "#10b981",
    animation: "pulse 2s infinite",
  },
  title: {
    fontSize: "clamp(28px, 7vw, 52px)",
    fontWeight: 700, lineHeight: 1.1,
    letterSpacing: "-0.03em",
    color: "#f8fafc",
    marginBottom: 12,
    fontFamily: "'Space Grotesk', 'DM Mono', sans-serif",
  },
  titleAccent: { color: "#10b981" },
  subtitle: {
    color: "#64748b", fontSize: 14, lineHeight: 1.6,
    maxWidth: 420, margin: "0 auto",
  },
  dropzone: (drag) => ({
    border: `2px dashed ${drag ? "#10b981" : "rgba(100,116,139,0.3)"}`,
    borderRadius: 12,
    padding: "48px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: drag ? "rgba(16,185,129,0.05)" : "rgba(15,23,42,0.6)",
    backdropFilter: "blur(8px)",
    position: "relative",
    marginBottom: 24,
  }),
  dropIcon: {
    width: 48, height: 48, margin: "0 auto 16px",
    color: "#10b981", opacity: 0.8,
  },
  dropTitle: { fontSize: 16, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 },
  dropSub: { fontSize: 13, color: "#475569" },
  fileTypes: {
    display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap",
  },
  tag: {
    background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.4)",
    borderRadius: 4, padding: "3px 10px", fontSize: 11,
    color: "#64748b", letterSpacing: "0.05em",
  },
  preview: {
    borderRadius: 12, overflow: "hidden",
    border: "1px solid rgba(71,85,105,0.3)",
    background: "rgba(15,23,42,0.8)",
    marginBottom: 24, position: "relative",
  },
  previewImg: {
    width: "100%", display: "block", maxHeight: 320, objectFit: "contain",
    background: "#0f172a",
  },
  previewBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px",
    borderTop: "1px solid rgba(71,85,105,0.2)",
    fontSize: 12, color: "#64748b",
  },
  previewIcon: { width: 14, height: 14, marginRight: 6, color: "#10b981", display:"inline-block", verticalAlign:"middle" },
  clearBtn: {
    width: 28, height: 28, borderRadius: "50%",
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
    color: "#ef4444", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", padding: 6,
    transition: "all 0.15s",
  },
  analyzeBtn: (loading) => ({
    width: "100%", padding: "16px 24px",
    background: loading ? "rgba(16,185,129,0.1)" : "#10b981",
    border: loading ? "1px solid rgba(16,185,129,0.3)" : "none",
    borderRadius: 10, color: loading ? "#10b981" : "#030712",
    fontSize: 14, fontWeight: 700, letterSpacing: "0.08em",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    textTransform: "uppercase",
    fontFamily: "inherit",
  }),
  spinner: {
    width: 16, height: 16, border: "2px solid rgba(16,185,129,0.3)",
    borderTopColor: "#10b981", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  scanIcon: { width: 18, height: 18, display:"inline-flex" },

  // Results
  result: (fake) => ({
    borderRadius: 12, overflow: "hidden",
    border: `1px solid ${fake ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
    background: fake ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)",
    marginTop: 28, animation: "fadeUp 0.4s ease",
  }),
  resultHeader: (fake) => ({
    padding: "20px 24px",
    borderBottom: `1px solid ${fake ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
  }),
  resultLabel: (fake) => ({
    display: "flex", alignItems: "center", gap: 12,
  }),
  resultIcon: { width: 40, height: 40 },
  verdict: (fake) => ({
    fontSize: "clamp(20px, 5vw, 28px)",
    fontWeight: 800, letterSpacing: "-0.02em",
    color: fake ? "#ef4444" : "#10b981",
    fontFamily: "'Space Grotesk', sans-serif",
  }),
  verdictSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  confidenceBadge: (fake) => ({
    background: fake ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
    border: `1px solid ${fake ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
    borderRadius: 8, padding: "8px 16px", textAlign: "center",
  }),
  confNum: (fake) => ({
    fontSize: 28, fontWeight: 800,
    color: fake ? "#ef4444" : "#10b981",
    fontFamily: "'Space Grotesk', sans-serif",
    lineHeight: 1,
  }),
  confLabel: { fontSize: 10, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 },

  // Meter
  meterWrap: { padding: "20px 24px" },
  meterLabel: { display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#64748b" },
  meterTrack: {
    height: 8, borderRadius: 4,
    background: "rgba(30,41,59,0.8)", overflow: "hidden", position: "relative",
  },
  meterFill: (pct, fake) => ({
    height: "100%", width: `${pct}%`,
    background: fake
      ? "linear-gradient(90deg, #dc2626, #ef4444)"
      : "linear-gradient(90deg, #059669, #10b981)",
    borderRadius: 4, transition: "width 1s ease",
  }),

  // Stats grid
  stats: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 1, background: "rgba(71,85,105,0.1)",
    borderTop: "1px solid rgba(71,85,105,0.15)",
  },
  statCell: {
    padding: "14px 20px",
    background: "rgba(15,23,42,0.6)",
  },
  statVal: { fontSize: 18, fontWeight: 700, color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" },
  statKey: { fontSize: 11, color: "#475569", marginTop: 2, letterSpacing: "0.05em" },

  // Features
  features: { padding: "16px 24px", borderTop: "1px solid rgba(71,85,105,0.15)" },
  featTitle: { fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 },
  featGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  featRow: {
    display: "flex", flexDirection: "column", gap: 4,
    padding: "10px 12px",
    background: "rgba(15,23,42,0.6)", borderRadius: 6,
    border: "1px solid rgba(71,85,105,0.15)",
  },
  featName: { fontSize: 11, color: "#64748b" },
  featVal: { fontSize: 14, fontWeight: 600, color: "#cbd5e1", fontFamily: "'Space Grotesk', sans-serif" },
  featBar: (pct) => ({
    height: 3, background: "rgba(30,41,59,0.8)", borderRadius: 2, overflow: "hidden", marginTop: 2,
  }),
  featBarFill: (pct) => ({
    height: "100%", width: `${Math.min(100, pct)}%`,
    background: "rgba(16,185,129,0.5)", borderRadius: 2, transition: "width 0.8s ease",
  }),

  // meta
  metaRow: {
    padding: "12px 24px",
    borderTop: "1px solid rgba(71,85,105,0.1)",
    display: "flex", justifyContent: "space-between", flexWrap: "wrap",
    gap: 8, fontSize: 11, color: "#334155",
  },

  // Error
  error: {
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10, padding: "16px 20px", marginTop: 20,
    fontSize: 13, color: "#fca5a5", display: "flex", gap: 10, alignItems: "flex-start",
  },
  errorIcon: { width: 18, height: 18, flexShrink: 0, marginTop: 1 },
};

// ── Keyframe injector ─────────────────────────────────────────────────────────
const Keyframes = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes spin  { to{transform:rotate(360deg)} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
    @keyframes scan  {
      0%  { top: 0; opacity: 0.8; }
      50% { opacity: 1; }
      100%{ top: 100%; opacity: 0; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030712; }
    input[type=file] { display:none; }
    @media(max-width:480px){
      .feat-grid { grid-template-columns: 1fr !important; }
      .stats-grid { grid-template-columns: 1fr !important; }
    }
  `}</style>
);

// ── Progress display during analysis ─────────────────────────────────────────
const steps = ["Uploading media", "Extracting frames", "Analysing artifacts", "Computing score"];
const ProgressSteps = ({ step }) => (
  <div style={{ padding: "24px", textAlign: "center" }}>
    {steps.map((s, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, opacity: done ? 0.4 : active ? 1 : 0.2, transition: "opacity 0.3s" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: done ? "#10b981" : active ? "#10b981" : "#1e293b",
            boxShadow: active ? "0 0 8px #10b981" : "none",
            animation: active ? "pulse 1s infinite" : "none",
          }} />
          <span style={{ fontSize: 13, color: done ? "#334155" : active ? "#10b981" : "#1e293b", fontFamily: "inherit" }}>
            {done ? "✓ " : ""}{s}{active ? "..." : ""}
          </span>
        </div>
      );
    })}
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  const API = "http://localhost:5000";

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreview({ url, type: f.type.startsWith("video") ? "video" : "image" });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); };

  const runAnalysis = async () => {
    if (!file || loading) return;
    setLoading(true); setResult(null); setError(null); setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, 3));
    }, 700);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      clearInterval(stepInterval);
      setProgressStep(4);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Server error");
      }
      const data = await res.json();
      await new Promise(r => setTimeout(r, 400));
      setResult(data);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message || "Connection failed. Make sure the Flask server is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => { setFile(null); setPreview(null); setResult(null); setError(null); setProgressStep(0); };

  const fake = result?.label === "FAKE";

  return (
    <>
      <Keyframes />
      <div style={styles.root}>
        <div style={styles.grid} />
        <div style={styles.noise} />

        <div style={styles.container}>
          {/* Header */}
          <header style={styles.header}>
            <div style={styles.badge}>
              <div style={styles.dot} />
              AI Forensics System
            </div>
            <h1 style={styles.title}>
              Deep<span style={styles.titleAccent}>Fake</span><br />Detector
            </h1>
            <p style={styles.subtitle}>
              Upload an image or video to analyse it for signs of AI manipulation, GAN synthesis, or face-swap artifacts.
            </p>
          </header>

          {/* Drop zone */}
          {!file && (
            <div
              style={styles.dropzone(drag)}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current.click()}
            >
              {/* Scan line animation */}
              {drag && (
                <div style={{
                  position: "absolute", left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent, #10b981, transparent)",
                  animation: "scan 1s linear infinite", top: 0,
                }} />
              )}
              <div style={styles.dropIcon}><IconUpload /></div>
              <div style={styles.dropTitle}>Drop media here or click to browse</div>
              <div style={styles.dropSub}>Analyse images and videos for deepfake artifacts</div>
              <div style={styles.fileTypes}>
                {["JPG", "PNG", "WEBP", "MP4", "MOV", "AVI"].map(t => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={onInputChange} />
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div style={styles.preview}>
              {preview.type === "image"
                ? <img src={preview.url} alt="preview" style={styles.previewImg} />
                : <video src={preview.url} controls style={{ ...styles.previewImg, maxHeight: 280 }} />
              }
              <div style={styles.previewBar}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={styles.previewIcon}>
                    {preview.type === "video" ? <IconFilm /> : <IconShield />}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{file?.name}</span>
                  <span style={{ marginLeft: 8, color: "#334155" }}>
                    ({(file?.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button style={styles.clearBtn} onClick={clearAll} title="Remove">
                  <IconX />
                </button>
              </div>
            </div>
          )}

          {/* Analyse button */}
          {file && !loading && (
            <button style={styles.analyzeBtn(false)} onClick={runAnalysis}>
              <span style={styles.scanIcon}><IconScan /></span>
              Run Deepfake Analysis
            </button>
          )}

          {/* Progress */}
          {loading && (
            <div style={{
              borderRadius: 12, border: "1px solid rgba(16,185,129,0.2)",
              background: "rgba(15,23,42,0.8)", marginTop: 20,
            }}>
              <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={styles.spinner} />
                <span style={{ fontSize: 13, color: "#10b981" }}>Analysing media...</span>
              </div>
              <ProgressSteps step={progressStep} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={styles.error}>
              <div style={styles.errorIcon}><IconWarning /></div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Analysis Failed</div>
                {error}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={styles.result(fake)}>
              {/* Header row */}
              <div style={styles.resultHeader(fake)}>
                <div style={styles.resultLabel(fake)}>
                  <div style={styles.resultIcon}>
                    <IconShield fill={fake ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"} />
                  </div>
                  <div>
                    <div style={styles.verdict(fake)}>
                      {fake ? "⚠ DEEPFAKE DETECTED" : "✓ AUTHENTIC"}
                    </div>
                    <div style={styles.verdictSub}>
                      {fake ? "AI manipulation signatures found" : "No significant manipulation detected"}
                    </div>
                  </div>
                </div>
                <div style={styles.confidenceBadge(fake)}>
                  <div style={styles.confNum(fake)}>{result.confidence}%</div>
                  <div style={styles.confLabel}>Confidence</div>
                </div>
              </div>

              {/* Probability meter */}
              <div style={styles.meterWrap}>
                <div style={styles.meterLabel}>
                  <span>Authentic</span>
                  <span>Fake</span>
                </div>
                <div style={styles.meterTrack}>
                  <div style={styles.meterFill(result.fake_probability, fake)} />
                </div>
                <div style={{ ...styles.meterLabel, marginTop: 6, marginBottom: 0 }}>
                  <span style={{ color: "#10b981" }}>{result.authentic_probability}%</span>
                  <span style={{ color: "#ef4444" }}>{result.fake_probability}%</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="stats-grid" style={styles.stats}>
                {result.media_type === "video" ? (
                  <>
                    <div style={styles.statCell}>
                      <div style={styles.statVal}>{result.frames_analyzed}</div>
                      <div style={styles.statKey}>Frames analysed</div>
                    </div>
                    <div style={styles.statCell}>
                      <div style={styles.statVal}>{result.duration_seconds}s</div>
                      <div style={styles.statKey}>Video duration</div>
                    </div>
                  </>
                ) : (
                  result.features && (
                    <>
                      <div style={styles.statCell}>
                        <div style={styles.statVal}>{result.features.sharpness}</div>
                        <div style={styles.statKey}>Sharpness score</div>
                      </div>
                      <div style={styles.statCell}>
                        <div style={styles.statVal}>{result.features.noise_level}</div>
                        <div style={styles.statKey}>Noise level</div>
                      </div>
                    </>
                  )
                )}
                <div style={styles.statCell}>
                  <div style={styles.statVal}>{result.processing_time_ms}ms</div>
                  <div style={styles.statKey}>Processing time</div>
                </div>
                <div style={styles.statCell}>
                  <div style={styles.statVal}>{result.media_type === "video" ? "Video" : "Image"}</div>
                  <div style={styles.statKey}>Media type</div>
                </div>
              </div>

              {/* Feature breakdown (image only) */}
              {result.features && (
                <div style={styles.features}>
                  <div style={styles.featTitle}>Signal Breakdown</div>
                  <div className="feat-grid" style={styles.featGrid}>
                    {[
                      { key: "sharpness", label: "Sharpness", max: 800, val: result.features.sharpness },
                      { key: "noise_level", label: "Noise Level", max: 20, val: result.features.noise_level },
                      { key: "color_variance", label: "Color Variance", max: 60, val: result.features.color_variance },
                      { key: "frequency_artifacts", label: "Freq. Artifacts", max: 1000, val: result.features.frequency_artifacts },
                    ].map(f => (
                      <div key={f.key} style={styles.featRow}>
                        <span style={styles.featName}>{f.label}</span>
                        <span style={styles.featVal}>{f.val}</span>
                        <div style={styles.featBar()}>
                          <div style={styles.featBarFill((f.val / f.max) * 100)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta row */}
              <div style={styles.metaRow}>
                <span>File: {result.filename}</span>
                <span>Model: Heuristic v1 (replace with CNN)</span>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ marginTop: 40, padding: "16px 20px", borderRadius: 8, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(71,85,105,0.2)" }}>
            <p style={{ fontSize: 11, color: "#334155", lineHeight: 1.6 }}>
              <span style={{ color: "#475569", fontWeight: 600 }}>ℹ Note: </span>
              This demo uses heuristic image analysis. For production use, replace the backend model with a CNN trained on FaceForensics++ or DFDC (e.g. EfficientNet-B4 / XceptionNet). Results are indicative only.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
