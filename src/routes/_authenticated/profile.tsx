import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { pushSupported, subscribeToPush, unsubscribeFromPush, currentPushEndpoint } from "@/lib/push";
import { savePushSubscription, removePushSubscription, sendTestPush } from "@/lib/push.functions";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { ANALYTICS, HISTORY, NOTIFICATIONS } from "@/lib/mockData";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { computeBadges } from "@/lib/badges";
import { exportReportPdf } from "@/lib/pdf-report";
import { haptic } from "@/lib/haptics";
import {
  Bell, TreeDeciduous, CloudSun, Moon, History as HistoryIcon,
  BarChart3, Droplets, FlaskConical, ShieldCheck, Bug, LogOut, Languages, Mic2,
  Award, FileDown,
} from "lucide-react";
import logo from "@/assets/agripen-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "الحساب — AgriPen" }] }),
  component: ProfilePage,
});

type Period = "3m" | "6m" | "1y" | "5y" | "10y";

function ProfilePage() {
  const { settings, update } = useSettings();
  const { profile, user, updateProfile, signOut } = useAuth();
  const [tab, setTab] = useState<"overview" | "history" | "analytics" | "notifications">("overview");
  const [period, setPeriod] = useState<Period>("6m");

  const [farmCount, setFarmCount] = useState(0);
  const [hectares, setHectares] = useState(0);
  const [firstLocation, setFirstLocation] = useState("—");
  const [readingCount, setReadingCount] = useState(0);
  const badges = useMemo(() => computeBadges({ farms: farmCount, hectares, readings: readingCount, analyses: HISTORY.length }), [farmCount, hectares, readingCount]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data, count } = await supabase
        .from("farms")
        .select("wilaya, baladia, area_hectares", { count: "exact" })
        .eq("user_id", user.id);
      const rows = (data ?? []) as Array<{ wilaya: string | null; baladia: string | null; area_hectares: number | null }>;
      setFarmCount(count ?? rows.length);
      setHectares(rows.reduce((s, r) => s + (Number(r.area_hectares) || 0), 0));
      const first = rows[0];
      if (first) setFirstLocation(`${first.wilaya ?? ""}${first.baladia ? "، " + first.baladia : ""}`);
      const { count: rc } = await supabase.from("soil_readings").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      setReadingCount(rc ?? 0);
    })();
  }, [user]);

  const cutoffDays: Record<Period, number> = { "3m": 90, "6m": 180, "1y": 365, "5y": 1825, "10y": 3650 };
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const max = cutoffDays[period] * 86400_000;
    return HISTORY.filter((h) => now - new Date(h.date).getTime() <= max);
  }, [period]);

  const name = profile?.full_name?.trim() || profile?.email || "—";

  return (
    <AppShell title="الحساب">
      <GlassCard className="!p-6 bg-gradient-to-br from-primary/25 via-leaf/15 to-emerald-300/15 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 size-44 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="size-20 rounded-3xl bg-gradient-to-br from-primary to-leaf grid place-items-center text-white text-3xl font-black shadow-2xl">
            {name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight truncate">{name}</h2>
            <p className="text-sm text-muted-foreground truncate">{profile?.email ?? ""}</p>
            <p className="text-xs mt-1">📍 {firstLocation}</p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5">
          <MiniStat value={farmCount} label="مزارع" />
          <MiniStat value={hectares ? hectares.toFixed(1) : 0} label="هكتار" />
          <MiniStat value={HISTORY.length} label="تحليل" />
        </div>
      </GlassCard>

      <div className="glass rounded-3xl p-1.5 grid grid-cols-4 gap-1 mt-4">
        <TabBtn label="نظرة"      active={tab === "overview"}      onClick={() => setTab("overview")} />
        <TabBtn label="السجل"     active={tab === "history"}       onClick={() => setTab("history")} />
        <TabBtn label="تحليلات"   active={tab === "analytics"}     onClick={() => setTab("analytics")} />
        <TabBtn label="تنبيهات"   active={tab === "notifications"} onClick={() => setTab("notifications")} />
      </div>

      {tab === "overview" && (
        <>
          <GlassCard className="mt-4">
            <h3 className="font-bold mb-3">الأقسام</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { to: "/irrigation",    label: "الري",       icon: "💧" },
                { to: "/timeline",      label: "السجل",      icon: "🕒" },
                { to: "/pests",         label: "الآفات",     icon: "🐛" },
                { to: "/trees",         label: "الأشجار",    icon: "🌳" },
                { to: "/weather",       label: "الطقس",      icon: "☁️" },
                { to: "/fertilization", label: "التسميد",    icon: "🧪" },
              ].map((s) => (
                <a key={s.to} href={s.to} className="flex flex-col items-center gap-1.5 rounded-2xl p-3 bg-white/40 dark:bg-white/5 press">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-[11px] font-bold text-center">{s.label}</span>
                </a>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="mt-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Languages className="size-4 text-primary" /> اللغة واللهجة</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">اللغة</span>
                <select
                  value={profile?.language ?? "ar"}
                  onChange={(e) => void updateProfile({ language: e.target.value })}
                  className="mt-1 w-full glass rounded-2xl px-3 py-2.5 outline-none text-sm font-medium"
                >
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="zgh">ⵜⴰⵎⴰⵣⵉⵖⵜ</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">لهجة الصوت</span>
                <select
                  value={profile?.dialect ?? "darija"}
                  onChange={(e) => void updateProfile({ dialect: e.target.value })}
                  className="mt-1 w-full glass rounded-2xl px-3 py-2.5 outline-none text-sm font-medium"
                >
                  <option value="darija">دارجة جزائرية</option>
                  <option value="wahrania">وهرانية</option>
                  <option value="chelfia">شلفية</option>
                  <option value="tlemcania">تلمسانية</option>
                  <option value="charqia">شرقية</option>
                  <option value="adraria">أدرارية</option>
                </select>
              </label>
            </div>
          </GlassCard>

          <GlassCard className="mt-3">
            <h3 className="font-bold mb-3">الإعدادات</h3>
            <Setting icon={Mic2}          label="التحكم الصوتي بالتطبيق (تجريبي)" value={profile?.voice_control ?? false} onChange={() => void updateProfile({ voice_control: !profile?.voice_control })} />
            <Setting icon={Bell}          label="التنبيهات الذكية"               value={settings.notifications} onChange={() => update({ notifications: !settings.notifications })} />
            <Setting icon={TreeDeciduous} label="تفعيل قسم تحليل الأشجار"        value={settings.showTrees}     onChange={() => update({ showTrees: !settings.showTrees })} />
            <Setting icon={CloudSun}      label="تفعيل قسم الطقس"                value={settings.showWeather}   onChange={() => update({ showWeather: !settings.showWeather })} />
            <Setting icon={Moon}          label="الوضع الداكن"                    value={settings.dark}          onChange={() => update({ dark: !settings.dark })} />
          </GlassCard>

          <PushNotificationsCard />


          <GlassCard className="mt-3">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Award className="size-4 text-primary" /> شارات الإنجاز</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {badges.map((b) => (
                <div key={b.id} title={b.desc} className={`rounded-2xl p-2.5 text-center transition ${b.earned ? `bg-gradient-to-br ${b.color} text-white shadow-md` : "bg-white/40 dark:bg-white/10 text-muted-foreground opacity-60"}`}>
                  <div className="text-2xl">{b.icon}</div>
                  <div className="text-[10px] font-bold mt-1 leading-tight">{b.title}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              {badges.filter((b) => b.earned).length} / {badges.length} شارة
            </p>
          </GlassCard>

          <GlassCard className="mt-3">
            <div className="flex items-center gap-3">
              <img src={logo.url} alt="AgriPen" className="size-12 rounded-2xl" />
              <div className="flex-1">
                <h3 className="font-bold">AgriPen</h3>
                <p className="text-xs text-muted-foreground">منصة الفلاحة الذكية</p>
              </div>
            </div>
          </GlassCard>

          <button onClick={() => void signOut()} className="mt-3 w-full rounded-2xl bg-rose-500/15 text-rose-600 font-bold py-3 active:scale-95 flex items-center justify-center gap-2">
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </>
      )}

      {tab === "history" && (
        <>
          <div className="glass rounded-3xl p-1.5 grid grid-cols-5 gap-1 mt-4">
            {(["3m","6m","1y","5y","10y"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`py-2 rounded-2xl text-xs font-bold transition-all ${period === p ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-md" : "text-muted-foreground active:scale-95"}`}>
                {p === "3m" ? "٣ أشهر" : p === "6m" ? "٦ أشهر" : p === "1y" ? "سنة" : p === "5y" ? "٥ سنوات" : "١٠ سنوات"}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><HistoryIcon className="size-4" />{filteredHistory.length} تحليل خلال هذه الفترة</div>
            <button
              onClick={() => {
                haptic("medium");
                exportReportPdf({
                  title: "AgriPen History Report",
                  subtitle: `Period: ${period}`,
                  farmer: name,
                  location: firstLocation,
                  lines: [
                    { label: "Farms", value: String(farmCount) },
                    { label: "Hectares", value: hectares.toFixed(2) },
                    { label: "Soil readings", value: String(readingCount) },
                    { label: "Analyses", value: String(filteredHistory.length) },
                  ],
                  sections: [{
                    heading: "Analyses history",
                    rows: filteredHistory.map((h) => ({ label: `${h.date} · ${h.type}`, value: `${h.farm} — ${h.result}` })),
                  }],
                  footer: "Generated by AgriPen — Smart Farming for Algeria",
                }, `agripen-history-${period}.pdf`);
              }}
              className="glass rounded-xl px-3 py-1.5 flex items-center gap-1.5 font-bold text-primary active:scale-95"
            >
              <FileDown className="size-3.5" /> PDF
            </button>
          </div>
          <div className="space-y-2 mt-3">
            {filteredHistory.map((h) => (
              <GlassCard key={h.id} className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{h.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{h.type}</p>
                    <p className="text-xs text-muted-foreground">{h.farm} • {h.date}</p>
                  </div>
                </div>
                <p className="text-sm mt-2 bg-white/40 dark:bg-white/10 rounded-2xl px-3 py-2">{h.result}</p>
              </GlassCard>
            ))}
            {filteredHistory.length === 0 && (
              <GlassCard className="text-center py-8 text-sm text-muted-foreground">لا توجد تحاليل في هذه الفترة</GlassCard>
            )}
          </div>
        </>
      )}

      {tab === "analytics" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <AnalyticCard icon={Droplets}     grad="from-cyan-400 to-blue-600"      value={`${ANALYTICS.waterSaved}%`}      label="مياه موفرة" />
            <AnalyticCard icon={FlaskConical} grad="from-violet-400 to-purple-600"  value={`${ANALYTICS.fertilizerSaved}%`} label="أسمدة موفرة" />
            <AnalyticCard icon={Bug}          grad="from-rose-400 to-red-600"        value={ANALYTICS.diseaseDetected}        label="أمراض مكتشفة" />
            <AnalyticCard icon={ShieldCheck}  grad="from-emerald-400 to-green-600"   value={`${ANALYTICS.healthyFields}%`}   label="حقول صحية" />
          </div>
          <GlassCard className="mt-4">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> منحنى الإنتاجية</h3>
            <div className="flex items-end gap-2 h-48">
              {ANALYTICS.yieldTrend.map((y) => {
                const max = Math.max(...ANALYTICS.yieldTrend.map((v) => v.v));
                return (
                  <div key={y.m} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold">{y.v}</span>
                    <div className="w-full bg-gradient-to-t from-primary via-leaf to-emerald-300 rounded-t-xl shadow-md transition-all" style={{ height: `${(y.v / max) * 100}%` }} />
                    <span className="text-xs text-muted-foreground">{y.m}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      )}

      {tab === "notifications" && (
        <div className="space-y-2 mt-4">
          {!settings.notifications && (
            <GlassCard className="bg-amber-500/15 border border-amber-500/30 text-sm">
              التنبيهات معطلة. فعّلها من تبويب "نظرة" لتلقي الإشعارات.
            </GlassCard>
          )}
          {NOTIFICATIONS.map((n) => (
            <GlassCard key={n.id} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{n.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">{n.body}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function PushNotificationsCard() {
  const { t } = useT();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    setSupported(pushSupported());
    void currentPushEndpoint().then((e) => setEnabled(!!e));
  }, []);

  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      const s = await subscribeToPush();
      if (!s) { setMsg("لم يتم منح الإذن"); return; }
      await save({ data: { ...s, userAgent: navigator.userAgent } });
      setEnabled(true); haptic("success"); setMsg("تم التفعيل ✓");
    } catch (e) { setMsg(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true); setMsg(null);
    try {
      const ep = await unsubscribeFromPush();
      if (ep) await remove({ data: { endpoint: ep } });
      setEnabled(false); setMsg(null);
    } finally { setBusy(false); }
  };
  const doTest = async () => {
    setBusy(true); setMsg(null);
    try { const r = await test({}); setMsg(`✓ أُرسل إلى ${r.sent} جهاز`); }
    catch (e) { setMsg(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };

  return (
    <GlassCard className="mt-3">
      <div className="flex items-start gap-3">
        <div className={`size-11 rounded-2xl grid place-items-center shrink-0 ${enabled ? "bg-gradient-to-br from-primary to-leaf text-white shadow-md" : "bg-white/40 dark:bg-white/10"}`}>
          <Bell className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">{enabled ? t("push.enabled") : t("push.enable")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{supported ? t("push.description") : t("push.unsupported")}</p>
        </div>
      </div>
      {supported && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {enabled ? (
            <>
              <button disabled={busy} onClick={() => void doTest()} className="rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold press disabled:opacity-50">{t("push.test")}</button>
              <button disabled={busy} onClick={() => void disable()} className="rounded-2xl bg-white/60 dark:bg-white/10 px-3 py-2 text-xs font-bold press disabled:opacity-50">{t("push.disable")}</button>
            </>
          ) : (
            <button disabled={busy} onClick={() => void enable()} className="rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground px-4 py-2 text-xs font-bold press disabled:opacity-50">
              {busy ? "..." : t("push.enable")}
            </button>
          )}
        </div>
      )}
      {msg && <p className="text-xs mt-2 text-muted-foreground">{msg}</p>}
    </GlassCard>
  );
}

function MiniStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-white/50 dark:bg-white/10 rounded-2xl p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`py-2.5 rounded-2xl text-xs font-bold transition-all ${active ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-md" : "text-muted-foreground active:scale-95"}`}>
      {label}
    </button>
  );
}
function Setting({ icon: Icon, label, value, onChange }: { icon: typeof Bell; label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/30 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`size-9 rounded-xl grid place-items-center transition ${value ? "bg-gradient-to-br from-primary to-leaf text-white" : "bg-white/40 dark:bg-white/10 text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <button onClick={onChange}
        className={`relative w-12 h-7 rounded-full p-1 transition ${value ? "bg-primary" : "bg-white/50 dark:bg-white/20"}`}
        aria-label={label}>
        <div className={`size-5 rounded-full bg-white shadow-md transition-transform ${value ? "translate-x-[-20px]" : ""}`} />
      </button>
    </div>
  );
}
function AnalyticCard({ icon: Icon, grad, value, label }: { icon: typeof Droplets; grad: string; value: string | number; label: string }) {
  return (
    <GlassCard className="!p-4 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 size-20 rounded-full bg-gradient-to-br ${grad} opacity-25 blur-xl`} />
      <div className="relative flex items-center justify-between">
        <div className={`size-10 rounded-2xl grid place-items-center bg-gradient-to-br ${grad} text-white shadow-md`}>
          <Icon className="size-5" />
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
    </GlassCard>
  );
}
