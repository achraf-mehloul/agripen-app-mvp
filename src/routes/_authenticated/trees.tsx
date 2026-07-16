import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { TREES } from "@/lib/mockData";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/trees")({
  head: () => ({ meta: [{ title: "تحليل الأشجار — AgriPen" }] }),
  component: TreesPage,
});

function TreesPage() {
  const { settings } = useSettings();

  if (!settings.showTrees) {
    return (
      <AppShell title="الأشجار">
        <GlassCard className="text-center py-12">
          <div className="text-5xl mb-3">🌳</div>
          <h2 className="font-bold text-lg">قسم الأشجار غير مفعل</h2>
          <p className="text-sm text-muted-foreground mt-2">فعّله من صفحة الحساب لرؤية تحليل أشجارك.</p>
          <Link to="/profile" className="inline-block mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">الذهاب إلى الحساب</Link>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell title="الأشجار">
      <PageHeader icon="🌳" title="تحليل الأشجار" subtitle="حالة كل شجرة في مزارعك" />
      <div className="grid md:grid-cols-2 gap-3">
        {TREES.map((t) => (
          <GlassCard key={t.id}>
            <div className="flex items-center gap-3">
              <div className="text-5xl">🌳</div>
              <div className="flex-1">
                <h3 className="font-bold">{t.name}</h3>
                <p className="text-xs text-muted-foreground">عمر {t.age} سنوات • {t.height} • آخر فحص: {t.lastCheck}</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${t.health >= 80 ? "text-emerald-600" : t.health >= 65 ? "text-amber-600" : "text-red-600"}`}>{t.health}</div>
                <div className="text-[10px] text-muted-foreground">صحة</div>
              </div>
            </div>
            {t.issue ? (
              <div className="mt-3 bg-amber-500/15 text-amber-800 rounded-2xl px-3 py-2 text-sm">⚠️ {t.issue}</div>
            ) : (
              <div className="mt-3 bg-emerald-500/15 text-emerald-800 rounded-2xl px-3 py-2 text-sm">✅ صحة ممتازة</div>
            )}
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
