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
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

// ── Video playability detection ───────────────────────────────────────────────
const getExt = (name) => name.slice(name.lastIndexOf(".")).toLowerCase();

// Extensions that always need server-side conversion (browser never supports them)
const ALWAYS_CONVERT = new Set([".avi", ".mkv", ".flv", ".wmv", ".3gp", ".mov"]);

/**
 * Probe whether the browser can actually decode this file.
 * Returns a Promise<boolean>.
 *
 * Strategy:
 *  1. If extension is in ALWAYS_CONVERT → false immediately (no probe needed)
 *  2. Otherwise create an <video> element, attach the blob as src,
 *     and listen for canplay vs error events.
 *     This catches H.265 mp4, MPEG-4 Part 2, ProRes, etc.
 */
const probeCanPlay = (file) => {
  const ext = getExt(file.name);
  if (ALWAYS_CONVERT.has(ext)) return Promise.resolve(false);

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    const cleanup = (result) => {
      video.src = "";
      URL.revokeObjectURL(url);
      resolve(result);
    };

    // Give it 3 seconds max — some codecs stall instead of erroring
    const timer = setTimeout(() => cleanup(false), 3000);

    video.oncanplay = () => { clearTimeout(timer); cleanup(true); };
    video.onerror   = () => { clearTimeout(timer); cleanup(false); };

    video.src = url;
    video.load();
  });
};

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
  header: { textAlign: "center", marginBottom: 40, paddingTop: 20 },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 4, padding: "4px 12px", marginBottom: 20,
    fontSize: 11, letterSpacing: "0.15em", color: "#10b981", textTransform: "uppercase",
  },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" },
  title: {
    fontSize: "clamp(28px, 7vw, 52px)", fontWeight: 700, lineHeight: 1.1,
    letterSpacing: "-0.03em", color: "#f8fafc", marginBottom: 12,
    fontFamily: "'Space Grotesk', 'DM Mono', sans-serif",
  },
  titleAccent: { color: "#10b981" },
  subtitle: { color: "#64748b", fontSize: 14, lineHeight: 1.6, maxWidth: 420, margin: "0 auto" },
  dropzone: (drag) => ({
    border: `2px dashed ${drag ? "#10b981" : "rgba(100,116,139,0.3)"}`,
    borderRadius: 12, padding: "48px 24px", textAlign: "center",
    cursor: "pointer", transition: "all 0.2s ease",
    background: drag ? "rgba(16,185,129,0.05)" : "rgba(15,23,42,0.6)",
    backdropFilter: "blur(8px)", position: "relative", marginBottom: 24,
  }),
  dropIcon: { width: 48, height: 48, margin: "0 auto 16px", color: "#10b981", opacity: 0.8 },
  dropTitle: { fontSize: 16, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 },
  dropSub: { fontSize: 13, color: "#475569" },
  fileTypes: { display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" },
  tag: (supported) => ({
    background: supported ? "rgba(16,185,129,0.08)" : "rgba(30,41,59,0.8)",
    border: `1px solid ${supported ? "rgba(16,185,129,0.25)" : "rgba(71,85,105,0.4)"}`,
    borderRadius: 4, padding: "3px 10px", fontSize: 11,
    color: supported ? "#10b981" : "#64748b", letterSpacing: "0.05em",
  }),
  preview: {
    borderRadius: 12, overflow: "hidden",
    border: "1px solid rgba(71,85,105,0.3)",
    background: "rgba(15,23,42,0.8)", marginBottom: 24, position: "relative",
  },
  previewImg: { width: "100%", display: "block", maxHeight: 320, objectFit: "contain", background: "#0f172a" },
  previewBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px", borderTop: "1px solid rgba(71,85,105,0.2)",
    fontSize: 12, color: "#64748b",
  },
  previewIcon: { width: 14, height: 14, marginRight: 6, color: "#10b981", display:"inline-block", verticalAlign:"middle" },
  clearBtn: {
    width: 28, height: 28, borderRadius: "50%",
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
    color: "#ef4444", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", padding: 6, transition: "all 0.15s",
  },
  // Format warning banner
  formatWarning: {
    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 10, padding: "12px 16px", marginBottom: 16,
    display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12,
  },
  formatWarningIcon: { width: 16, height: 16, color: "#f59e0b", flexShrink: 0, marginTop: 1 },
  // Converting banner
  convertingBanner: {
    background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
    borderRadius: 10, padding: "12px 16px", marginBottom: 16,
    display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "#10b981",
  },
  analyzeBtn: (loading) => ({
    width: "100%", padding: "16px 24px",
    background: loading ? "rgba(16,185,129,0.1)" : "#10b981",
    border: loading ? "1px solid rgba(16,185,129,0.3)" : "none",
    borderRadius: 10, color: loading ? "#10b981" : "#030712",
    fontSize: 14, fontWeight: 700, letterSpacing: "0.08em",
    cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s ease",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    textTransform: "uppercase", fontFamily: "inherit",
  }),
  spinner: {
    width: 16, height: 16, border: "2px solid rgba(16,185,129,0.3)",
    borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  scanIcon: { width: 18, height: 18, display:"inline-flex" },
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
  resultIcon: { width: 40, height: 40 },
  verdict: (fake) => ({
    fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em",
    color: fake ? "#ef4444" : "#10b981", fontFamily: "'Space Grotesk', sans-serif",
  }),
  verdictSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  confidenceBadge: (fake) => ({
    background: fake ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
    border: `1px solid ${fake ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
    borderRadius: 8, padding: "8px 16px", textAlign: "center",
  }),
  confNum: (fake) => ({
    fontSize: 28, fontWeight: 800, color: fake ? "#ef4444" : "#10b981",
    fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1,
  }),
  confLabel: { fontSize: 10, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 },
  meterWrap: { padding: "20px 24px" },
  meterLabel: { display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#64748b" },
  meterTrack: { height: 8, borderRadius: 4, background: "rgba(30,41,59,0.8)", overflow: "hidden" },
  meterFill: (pct, fake) => ({
    height: "100%", width: `${pct}%`,
    background: fake ? "linear-gradient(90deg, #dc2626, #ef4444)" : "linear-gradient(90deg, #059669, #10b981)",
    borderRadius: 4, transition: "width 1s ease",
  }),
  stats: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
    background: "rgba(71,85,105,0.1)", borderTop: "1px solid rgba(71,85,105,0.15)",
  },
  statCell: { padding: "14px 20px", background: "rgba(15,23,42,0.6)" },
  statVal: { fontSize: 18, fontWeight: 700, color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" },
  statKey: { fontSize: 11, color: "#475569", marginTop: 2, letterSpacing: "0.05em" },
  features: { padding: "16px 24px", borderTop: "1px solid rgba(71,85,105,0.15)" },
  featTitle: { fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 },
  featGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  featRow: {
    display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px",
    background: "rgba(15,23,42,0.6)", borderRadius: 6, border: "1px solid rgba(71,85,105,0.15)",
  },
  featName: { fontSize: 11, color: "#64748b" },
  featVal: { fontSize: 14, fontWeight: 600, color: "#cbd5e1", fontFamily: "'Space Grotesk', sans-serif" },
  featBarTrack: { height: 3, background: "rgba(30,41,59,0.8)", borderRadius: 2, overflow: "hidden", marginTop: 2 },
  featBarFill: (pct) => ({
    height: "100%", width: `${Math.min(100, pct)}%`,
    background: "rgba(16,185,129,0.5)", borderRadius: 2, transition: "width 0.8s ease",
  }),
  metaRow: {
    padding: "12px 24px", borderTop: "1px solid rgba(71,85,105,0.1)",
    display: "flex", justifyContent: "space-between", flexWrap: "wrap",
    gap: 8, fontSize: 11, color: "#334155",
  },
  error: {
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10, padding: "16px 20px", marginTop: 20,
    fontSize: 13, color: "#fca5a5", display: "flex", gap: 10, alignItems: "flex-start",
  },
  errorIcon: { width: 18, height: 18, flexShrink: 0, marginTop: 1 },
};

const Keyframes = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes spin  { to{transform:rotate(360deg)} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
    @keyframes scan  { 0%{top:0;opacity:0.8} 50%{opacity:1} 100%{top:100%;opacity:0} }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030712; }
    input[type=file] { display:none; }
    @media(max-width:480px){
      .feat-grid { grid-template-columns: 1fr !important; }
      .stats-grid { grid-template-columns: 1fr !important; }
    }
  `}</style>
);

const steps = ["Uploading media", "Extracting frames", "Analysing artifacts", "Computing score"];
const ProgressSteps = ({ step, isConverting }) => (
  <div style={{ padding: "24px", textAlign: "center" }}>
    {isConverting && (
      <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 16, padding: "8px 12px", background: "rgba(245,158,11,0.08)", borderRadius: 6 }}>
        ⚙ Converting video to mp4 for analysis…
      </div>
    )}
    {steps.map((s, i) => {
      const done = i < step;
      const active = i === step;
      return (
        <div key={s} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, opacity: done ? 0.4 : active ? 1 : 0.2, transition:"opacity 0.3s" }}>
          <div style={{
            width:8, height:8, borderRadius:"50%", flexShrink:0,
            background: done||active ? "#10b981" : "#1e293b",
            boxShadow: active ? "0 0 8px #10b981" : "none",
            animation: active ? "pulse 1s infinite" : "none",
          }} />
          <span style={{ fontSize:13, color: done ? "#334155" : active ? "#10b981" : "#1e293b", fontFamily:"inherit" }}>
            {done ? "✓ " : ""}{s}{active ? "..." : ""}
          </span>
        </div>
      );
    })}
  </div>
);

// ── Unsupported format placeholder ────────────────────────────────────────────
const VideoPlaceholder = ({ filename, probing }) => (
  <div style={{
    width: "100%", height: 200, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 10,
    background: "#0a1628", color: "#475569",
  }}>
    {probing
      ? <div style={{ display:"flex", alignItems:"center", gap:10, color:"#10b981" }}>
          <div style={{ width:16, height:16, border:"2px solid rgba(16,185,129,0.3)", borderTopColor:"#10b981", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          <span style={{ fontSize:13 }}>Checking codec compatibility…</span>
        </div>
      : <>
          <div style={{ width: 40, height: 40, opacity: 0.4 }}><IconFilm /></div>
          <div style={{ fontSize: 13 }}>{filename}</div>
          <div style={{ fontSize: 11, color: "#334155" }}>
            Codec not supported by browser — will be converted by server
          </div>
        </>
    }
  </div>
);

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);          // { url, type, canPlay, ext }
  const [convertedUrl, setConvertedUrl] = useState(null); // server-side converted mp4 URL
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  const API = "http://localhost:5000";

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setIsConverting(false);

    const isVideo = f.type.startsWith("video") || /\.(avi|mov|mkv|flv|wmv|3gp|mp4|webm)$/i.test(f.name);
    const ext = getExt(f.name);

    if (!isVideo) {
      const url = URL.createObjectURL(f);
      setPreview({ url, type: "image", canPlay: true, ext });
      return;
    }

    // Show a loading state while we probe
    setPreview({ url: null, type: "video", canPlay: null, ext });   // null = probing

    const playable = await probeCanPlay(f);
    const url = playable ? URL.createObjectURL(f) : null;
    setPreview({ url, type: "video", canPlay: playable, ext });
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

    // If video needs conversion, signal it
    if (preview?.type === "video" && !preview?.canPlay) {
      setIsConverting(true);
    }

    const stepInterval = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, 3));
    }, 900);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      clearInterval(stepInterval);
      setProgressStep(4);
      setIsConverting(false);

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Server error");
      }
      const data = await res.json();

      // Backend always returns preview_url for videos now (converted or remuxed)
      // This replaces the placeholder regardless of whether conversion was needed
      if (data.preview_url) {
        setConvertedUrl(data.preview_url);
        // Also update preview canPlay so the warning banner disappears
        setPreview(p => p ? { ...p, canPlay: true } : p);
      }

      await new Promise(r => setTimeout(r, 300));
      setResult(data);
    } catch (err) {
      clearInterval(stepInterval);
      setIsConverting(false);
      setError(err.message || "Connection failed. Make sure the Flask server is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setFile(null); setPreview(null); setResult(null);
    setError(null); setProgressStep(0); setIsConverting(false);
    setConvertedUrl(null);
  };

  const fake = result?.label === "FAKE";
  const showFormatWarning = preview?.type === "video" && preview?.canPlay === false && !result;

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
              {drag && (
                <div style={{
                  position:"absolute", left:0, right:0, height:2,
                  background:"linear-gradient(90deg, transparent, #10b981, transparent)",
                  animation:"scan 1s linear infinite", top:0,
                }} />
              )}
              <div style={styles.dropIcon}><IconUpload /></div>
              <div style={styles.dropTitle}>Drop media here or click to browse</div>
              <div style={styles.dropSub}>Supports images and videos in all common formats</div>
              <div style={styles.fileTypes}>
                {["JPG","PNG","WEBP"].map(t => <span key={t} style={styles.tag(true)}>{t}</span>)}
                {["MP4","WEBM"].map(t => <span key={t} style={styles.tag(true)}>{t} ✓</span>)}
                {["MOV","AVI","MKV"].map(t => <span key={t} style={styles.tag(false)}>{t} →ffmpeg</span>)}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={onInputChange} />
            </div>
          )}

          {/* Format warning for unsupported video */}
          {showFormatWarning && (
            <div style={styles.formatWarning}>
              <div style={styles.formatWarningIcon}><IconWarning /></div>
              <div style={{ color: "#fbbf24" }}>
                <strong>{preview.ext.toUpperCase()} file</strong> — the codec inside this video is not supported by your browser
                {" "}(common with H.265/HEVC, ProRes, or camera-recorded MP4s).
                {" "}The video will still be <strong>analysed correctly</strong> by the backend.
                {" "}Install <strong>ffmpeg</strong> on the server for automatic conversion to a playable format.
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div style={styles.preview}>
              {preview.type === "image"
                ? <img src={preview.url} alt="preview" style={styles.previewImg} />
                : convertedUrl
                  ? /* Conversion done — play the server-converted mp4 */
                    <div style={{position:"relative"}}>
                      <video key={convertedUrl} src={convertedUrl} controls style={{ ...styles.previewImg, maxHeight: 280 }} />
                      <div style={{position:"absolute",top:8,left:8,background:"rgba(16,185,129,0.9)",color:"#030712",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,letterSpacing:"0.08em"}}>
                        ✓ CONVERTED TO MP4
                      </div>
                    </div>
                  : preview.canPlay === null
                    ? <VideoPlaceholder filename={file?.name} probing={true} />
                    : preview.canPlay
                      ? <video key={preview.url} src={preview.url} controls style={{ ...styles.previewImg, maxHeight: 280 }} />
                      : <VideoPlaceholder filename={file?.name} probing={false} />
              }
              <div style={styles.previewBar}>
                <div style={{ display:"flex", alignItems:"center" }}>
                  <span style={styles.previewIcon}>
                    {preview.type === "video" ? <IconFilm /> : <IconShield />}
                  </span>
                  <span style={{ fontSize:12, color:"#64748b" }}>{file?.name}</span>
                  <span style={{ marginLeft:8, color:"#334155" }}>
                    ({(file?.size/1024/1024).toFixed(2)} MB)
                  </span>
                </div>
                <button style={styles.clearBtn} onClick={clearAll} title="Remove">
                  <IconX />
                </button>
              </div>
            </div>
          )}

          {/* Converted video is now shown inline in the preview box above */}

          {/* Analyse button */}
          {file && !loading && preview?.canPlay !== null && (
            <button style={styles.analyzeBtn(false)} onClick={runAnalysis}>
              <span style={styles.scanIcon}><IconScan /></span>
              Run Deepfake Analysis
            </button>
          )}

          {/* Progress */}
          {loading && (
            <div style={{ borderRadius:12, border:"1px solid rgba(16,185,129,0.2)", background:"rgba(15,23,42,0.8)", marginTop:20 }}>
              <div style={{ padding:"16px 24px 0", display:"flex", alignItems:"center", gap:10 }}>
                <div style={styles.spinner} />
                <span style={{ fontSize:13, color:"#10b981" }}>
                  {isConverting ? "Converting & analysing video…" : "Analysing media…"}
                </span>
              </div>
              <ProgressSteps step={progressStep} isConverting={isConverting} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={styles.error}>
              <div style={styles.errorIcon}><IconWarning /></div>
              <div>
                <div style={{ fontWeight:600, marginBottom:4 }}>Analysis Failed</div>
                {error}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={styles.result(fake)}>
              <div style={styles.resultHeader(fake)}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
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

              <div style={styles.meterWrap}>
                <div style={styles.meterLabel}><span>Authentic</span><span>Fake</span></div>
                <div style={styles.meterTrack}>
                  <div style={styles.meterFill(result.fake_probability, fake)} />
                </div>
                <div style={{ ...styles.meterLabel, marginTop:6, marginBottom:0 }}>
                  <span style={{ color:"#10b981" }}>{result.authentic_probability}%</span>
                  <span style={{ color:"#ef4444" }}>{result.fake_probability}%</span>
                </div>
              </div>

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
                ) : result.features && (
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

              {result.features && (
                <div style={styles.features}>
                  <div style={styles.featTitle}>Signal Breakdown</div>
                  <div className="feat-grid" style={styles.featGrid}>
                    {[
                      { label:"Sharpness", max:800, val:result.features.sharpness },
                      { label:"Noise Level", max:20, val:result.features.noise_level },
                      { label:"Color Variance", max:60, val:result.features.color_variance },
                      { label:"Freq. Artifacts", max:1000, val:result.features.frequency_artifacts },
                    ].map(f => (
                      <div key={f.label} style={styles.featRow}>
                        <span style={styles.featName}>{f.label}</span>
                        <span style={styles.featVal}>{f.val}</span>
                        <div style={styles.featBarTrack}>
                          <div style={styles.featBarFill((f.val / f.max) * 100)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.metaRow}>
                <span>File: {result.filename}</span>
                <span>ffmpeg: {result.ffmpeg_available ? "✓ available" : "✗ not found"}</span>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ marginTop:40, padding:"16px 20px", borderRadius:8, background:"rgba(15,23,42,0.6)", border:"1px solid rgba(71,85,105,0.2)" }}>
            <p style={{ fontSize:11, color:"#334155", lineHeight:1.6 }}>
              <span style={{ color:"#475569", fontWeight:600 }}>ℹ Note: </span>
              This demo uses heuristic image analysis. Replace the backend model with a CNN (e.g. EfficientNet-B4 on FaceForensics++) for production use.
              MP4 and WEBM play natively. AVI, MOV, MKV require ffmpeg installed on the server for conversion and preview.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
