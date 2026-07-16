import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { WEATHER_FORECAST } from "@/lib/mockData";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/weather")({
  head: () => ({ meta: [{ title: "الطقس — AgriPen" }] }),
  component: WeatherPage,
});

function WeatherPage() {
  const { settings } = useSettings();

  if (!settings.showWeather) {
    return (
      <AppShell title="الطقس">
        <GlassCard className="text-center py-12">
          <div className="text-5xl mb-3">🌦️</div>
          <h2 className="font-bold text-lg">قسم الطقس غير مفعل</h2>
          <p className="text-sm text-muted-foreground mt-2">فعّله من صفحة الحساب لمتابعة توقعات الطقس.</p>
          <Link to="/profile" className="inline-block mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">الذهاب إلى الحساب</Link>
        </GlassCard>
      </AppShell>
    );
  }

  const today = WEATHER_FORECAST[0];
  return (
    <AppShell title="الطقس">
      <PageHeader icon="🌦" title="الطقس وتأثيره على الزراعة" subtitle="توقعات 7 أيام" />
      <GlassCard className="!p-6 bg-gradient-to-br from-sky-400/30 via-blue-500/20 to-indigo-500/20 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">اليوم</p>
            <p className="text-6xl font-bold mt-1">{today.temp}°</p>
            <p className="text-sm mt-2">💧 رطوبة {today.humidity}% • 💨 رياح {today.wind} كم/س</p>
          </div>
          <div className="text-8xl">{today.icon}</div>
        </div>
        <p className="mt-4 bg-white/40 dark:bg-white/10 rounded-2xl px-3 py-2 text-sm">🌱 {today.advice}</p>
      </GlassCard>
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {WEATHER_FORECAST.map((d, i) => (
          <GlassCard key={i} className="!p-3 text-center">
            <p className="text-xs text-muted-foreground">{d.day}</p>
            <p className="text-3xl my-1">{d.icon}</p>
            <p className="font-bold">{d.temp}° / {d.min}°</p>
            <p className="text-xs text-sky-600 mt-1">💧 {d.rain}%</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{d.advice}</p>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
