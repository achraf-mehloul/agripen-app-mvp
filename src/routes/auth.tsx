import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Loader2, Mail, Lock, User, Sprout } from "lucide-react";
import logo from "@/assets/agripen-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — AgriPen" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "خطأ");
    } finally { setBusy(false); }
  };

  const google = async () => {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setErr(result.error.message ?? "تعذر تسجيل الدخول"); return; }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div dir="rtl" className="min-h-dvh grid place-items-center p-4 bg-gradient-to-br from-primary/15 via-leaf/10 to-emerald-300/10">
      <div className="glass rounded-[2rem] w-full max-w-md p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo.url} alt="AgriPen" className="size-14 rounded-2xl shadow-lg" />
          <div>
            <h1 className="text-2xl font-bold">AgriPen</h1>
            <p className="text-xs text-muted-foreground">منصة الفلاحة الذكية للجزائر</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-1 grid grid-cols-2 gap-1 mb-5">
          <button onClick={() => setMode("signin")} className={`py-2.5 rounded-xl text-sm font-bold transition ${mode === "signin" ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow" : "text-muted-foreground"}`}>دخول</button>
          <button onClick={() => setMode("signup")} className={`py-2.5 rounded-xl text-sm font-bold transition ${mode === "signup" ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow" : "text-muted-foreground"}`}>إنشاء حساب</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field icon={User} label="الاسم الكامل" value={fullName} onChange={setFullName} placeholder="مثال: أشرف مهلول" required />
          )}
          <Field icon={Mail} label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Field icon={Lock} label="كلمة السر" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />

          {err && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{err}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground font-bold py-3.5 shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Sprout className="size-5" />}
            {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/40" />
          <span className="text-xs text-muted-foreground">أو</span>
          <div className="flex-1 h-px bg-white/40" />
        </div>

        <button onClick={google} className="w-full rounded-2xl bg-white text-slate-800 font-bold py-3 shadow border border-slate-200 active:scale-[0.98] flex items-center justify-center gap-2">
          <GoogleIcon /> المتابعة عبر Google
        </button>

        <p className="text-[11px] text-center text-muted-foreground mt-5">
          بالمتابعة فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text", placeholder, required }: {
  icon: typeof Mail; label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-2 glass rounded-2xl px-3 py-2.5">
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          className="bg-transparent flex-1 outline-none text-sm font-medium"
        />
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-4.9c-2 1.5-4.4 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 4.9c-.4.4 6.7-4.9 6.7-14.4 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
