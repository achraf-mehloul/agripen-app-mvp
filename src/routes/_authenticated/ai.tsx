import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { chat } from "@/lib/chat.functions";
import { generateAdvice } from "@/lib/advice.functions";
import { DIALECTS, SOIL_LATEST } from "@/lib/mockData";
import { useAuth } from "@/lib/auth-context";
import {
  Send, Volume2, Loader2, Mic, Square, Phone, PhoneOff,
  MessageCircle, AudioLines, PhoneCall, FlaskConical, Sparkles, Radio,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "المساعد الذكي — AgriPen" }] }),
  component: AIHub,
});

type Mode = "chat" | "voice-msg" | "voice-call" | "soil";
type Msg = { role: "user" | "assistant"; content: string; audioUrl?: string };

// ============ WAV encoder (PCM 16-bit mono, 16 kHz) ============
function downsample(buf: Float32Array, from: number, to: number): Float32Array {
  if (to === from) return buf;
  const ratio = from / to;
  const len = Math.floor(buf.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const start = Math.floor(i * ratio), end = Math.floor((i + 1) * ratio);
    let s = 0, c = 0;
    for (let j = start; j < end && j < buf.length; j++) { s += buf[j]; c++; }
    out[i] = c ? s / c : 0;
  }
  return out;
}
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const merged = new Float32Array(chunks.reduce((a, c) => a + c.length, 0));
  let off = 0; for (const c of chunks) { merged.set(c, off); off += c.length; }
  const target = 16000;
  const pcm = downsample(merged, sampleRate, target);
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

function AIHub() {
  const { profile } = useAuth();
  const userName = profile?.full_name ?? "";
  const [mode, setMode] = useState<Mode>("chat");
  const [dialect, setDialect] = useState(profile?.dialect ?? "darija");
  useEffect(() => { if (profile?.dialect) setDialect(profile.dialect); }, [profile?.dialect]);

  return (
    <AppShell title="المساعد الذكي">
      <PageHeader icon="✨" title="المساعد الذكي" subtitle="محادثة + صوت + تحليل التربة في مكان واحد" />

      {/* Mode pills */}
      <div className="glass rounded-3xl p-1.5 grid grid-cols-4 gap-1 mb-3">
        <ModeBtn icon={MessageCircle} label="محادثة" active={mode === "chat"}        onClick={() => setMode("chat")} />
        <ModeBtn icon={AudioLines}    label="صوت"    active={mode === "voice-msg"}   onClick={() => setMode("voice-msg")} />
        <ModeBtn icon={PhoneCall}     label="مكالمة" active={mode === "voice-call"}  onClick={() => setMode("voice-call")} />
        <ModeBtn icon={FlaskConical}  label="التربة" active={mode === "soil"}        onClick={() => setMode("soil")} />
      </div>

      {/* Dialect selector */}
      <div className="glass rounded-2xl p-2.5 flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground px-1.5">🗣️ اللهجة:</span>
        <select
          value={dialect}
          onChange={(e) => setDialect(e.target.value)}
          className="bg-transparent text-sm font-semibold outline-none flex-1"
        >
          {DIALECTS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>

      {mode === "chat"       && <ChatPanel dialect={dialect} userName={userName} />}
      {mode === "voice-msg"  && <VoicePanel dialect={dialect} userName={userName} />}
      {mode === "voice-call" && <CallPanel dialect={dialect} userName={userName} />}
      {mode === "soil"       && <SoilPanel dialect={dialect} userName={userName} />}
    </AppShell>
  );
}

function ModeBtn({ icon: Icon, label, active, onClick }: { icon: typeof MessageCircle; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all ${active ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-lg" : "text-muted-foreground active:scale-95"}`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

// ============ helpers ============
async function ttsBlob(text: string, dialect: string): Promise<Blob> {
  const r = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dialect }),
  });
  if (!r.ok) throw new Error(await r.text());
  return await r.blob();
}
async function transcribe(blob: Blob): Promise<string> {
  const fd = new FormData(); fd.append("file", blob, "recording.wav");
  const r = await fetch("/api/stt", { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return ((await r.json()) as { text: string }).text.trim();
}
function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(URL.createObjectURL(blob));
    a.onended = () => resolve();
    a.onerror = () => resolve();
    void a.play();
  });
}

// ============ Chat panel ============
function ChatPanel({ dialect, userName }: { dialect: string; userName: string }) {
  const send = useServerFn(chat);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "سلام عليكم! أنا مساعد AgriPen 🌱 قلي شنوا تحتاج فالحقل اليوم؟" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const onSend = async () => {
    const t = input.trim(); if (!t || busy) return;
    setInput(""); setBusy(true);
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    try {
      const res = await send({ data: { messages: next, dialect, userName } });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: e instanceof Error ? e.message : "خطأ" }]);
    } finally { setBusy(false); }
  };

  const speak = async (text: string) => {
    try { await playBlob(await ttsBlob(text, dialect)); } catch { /* ignore */ }
  };

  const SUGGESTIONS = [
    "واش نزرع هاد الموسم؟",
    "كيفاش نعرف إذا التربة محتاجة ماء؟",
    "أوراق الطماطم صفرات، علاش؟",
    "أحسن وقت للتسميد؟",
  ];

  return (
    <GlassCard className="!p-4 min-h-[58dvh] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 shadow-sm ${m.role === "user" ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground rounded-bl-md" : "bg-white/70 dark:bg-white/10 rounded-br-md"}`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.role === "assistant" && (
                <button onClick={() => speak(m.content)} className="mt-1.5 text-xs inline-flex items-center gap-1 opacity-70 hover:opacity-100">
                  <Volume2 className="size-3" /> استمع
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-end"><div className="bg-white/70 dark:bg-white/10 rounded-3xl px-4 py-2.5"><Loader2 className="size-4 animate-spin" /></div></div>}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex gap-2 flex-wrap mt-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 hover:bg-white active:scale-95 transition">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="اكتب سؤالك..."
          className="flex-1 bg-white/60 dark:bg-white/10 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 text-sm"
        />
        <button onClick={onSend} disabled={busy} className="size-12 rounded-2xl bg-gradient-to-br from-primary to-leaf text-primary-foreground grid place-items-center disabled:opacity-50 active:scale-95 shadow-lg">
          <Send className="size-5" />
        </button>
      </div>
    </GlassCard>
  );
}

// ============ Voice message panel ============
function VoicePanel({ dialect, userName }: { dialect: string; userName: string }) {
  const send = useServerFn(chat);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "دوس على الميكروفون باش تهدر معايا 🎙️" },
  ]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<null | "transcribe" | "thinking" | "speaking">(null);
  const recRef = useRef<{ stream: MediaStream; ctx: AudioContext; src: MediaStreamAudioSourceNode; node: ScriptProcessorNode; chunks: Float32Array[] } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const startRec = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    src.connect(node); node.connect(ctx.destination);
    recRef.current = { stream, ctx, src, node, chunks };
    setRecording(true);
  };
  const stopRec = async (): Promise<Blob | null> => {
    const r = recRef.current; if (!r) return null;
    r.stream.getTracks().forEach((t) => t.stop());
    r.node.disconnect(); r.src.disconnect();
    const blob = encodeWav(r.chunks, r.ctx.sampleRate);
    await r.ctx.close(); recRef.current = null; setRecording(false);
    if (blob.size < 2048) return null;
    return blob;
  };

  const onTap = async () => {
    if (busy) return;
    if (!recording) { await startRec().catch(() => alert("تعذر الوصول للميكروفون")); return; }
    const blob = await stopRec();
    if (!blob) { alert("التسجيل قصير جدا"); return; }
    setBusy("transcribe");
    try {
      const userText = await transcribe(blob);
      if (!userText) { setBusy(null); return; }
      const next: Msg[] = [...messages, { role: "user", content: userText }];
      setMessages(next);
      setBusy("thinking");
      const res = await send({ data: { messages: next.map(({ role, content }) => ({ role, content })), dialect, userName } });
      setBusy("speaking");
      const audio = await ttsBlob(res.text, dialect);
      setMessages([...next, { role: "assistant", content: res.text, audioUrl: URL.createObjectURL(audio) }]);
      await playBlob(audio);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "خطأ" }]);
    } finally { setBusy(null); }
  };

  const statusText = busy === "transcribe" ? "نسمعك..." : busy === "thinking" ? "نفكر..." : busy === "speaking" ? "نحضر الصوت..." : recording ? "جاري التسجيل... اضغط للإيقاف" : "اضغط للتسجيل";

  return (
    <GlassCard className="!p-4 min-h-[58dvh] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 shadow-sm ${m.role === "user" ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground rounded-bl-md" : "bg-white/70 dark:bg-white/10 rounded-br-md"}`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.audioUrl && <audio controls src={m.audioUrl} className="mt-2 w-full h-8" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col items-center mt-4">
        <button
          onClick={onTap}
          disabled={!!busy}
          className={`size-24 rounded-full grid place-items-center text-white shadow-2xl transition active:scale-95 relative ${recording ? "bg-gradient-to-br from-rose-500 to-red-600" : "bg-gradient-to-br from-primary to-leaf"} disabled:opacity-50`}
        >
          {recording && <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />}
          {busy ? <Loader2 className="size-9 animate-spin" /> : recording ? <Square className="size-9" /> : <Mic className="size-10" />}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-3 font-medium">{statusText}</p>
      </div>
    </GlassCard>
  );
}

// ============ Voice call panel ============
function CallPanel({ dialect, userName }: { dialect: string; userName: string }) {
  const send = useServerFn(chat);
  const [callOn, setCallOn] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState<Msg[]>([]);
  const callOnRef = useRef(false);
  const recRef = useRef<{ stream: MediaStream; ctx: AudioContext; src: MediaStreamAudioSourceNode; node: ScriptProcessorNode; chunks: Float32Array[] } | null>(null);

  const startRec = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    src.connect(node); node.connect(ctx.destination);
    recRef.current = { stream, ctx, src, node, chunks };
  };
  const stopRec = async (): Promise<Blob | null> => {
    const r = recRef.current; if (!r) return null;
    r.stream.getTracks().forEach((t) => t.stop());
    r.node.disconnect(); r.src.disconnect();
    const blob = encodeWav(r.chunks, r.ctx.sampleRate);
    await r.ctx.close(); recRef.current = null;
    return blob.size < 2048 ? null : blob;
  };

  const startCall = async () => {
    setCallOn(true); callOnRef.current = true; setTranscript([{ role: "assistant", content: "🟢 المكالمة بدأت — هدر معايا!" }]);
    while (callOnRef.current) {
      setCallStatus("listening");
      try { await startRec(); } catch { break; }
      await new Promise((r) => setTimeout(r, 5000));
      if (!callOnRef.current) { await stopRec(); break; }
      const blob = await stopRec();
      if (!blob) continue;
      setCallStatus("thinking");
      try {
        const userText = await transcribe(blob);
        if (!userText) continue;
        const next: Msg[] = [...transcript, { role: "user", content: userText }];
        setTranscript(next);
        const res = await send({ data: { messages: next.map(({ role, content }) => ({ role, content })), dialect, userName } });
        setTranscript([...next, { role: "assistant", content: res.text }]);
        if (!callOnRef.current) break;
        setCallStatus("speaking");
        await playBlob(await ttsBlob(res.text, dialect));
      } catch { /* loop on errors */ }
    }
    setCallStatus("idle"); setCallOn(false);
  };
  const endCall = async () => { callOnRef.current = false; setCallOn(false); await stopRec(); setCallStatus("idle"); };

  return (
    <GlassCard className="!p-6 min-h-[58dvh] flex flex-col items-center text-center">
      {/* Avatar */}
      <div className={`relative size-44 rounded-full grid place-items-center shadow-2xl mb-5 transition-all ${callOn ? "bg-gradient-to-br from-emerald-400 via-primary to-leaf" : "bg-gradient-to-br from-slate-400 to-slate-600"}`}>
        <Sparkles className="size-20 text-white drop-shadow-lg" />
        {callOn && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <span className="absolute -inset-4 rounded-full border-2 border-primary/30 animate-pulse" />
          </>
        )}
      </div>

      <h2 className="text-xl font-bold">مساعد AgriPen</h2>
      <p className="text-sm text-muted-foreground mt-1 min-h-[1.5rem]">
        {!callOn && callStatus === "idle" && "اضغط على الزر الأخضر لبدء المكالمة"}
        {callOn && callStatus === "listening" && "🎙️ يستمع لك (5 ثوان)..."}
        {callOn && callStatus === "thinking"  && "💭 يفكر في الجواب..."}
        {callOn && callStatus === "speaking"  && "🔊 يتكلم..."}
      </p>

      <div className="mt-6">
        {!callOn ? (
          <button onClick={startCall} className="rounded-full bg-gradient-to-br from-emerald-500 to-green-700 text-white size-20 grid place-items-center shadow-2xl active:scale-95 hover:shadow-emerald-500/50">
            <Phone className="size-9" />
          </button>
        ) : (
          <button onClick={endCall} className="rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white size-20 grid place-items-center shadow-2xl active:scale-95 hover:shadow-rose-500/50">
            <PhoneOff className="size-9" />
          </button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="w-full mt-6 max-h-44 overflow-y-auto space-y-2 text-right">
          {transcript.slice(-5).map((m, i) => (
            <div key={i} className={`rounded-2xl px-3 py-2 text-xs ${m.role === "user" ? "bg-white/50 dark:bg-white/10" : "bg-primary/15"}`}>
              <span className="font-bold">{m.role === "user" ? "أنت: " : "🤖 "}</span>{m.content}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ============ Soil panel (auto-read via Bluetooth/WiFi, then AI) ============
const SOIL_FIELDS: Array<[keyof typeof SOIL_LATEST, string, string, string]> = [
  ["moisture", "الرطوبة", "%", "💧"],
  ["temperature", "الحرارة", "°C", "🌡️"],
  ["ph", "الحموضة pH", "", "🧪"],
  ["salinity", "الملوحة", "dS/m", "🧂"],
  ["nitrogen", "النيتروجين N", "mg/kg", "🌱"],
  ["phosphorus", "الفوسفور P", "mg/kg", "⚗️"],
  ["potassium", "البوتاسيوم K", "mg/kg", "🪨"],
  ["organic", "المادة العضوية", "%", "🍂"],
];

function SoilPanel({ dialect, userName }: { dialect: string; userName: string }) {
  const advise = useServerFn(generateAdvice);
  const [form, setForm] = useState({ ...SOIL_LATEST, crop: "طماطم" });
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const run = async () => {
    setLoading(true); setText("");
    try {
      const res = await advise({ data: { ...form, dialect, userName } });
      setText(res.text);
    } catch (e) { setText(e instanceof Error ? e.message : "خطأ"); }
    finally { setLoading(false); }
  };

  const speak = async () => {
    if (!text) return; setSpeaking(true);
    try { await playBlob(await ttsBlob(text, dialect)); }
    catch { /* ignore */ }
    finally { setSpeaking(false); }
  };

  return (
    <div className="space-y-3">
      <GlassCard className="bg-gradient-to-br from-emerald-500/15 via-primary/10 to-leaf/15">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-leaf text-white grid place-items-center shadow-lg">
            <Radio className="size-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">قلم AgriPen — قراءة تلقائية</h3>
            <p className="text-xs text-muted-foreground">البيانات تصل عبر البلوتوث/Wi-Fi مباشرة من الجهاز</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-700 font-bold">متصل</span>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-bold mb-3 flex items-center gap-2"><FlaskConical className="size-4 text-primary" /> القراءات الحالية</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SOIL_FIELDS.map(([k, label, unit, emoji]) => (
            <label key={k} className="bg-white/40 dark:bg-white/10 rounded-2xl p-3 block">
              <div className="flex items-center gap-2 mb-1">
                <span>{emoji}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number" step="0.1"
                  value={form[k] as number}
                  onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                  className="bg-transparent w-full font-bold text-lg outline-none"
                />
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>
            </label>
          ))}
        </div>

        <label className="mt-3 bg-white/40 dark:bg-white/10 rounded-2xl p-3 block">
          <span className="text-xs text-muted-foreground">المحصول المستهدف</span>
          <input
            value={form.crop}
            onChange={(e) => setForm({ ...form, crop: e.target.value })}
            className="bg-transparent w-full font-semibold outline-none mt-1"
          />
        </label>

        <button
          onClick={run}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground font-bold py-3.5 shadow-lg active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="size-5 animate-spin" /> جاري التحليل بالذكاء الاصطناعي...</> : <><Sparkles className="size-5" /> حلل وأعطيني نصيحة</>}
        </button>
      </GlassCard>

      {text && (
        <GlassCard className="bg-gradient-to-br from-primary/10 to-leaf/5">
          <h3 className="font-bold mb-2 flex items-center gap-2">🤖 نصيحة AgriPen</h3>
          <p className="whitespace-pre-wrap leading-loose text-sm">{text}</p>
          <button onClick={speak} disabled={speaking} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-accent text-accent-foreground px-4 py-2 font-bold active:scale-95 disabled:opacity-50">
            {speaking ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />} {speaking ? "..." : "استمع بالصوت"}
          </button>
        </GlassCard>
      )}
    </div>
  );
}
