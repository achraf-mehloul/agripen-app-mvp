import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, GlassCard } from "@/components/AppShell";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ANALYTICS, WEATHER_FORECAST } from "@/lib/mockData";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";
import { useLatestSoil } from "@/lib/soil";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Wheat, Leaf, TreeDeciduous, CloudSun, TestTube2,
  Droplets, Thermometer, FlaskConical, Radio, TrendingUp, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "AgriPen" }] }),
  component: Dashboard,
});

type FarmRow = { name: string; wilaya: string | null; baladia: string | null; area_hectares: number | null };

function Dashboard() {
  const { settings } = useSettings();
  const { profile, user } = useAuth();
  const { t, lang } = useT();
  const { reading } = useLatestSoil(lang);
  const today = WEATHER_FORECAST[0];

  const [farm, setFarm] = useState<FarmRow | null>(null);
  const [farmCount, setFarmCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data, count } = await supabase
        .from("farms")
        .select("name, wilaya, baladia, area_hectares", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      setFarm((data?.[0] as FarmRow) ?? null);
      setFarmCount(count ?? 0);
    })();
  }, [user]);

  const QUICK = [
    { to: "/ai",            label: t("sec.ai"),            icon: Sparkles,     grad: "from-violet-500 via-fuchsia-500 to-pink-500", enabled: true },
    { to: "/crops",         label: t("sec.crops"),         icon: Wheat,        grad: "from-amber-400 via-orange-500 to-red-500",   enabled: true },
    { to: "/disease",       label: t("sec.disease"),       icon: Leaf,         grad: "from-lime-400 via-emerald-500 to-teal-600",  enabled: true },
    { to: "/fertilization", label: t("sec.fertilization"), icon: TestTube2,    grad: "from-yellow-400 via-amber-500 to-orange-600", enabled: true },
    { to: "/trees",         label: t("sec.trees"),         icon: TreeDeciduous, grad: "from-emerald-500 via-green-600 to-lime-700",  enabled: settings.showTrees },
    { to: "/weather",       label: t("sec.weather"),       icon: CloudSun,     grad: "from-sky-400 via-blue-500 to-indigo-600",     enabled: settings.showWeather },
  ].filter((q) => q.enabled);

  const displayName = profile?.full_name?.trim() || t("home.welcome");
  const location = farm ? `${farm.wilaya ?? ""}${farm.baladia ? "، " + farm.baladia : ""}` : "—";
  const hectares = farm?.area_hectares ?? 0;

  return (
    <AppShell title={t("nav.home")}>
      <PullToRefresh onRefresh={async () => { window.location.reload(); await new Promise((r) => setTimeout(r, 500)); }}>
      <GlassCard className="!p-6 relative overflow-hidden bg-gradient-to-br from-primary/25 via-leaf/15 to-accent/15">
        <div className="absolute -top-12 -left-12 size-48 rounded-full bg-leaf/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-12 size-56 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">{t("home.hello")}</p>
            <h1 className="text-2xl lg:text-3xl font-bold mt-0.5">{displayName} 👋</h1>
            <p className="text-sm mt-1 text-muted-foreground">📍 {location}{hectares ? ` • ${hectares} ${t("profile.hectares")}` : ""}</p>
          </div>
          {settings.showWeather && (
            <Link to="/weather" className="glass rounded-2xl p-3 flex items-center gap-3 active:scale-95 transition">
              <div className="text-4xl">{today.icon}</div>
              <div>
                <p className="text-2xl font-bold leading-none">{today.temp}°</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("home.humidity")} {today.humidity}%</p>
              </div>
            </Link>
          )}
        </div>
        <div className="relative mt-4 bg-white/50 dark:bg-white/10 rounded-2xl px-3 py-2.5 flex items-center gap-2">
          <Radio className={`size-4 ${reading.isReal ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium">
            {reading.isReal ? `${t("home.pen_connected")} — ${reading.taken_at}` : t("home.no_reading")}
          </p>
        </div>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("home.moisture")} value={reading.moisture != null ? `${reading.moisture}%` : "—"} hint="" icon={Droplets}    grad="from-cyan-400 to-blue-600" />
        <StatCard label={t("home.temp")}     value={reading.temperature != null ? `${reading.temperature}°` : "—"} hint="" icon={Thermometer} grad="from-orange-400 to-red-600" />
        <StatCard label={t("home.ph")}       value={reading.ph ?? "—"}          hint="" icon={FlaskConical} grad="from-violet-400 to-purple-600" />
        <StatCard label={t("home.healthy")}  value={`${ANALYTICS.healthyFields}%`} hint="" icon={ShieldCheck}  grad="from-emerald-400 to-green-600" />
      </div>

      <h2 className="mt-6 mb-3 px-1 text-sm font-bold text-muted-foreground">{t("home.quick")}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {QUICK.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.to} to={q.to} className="glass rounded-3xl p-3 flex flex-col items-center gap-2 hover:scale-[1.03] active:scale-95 transition group">
              <div className={`size-14 rounded-2xl grid place-items-center bg-gradient-to-br ${q.grad} text-white shadow-lg group-hover:shadow-2xl group-hover:rotate-3 transition`}>
                <Icon className="size-7" strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight">{q.label}</span>
            </Link>
          );
        })}
      </div>

      <GlassCard className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" /> {t("home.season")}
          </h3>
          <Link to="/profile" className="text-xs text-primary font-semibold">{t("common.details")}</Link>
        </div>
        <div className="flex items-end gap-2 h-28">
          {ANALYTICS.yieldTrend.map((y) => {
            const max = Math.max(...ANALYTICS.yieldTrend.map((v) => v.v));
            return (
              <div key={y.m} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-gradient-to-t from-primary via-leaf to-emerald-300 rounded-t-xl shadow-md transition-all" style={{ height: `${(y.v / max) * 100}%` }} />
                <span className="text-[10px] text-muted-foreground">{y.m}</span>
              </div>
            );
          })}
        </div>
        {farmCount > 0 && <p className="mt-3 text-[11px] text-muted-foreground">{farmCount} × {t("profile.farms")}</p>}
      </GlassCard>
      </PullToRefresh>
    </AppShell>
  );
}

function StatCard({ label, value, hint, icon: Icon, grad }: { label: string; value: string | number; hint: string; icon: typeof Droplets; grad: string }) {
  return (
    <div className="glass rounded-3xl p-4 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 size-20 rounded-full bg-gradient-to-br ${grad} opacity-20 blur-xl`} />
      <div className="relative flex items-center justify-between">
        <div className={`size-10 rounded-2xl grid place-items-center bg-gradient-to-br ${grad} text-white shadow-md`}>
          <Icon className="size-5" />
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm font-semibold mt-2">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
