import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { parseVoiceCommand } from "@/lib/voice-intent.functions";

// Simple WAV encoder (16 kHz mono)
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const merged = new Float32Array(chunks.reduce((a, c) => a + c.length, 0));
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  const target = 16000;
  const ratio = sampleRate / target;
  const outLen = Math.floor(merged.length / ratio);
  const pcm = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let s = 0, c = 0;
    for (let j = start; j < end && j < merged.length; j++) { s += merged[j]; c++; }
    pcm[i] = c ? s / c : 0;
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE");
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, target, true); v.setUint32(28, target * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, pcm.length * 2, true);
  let p = 44;
  for (let i = 0; i < pcm.length; i++) { const s = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true); p += 2; }
  return new Blob([buf], { type: "audio/wav" });
}

type State = "idle" | "recording" | "processing" | "speaking";

export function VoiceFAB() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const parse = useServerFn(parseVoiceCommand);
  const [state, setState] = useState<State>("idle");
  const [flash, setFlash] = useState<string | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);

  // Always available — user can still disable via profile.voice_control === false explicitly
  if (profile?.voice_control === false) return null;

  const start = async () => {
    setFlash(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(node); node.connect(ctx.destination);
      setState("recording");
    } catch { setFlash("لم يُسمح بالميكروفون"); setTimeout(() => setFlash(null), 2500); }
  };

  const stop = async () => {
    const ctx = ctxRef.current;
    const stream = streamRef.current;
    const node = nodeRef.current;
    stream?.getTracks().forEach((t) => t.stop());
    node?.disconnect();
    if (!ctx) { setState("idle"); return; }
    const blob = encodeWav(chunksRef.current, ctx.sampleRate);
    await ctx.close();
    if (blob.size < 2048) { setFlash("لم أسمعك"); setState("idle"); setTimeout(() => setFlash(null), 2000); return; }
    setState("processing");
    try {
      const form = new FormData();
      form.append("file", blob, "cmd.wav");
      const sttRes = await fetch("/api/stt", { method: "POST", body: form });
      const { text } = (await sttRes.json()) as { text: string };
      if (!text) { setFlash("لم أفهم"); setState("idle"); setTimeout(() => setFlash(null), 2000); return; }
      const intent = await parse({ data: { text, language: profile?.language ?? "ar" } });
      setFlash(`🗣️ ${text.slice(0, 40)}\n💬 ${intent.reply}`);
      // Speak reply
      setState("speaking");
      try {
        const ttsRes = await fetch("/api/tts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: intent.reply, dialect: profile?.dialect ?? "darija" }),
        });
        if (ttsRes.ok) {
          const audio = new Audio(URL.createObjectURL(await ttsRes.blob()));
          await audio.play().catch(() => {});
        }
      } catch { /* ignore */ }
      if (intent.action === "navigate") {
        setTimeout(() => { void navigate({ to: intent.to as never }); }, 400);
      }
      setTimeout(() => setFlash(null), 3500);
    } catch { setFlash("خطأ في المعالجة"); setTimeout(() => setFlash(null), 2500); }
    finally { setState("idle"); }
  };

  const busy = state === "processing" || state === "speaking";
  const recording = state === "recording";

  return (
    <div className="fixed bottom-24 lg:bottom-8 left-4 z-50 flex flex-col items-start gap-2">
      {flash && (
        <div className="glass rounded-2xl px-3 py-2 text-xs max-w-[240px] whitespace-pre-line shadow-xl">
          {flash}
        </div>
      )}
      <button
        onClick={recording ? () => void stop() : () => void start()}
        disabled={busy}
        aria-label="تحكم صوتي"
        className={`size-14 rounded-full shadow-2xl grid place-items-center text-white transition-all active:scale-95
          ${recording ? "bg-rose-500 animate-pulse" : "bg-gradient-to-br from-primary to-leaf"}
          ${busy ? "opacity-70" : ""}`}
      >
        {busy ? <Loader2 className="size-6 animate-spin" /> : recording ? <Square className="size-6" /> : <Mic className="size-6" />}
      </button>
    </div>
  );
}
