import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { WILAYAS } from "@/lib/wilayas";
import { MapPin, Crosshair, Loader2, Sprout, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import logo from "@/assets/agripen-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "إعداد الحساب — AgriPen" }] }),
  component: Onboarding,
});

type Step = 1 | 2 | 3;

function Onboarding() {
  const { user, profile, updateProfile, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1 — profile
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [language, setLanguage] = useState(profile?.language ?? "ar");
  const [dialect, setDialect] = useState(profile?.dialect ?? "darija");

  // Step 2 — location
  const [wilaya, setWilaya] = useState("38");
  const [baladia, setBaladia] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [gpsBusy, setGpsBusy] = useState(false);

  // Step 3 — farm
  const [farmName, setFarmName] = useState("مزرعتي");
  const [area, setArea] = useState<number | "">("");

  const detectGps = () => {
    if (!navigator.geolocation) { setErr("الموقع غير مدعوم"); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(+pos.coords.latitude.toFixed(6));
        setLng(+pos.coords.longitude.toFixed(6));
        // reverse geocoding via Nominatim
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ar`);
          const j = await r.json();
          const a = j.address ?? {};
          if (a.state) {
            const w = WILAYAS.find((w) => a.state.includes(w.ar) || a.state.toLowerCase().includes(w.fr.toLowerCase()));
            if (w) setWilaya(w.code);
          }
          setBaladia(a.town || a.village || a.city || a.suburb || a.county || "");
        } catch { /* ignore */ }
        setGpsBusy(false);
      },
      (e) => { setErr(e.message); setGpsBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const finish = async () => {
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      const w = WILAYAS.find((w) => w.code === wilaya);
      // Save farm
      const { error: farmErr } = await supabase.from("farms").insert({
        user_id: user.id,
        name: farmName.trim() || "مزرعتي",
        wilaya: w?.ar ?? null,
        baladia: baladia.trim() || null,
        latitude: typeof lat === "number" ? lat : null,
        longitude: typeof lng === "number" ? lng : null,
        area_hectares: typeof area === "number" ? area : null,
      });
      if (farmErr) throw farmErr;

      // Update profile
      await updateProfile({
        full_name: fullName.trim(),
        language,
        dialect,
        onboarded: true,
      });
      await refresh();
      navigate({ to: "/", replace: true });
    } catch (e) { setErr(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };

  return (
    <div dir="rtl" className="min-h-dvh bg-gradient-to-br from-primary/15 via-leaf/10 to-emerald-300/10 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5 mt-2">
          <img src={logo.url} alt="AgriPen" className="size-12 rounded-2xl shadow-lg" />
          <div>
            <h1 className="text-xl font-bold">إعداد الحساب</h1>
            <p className="text-xs text-muted-foreground">الخطوة {step} من 3</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {[1,2,3].map((i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition ${i <= step ? "bg-gradient-to-r from-primary to-leaf" : "bg-white/40"}`} />
          ))}
        </div>

        <div className="glass rounded-3xl p-5 shadow-xl">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><UserIcon className="size-5 text-primary" /> معلوماتك</h2>
              <label className="block">
                <span className="text-xs text-muted-foreground">الاسم الكامل</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أشرف مهلول"
                  className="mt-1 w-full glass rounded-2xl px-4 py-3 outline-none text-sm font-medium" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">اللغة</span>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 w-full glass rounded-2xl px-3 py-3 outline-none text-sm font-medium">
                    <option value="ar">العربية</option>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">لهجة الصوت</span>
                  <select value={dialect} onChange={(e) => setDialect(e.target.value)}
                    className="mt-1 w-full glass rounded-2xl px-3 py-3 outline-none text-sm font-medium">
                    <option value="darija">دارجة جزائرية</option>
                    <option value="wahrania">وهرانية</option>
                    <option value="chelfia">شلفية</option>
                    <option value="tlemcania">تلمسانية</option>
                    <option value="charqia">شرقية</option>
                    <option value="adraria">أدرارية</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><MapPin className="size-5 text-primary" /> موقع المزرعة</h2>

              <button onClick={detectGps} disabled={gpsBusy}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 shadow active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                {gpsBusy ? <Loader2 className="size-5 animate-spin" /> : <Crosshair className="size-5" />}
                {gpsBusy ? "جاري تحديد الموقع..." : "تفعيل GPS وكشف الولاية تلقائيًا"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">الولاية</span>
                  <select value={wilaya} onChange={(e) => setWilaya(e.target.value)}
                    className="mt-1 w-full glass rounded-2xl px-3 py-3 outline-none text-sm font-medium">
                    {WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>{w.code} — {w.ar}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">البلدية / المنطقة</span>
                  <input value={baladia} onChange={(e) => setBaladia(e.target.value)}
                    placeholder="مثال: ثنية الحد"
                    className="mt-1 w-full glass rounded-2xl px-3 py-3 outline-none text-sm font-medium" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">خط العرض (Lat)</span>
                  <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value ? +e.target.value : "")}
                    className="mt-1 w-full glass rounded-2xl px-3 py-3 outline-none text-sm font-medium" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">خط الطول (Lng)</span>
                  <input type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value ? +e.target.value : "")}
                    className="mt-1 w-full glass rounded-2xl px-3 py-3 outline-none text-sm font-medium" />
                </label>
              </div>

              <p className="text-[11px] text-muted-foreground">يمكنك لاحقًا رسم حدود الأرض على الخريطة من صفحة المزرعة.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><Sprout className="size-5 text-primary" /> تفاصيل المزرعة</h2>
              <label className="block">
                <span className="text-xs text-muted-foreground">اسم المزرعة</span>
                <input value={farmName} onChange={(e) => setFarmName(e.target.value)}
                  placeholder="مثال: البستان الكبير"
                  className="mt-1 w-full glass rounded-2xl px-4 py-3 outline-none text-sm font-medium" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">المساحة (هكتار)</span>
                <input type="number" step="0.1" value={area} onChange={(e) => setArea(e.target.value ? +e.target.value : "")}
                  placeholder="مثال: 5.2"
                  className="mt-1 w-full glass rounded-2xl px-4 py-3 outline-none text-sm font-medium" />
              </label>
              <div className="bg-primary/10 rounded-2xl p-3 text-sm">
                <p className="font-bold">ملخص:</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {fullName || "—"} • {WILAYAS.find((w) => w.code === wilaya)?.ar} {baladia ? `، ${baladia}` : ""}
                  {typeof lat === "number" && typeof lng === "number" ? ` • (${lat.toFixed(3)}, ${lng.toFixed(3)})` : ""}
                </p>
              </div>
            </div>
          )}

          {err && <p className="mt-4 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{err}</p>}

          <div className="mt-5 flex gap-2">
            {step > 1 && (
              <button onClick={prev} className="flex-1 rounded-2xl bg-white/60 dark:bg-white/10 font-bold py-3 active:scale-[0.98] flex items-center justify-center gap-1">
                <ChevronRight className="size-4" /> السابق
              </button>
            )}
            {step < 3 && (
              <button onClick={next} disabled={step === 1 && !fullName.trim()}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground font-bold py-3 shadow active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1">
                التالي <ChevronLeft className="size-4" />
              </button>
            )}
            {step === 3 && (
              <button onClick={finish} disabled={busy}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground font-bold py-3 shadow active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <Sprout className="size-5" />}
                إنهاء الإعداد
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
