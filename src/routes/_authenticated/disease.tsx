import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { diagnosePlant } from "@/lib/plant-disease.functions";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { Camera, Upload, Loader2, CheckCircle2, AlertTriangle, Mic, Square } from "lucide-react";

export const Route = createFileRoute("/_authenticated/disease")({
  head: () => ({ meta: [{ title: "تشخيص أمراض النباتات — AgriPen" }] }),
  component: DiseasePage,
});

type Result = {
  plant?: string; healthy?: boolean; disease?: string | null; severity?: string | null;
  symptoms?: string[]; causes?: string[]; treatment?: string[]; prevention?: string[]; advice?: string;
};

function DiseasePage() {
  const { t } = useT();
  const diag = useServerFn(diagnosePlant);
  const { profile } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [plantType, setPlantType] = useState("");
  const [voiceSymptoms, setVoiceSymptoms] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcmRef = useRef<Float32Array[]>([]);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = r.result as string;
      // Downscale to max 1024px for faster AI inference
      try {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        setImageUrl(c.toDataURL("image/jpeg", 0.82));
      } catch { setImageUrl(dataUrl); }
      setResult(null); setErr(null);
    };
    r.readAsDataURL(f);
  };

  const startRec = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      pcmRef.current = [];
      node.onaudioprocess = (e) => pcmRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(ctx.destination);
      setRecording(true);
    } catch { setErr("الميكروفون غير مسموح"); }
  };

  const stopRec = async () => {
    setRecording(false);
    const ctx = audioCtxRef.current;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    nodeRef.current?.disconnect();
    if (!ctx) return;
    const blob = encodeWav(pcmRef.current, ctx.sampleRate);
    await ctx.close();
    audioCtxRef.current = null;
    if (blob.size < 2048) { setErr("التسجيل قصير جدا"); return; }
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "voice.wav");
      const res = await fetch("/api/stt", { method: "POST", body: fd });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      // /api/stt returns SSE by default; parse deltas or final done.
      let combined = "";
      for (const line of text.split("\n")) {
        const s = line.trim(); if (!s.startsWith("data:")) continue;
        try {
          const evt = JSON.parse(s.slice(5).trim());
          if (evt.type === "transcript.text.delta" && evt.delta) combined += evt.delta;
          else if (evt.type === "transcript.text.done" && evt.text) combined = evt.text;
        } catch { /* ignore */ }
      }
      if (!combined) { try { const j = JSON.parse(text); combined = j.text ?? ""; } catch { /* ignore */ } }
      setVoiceSymptoms((prev) => (prev ? prev + " " : "") + combined.trim());
    } catch (e) { setErr(e instanceof Error ? e.message : "فشل التحويل"); }
    finally { setTranscribing(false); }
  };

  const run = async () => {
    if (!imageUrl) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const res = await diag({ data: {
        imageDataUrl: imageUrl,
        plantType: plantType || undefined,
        voiceSymptoms: voiceSymptoms || undefined,
        userName: profile?.full_name ?? undefined,
      } });
      setResult(res as Result);
    } catch (e) { setErr(e instanceof Error ? e.message : "خطأ"); }
    finally { setLoading(false); }
  };

  return (
    <AppShell title={t("dis.title")}>
      <PageHeader icon="🌿" title={t("dis.title")} subtitle={t("dis.subtitle")} />

      <GlassCard>
        <div className="rounded-3xl border-2 border-dashed border-primary/40 bg-white/30 dark:bg-white/5 p-6 text-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="mx-auto max-h-64 rounded-2xl shadow-lg" />
          ) : (
            <div className="py-10">
              <div className="text-6xl mb-3">📸</div>
              <p className="font-semibold">{t("dis.pick")}</p>
              <p className="text-xs text-muted-foreground mt-1">JPG / PNG</p>
            </div>
          )}
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <label className="cursor-pointer rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 font-semibold flex items-center gap-2 active:scale-95">
              <Camera className="size-4" /> {t("dis.capture")}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
            </label>
            <label className="cursor-pointer rounded-2xl bg-white/70 dark:bg-white/10 px-4 py-2.5 font-semibold flex items-center gap-2 active:scale-95">
              <Upload className="size-4" /> {t("dis.gallery")}
              <input type="file" accept="image/*" className="hidden" onChange={onPick} />
            </label>
          </div>
        </div>

        <label className="mt-4 block bg-white/40 dark:bg-white/10 rounded-2xl p-3">
          <span className="text-xs text-muted-foreground">{t("dis.plant_type")}</span>
          <input value={plantType} onChange={(e) => setPlantType(e.target.value)} placeholder={t("dis.plant_type_ph")} className="bg-transparent w-full font-medium outline-none mt-1" />
        </label>

        {/* Voice symptoms */}
        <div className="mt-3 bg-white/40 dark:bg-white/10 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t("dis.voice_desc")}</span>
            <button
              onClick={() => (recording ? void stopRec() : void startRec())}
              disabled={transcribing}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50 ${recording ? "bg-red-500 text-white animate-pulse" : "bg-primary text-primary-foreground"}`}
            >
              {transcribing ? <><Loader2 className="size-4 animate-spin" /> {t("dis.voice_transcribing")}</>
                : recording ? <><Square className="size-4" /> {t("dis.voice_stop")}</>
                : <><Mic className="size-4" /> {t("dis.voice_start")}</>}
            </button>
          </div>
          {voiceSymptoms && (
            <p className="mt-2 text-sm bg-white/60 dark:bg-white/10 rounded-xl px-3 py-2">{voiceSymptoms}</p>
          )}
        </div>

        <button onClick={run} disabled={!imageUrl || loading} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground font-bold py-3.5 shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="size-5 animate-spin" /> {t("dis.diagnosing")}</> : <>🔬 {t("dis.diagnose")}</>}
        </button>
      </GlassCard>

      {err && <GlassCard className="mt-4 border-destructive/30"><p className="text-sm text-destructive">{err}</p></GlassCard>}

      {result && (
        <GlassCard className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            {result.healthy ? (
              <div className="size-12 rounded-2xl bg-emerald-500 text-white grid place-items-center"><CheckCircle2 className="size-7" /></div>
            ) : (
              <div className={`size-12 rounded-2xl text-white grid place-items-center ${result.severity === "high" ? "bg-red-600" : result.severity === "medium" ? "bg-amber-500" : "bg-yellow-500"}`}><AlertTriangle className="size-7" /></div>
            )}
            <div>
              <h2 className="text-xl font-bold">{result.plant ?? "—"}</h2>
              <p className="text-sm text-muted-foreground">
                {result.healthy ? `✅ ${t("dis.healthy_ok")}` : `⚠️ ${result.disease ?? ""}`}
                {result.severity && !result.healthy && ` • ${result.severity === "high" ? t("dis.severity_high") : result.severity === "medium" ? t("dis.severity_medium") : t("dis.severity_low")}`}
              </p>
            </div>
          </div>

          {result.advice && (
            <div className="bg-primary/10 rounded-2xl p-3 mb-3">
              <p className="text-sm leading-relaxed">💬 {result.advice}</p>
            </div>
          )}

          <ResultBlock title={`🔍 ${t("dis.res.symptoms")}`} items={result.symptoms} />
          <ResultBlock title={`📋 ${t("dis.res.causes")}`}  items={result.causes} />
          <ResultBlock title={`💊 ${t("dis.res.treatment")}`} items={result.treatment} accent />
          <ResultBlock title={`🛡️ ${t("dis.res.prevention")}`} items={result.prevention} />
        </GlassCard>
      )}
    </AppShell>
  );
}

function ResultBlock({ title, items, accent }: { title: string; items?: string[]; accent?: boolean }) {
  if (!items?.length) return null;
  return (
    <div className={`rounded-2xl p-3 mb-2 ${accent ? "bg-accent/15" : "bg-white/40 dark:bg-white/10"}`}>
      <h3 className="font-bold text-sm mb-1.5">{title}</h3>
      <ul className="text-sm space-y-1">
        {items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{it}</li>)}
      </ul>
    </div>
  );
}

// --- Minimal 16-bit PCM WAV encoder (mono, downsampled to 16 kHz) ---
function encodeWav(chunks: Float32Array[], srcRate: number): Blob {
  const flat = flatten(chunks);
  const targetRate = 16000;
  const down = srcRate === targetRate ? flat : downsample(flat, srcRate, targetRate);
  const buf = new ArrayBuffer(44 + down.length * 2);
  const view = new DataView(buf);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF"); view.setUint32(4, 36 + down.length * 2, true);
  writeStr(8, "WAVE"); writeStr(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, "data"); view.setUint32(40, down.length * 2, true);
  let off = 44;
  for (let i = 0; i < down.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, down[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
function flatten(chunks: Float32Array[]): Float32Array {
  let total = 0; for (const c of chunks) total += c.length;
  const out = new Float32Array(total); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
function downsample(buf: Float32Array, srcRate: number, targetRate: number): Float32Array {
  if (targetRate >= srcRate) return buf;
  const ratio = srcRate / targetRate;
  const outLen = Math.floor(buf.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio), end = Math.min(buf.length, Math.floor((i + 1) * ratio));
    let sum = 0, count = 0;
    for (let j = start; j < end; j++) { sum += buf[j]; count++; }
    out[i] = count ? sum / count : 0;
  }
  return out;
}
