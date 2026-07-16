import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useLatestSoil } from "@/lib/soil";
import { planIrrigation, mockForecast } from "@/lib/irrigation";
import { useT } from "@/lib/i18n";
import { Droplets, CloudRain, Sun, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/irrigation")({
  head: () => ({ meta: [{ title: "جدول الري الذكي — AgriPen" }] }),
  component: IrrigationPage,
});

const ACTION_META: Record<string, { color: string; label: string; icon: typeof CheckCircle2 }> = {
  skip:   { color: "from-emerald-500 to-teal-600",  label: "لا تسقي",     icon: CheckCircle2 },
  light:  { color: "from-sky-400 to-sky-600",       label: "ري خفيف",     icon: Droplets },
  normal: { color: "from-blue-500 to-indigo-600",   label: "ري عادي",     icon: Droplets },
  deep:   { color: "from-rose-500 to-red-600",      label: "ري عميق",     icon: AlertCircle },
};

function IrrigationPage() {
  const { lang } = useT();
  const { reading } = useLatestSoil(lang);
  const forecast = useMemo(() => mockForecast(), []);
  const plan = useMemo(
    () => planIrrigation(reading.moisture ?? 40, forecast, 1),
    [reading.moisture, forecast],
  );

  const totalLiters = plan.reduce((s, d) => s + d.amountL, 0);
  const skipDays = plan.filter((d) => d.action === "skip").length;
  const savedLiters = 7 * 30000 - totalLiters;

  return (
    <AppShell title="جدول الري الذكي">
      <PageHeader title="جدول الري الذكي" subtitle="خطة 7 أيام بناءً على الطقس ورطوبة التربة" icon="💧" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label="رطوبة التربة" value={`${(reading.moisture ?? 0).toFixed(0)}%`} icon={Droplets} tone="sky" />
        <MetricCard label="الماء المطلوب" value={`${(totalLiters / 1000).toFixed(1)} م³`} icon={Droplets} tone="primary" />
        <MetricCard label="أيام بدون ري" value={String(skipDays)} icon={Sun} tone="sun" />
        <MetricCard label="توفير الماء" value={`${Math.max(0, savedLiters / 1000).toFixed(1)} م³`} icon={TrendingDown} tone="leaf" />
      </div>

      <div className="hero-card grain rounded-3xl p-5 mb-5 relative">
        <p className="eyebrow text-white/70">توصية اليوم</p>
        <h2 className="text-2xl font-bold mt-1">{ACTION_META[plan[0].action].label}</h2>
        <p className="text-sm text-white/90 mt-1">{plan[0].reason}</p>
        {plan[0].amountL > 0 && (
          <p className="text-lg font-bold mt-3">{plan[0].amountL.toLocaleString("ar-DZ")} لتر / هكتار</p>
        )}
      </div>

      <div className="space-y-2">
        {plan.map((d, i) => {
          const meta = ACTION_META[d.action];
          const Icon = meta.icon;
          const day = new Date(d.date).toLocaleDateString("ar-DZ", { weekday: "long", day: "2-digit", month: "short" });
          const f = forecast[i];
          return (
            <div key={d.date} className="glass rounded-2xl p-4 flex items-center gap-3 rise-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`size-11 rounded-xl bg-gradient-to-br ${meta.color} grid place-items-center text-white shadow`}>
                <Icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{day}</p>
                <p className="text-xs text-muted-foreground">{d.reason}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <CloudRain className="size-3" />{f.rainMm.toFixed(1)}mm · {f.tempMax}°
                </p>
                {d.amountL > 0 && <p className="text-sm font-bold font-mono">{(d.amountL / 1000).toFixed(1)} م³</p>}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Droplets; tone: "sky" | "primary" | "sun" | "leaf" }) {
  const map = { sky: "text-sky-600", primary: "text-primary", sun: "text-amber-600", leaf: "text-leaf" };
  return (
    <div className="glass rounded-2xl p-4 rise">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`size-4 ${map[tone]}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
