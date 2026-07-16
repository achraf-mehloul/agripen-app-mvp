import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { CROP_RECOMMENDATIONS } from "@/lib/mockData";
import { useT } from "@/lib/i18n";
import { useLatestSoil } from "@/lib/soil";
import { useAuth } from "@/lib/auth-context";
import { evaluateCropSuitability } from "@/lib/crop-suitability.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crops")({
  head: () => ({ meta: [{ title: "اقتراح المحاصيل — AgriPen" }] }),
  component: CropsPage,
});

type SuitResult = {
  crop?: string;
  probability?: number;
  season?: string;
  needs?: string[];
  risks?: string[];
  tips?: string[];
};

function CropsPage() {
  const { t, lang } = useT();
  const { profile, user } = useAuth();
  const { reading } = useLatestSoil(lang);
  const suit = useServerFn(evaluateCropSuitability);
  const [wilaya, setWilaya] = useState<string | null>(null);
  const [cropInput, setCropInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<SuitResult | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("farms").select("wilaya").eq("user_id", user.id).limit(1);
      setWilaya(data?.[0]?.wilaya ?? null);
    })();
  }, [user]);

  const run = async () => {
    if (!cropInput.trim()) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const res = await suit({ data: {
        cropName: cropInput.trim(),
        wilaya: wilaya ?? undefined,
        soil: {
          moisture: reading.moisture ?? undefined,
          temperature: reading.temperature ?? undefined,
          ph: reading.ph ?? undefined,
          salinity: reading.salinity ?? undefined,
          nitrogen: reading.nitrogen ?? undefined,
          phosphorus: reading.phosphorus ?? undefined,
          potassium: reading.potassium ?? undefined,
        },
        dialect: profile?.dialect ?? "darija",
        userName: profile?.full_name ?? undefined,
      } });
      setResult(res as SuitResult);
    } catch (e) { setErr(e instanceof Error ? e.message : "خطأ"); }
    finally { setLoading(false); }
  };

  const prob = Math.max(0, Math.min(100, result?.probability ?? 0));
  const probColor = prob >= 75 ? "from-emerald-500 to-green-600"
    : prob >= 50 ? "from-amber-500 to-orange-600"
    : "from-rose-500 to-red-600";

  return (
    <AppShell title={t("crops.title")}>
      <PageHeader icon="🌾" title={t("crops.title")} subtitle={t("crops.subtitle")} />

      {/* Crop suitability card */}
      <GlassCard className="mb-4 bg-gradient-to-br from-primary/15 via-leaf/10 to-accent/10 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <h3 className="relative font-bold flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-primary" /> {t("crops.suit.title")}
        </h3>
        <div className="relative flex gap-2 flex-wrap">
          <input
            value={cropInput} onChange={(e) => setCropInput(e.target.value)}
            placeholder={t("crops.suit.placeholder")}
            className="flex-1 min-w-[180px] glass rounded-2xl px-4 py-2.5 font-medium outline-none"
          />
          <button onClick={run} disabled={!cropInput.trim() || loading}
            className="rounded-2xl bg-gradient-to-r from-primary to-leaf text-primary-foreground font-bold px-5 py-2.5 shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2">
            {loading ? <><Loader2 className="size-4 animate-spin" /> {t("crops.suit.loading")}</> : t("crops.suit.btn")}
          </button>
        </div>
        {err && <p className="relative mt-3 text-xs text-destructive">{err}</p>}

        {result && (
          <div className="relative mt-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className={`size-20 rounded-3xl grid place-items-center bg-gradient-to-br ${probColor} text-white shadow-xl`}>
                <div className="text-2xl font-black">{prob}%</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t("crops.suit.probability")}</p>
                <p className="font-bold text-lg truncate">{result.crop ?? cropInput}</p>
                {result.season && <p className="text-xs text-muted-foreground mt-0.5">📅 {result.season}</p>}
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/50 dark:bg-white/10 overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${probColor} transition-all`} style={{ width: `${prob}%` }} />
            </div>
            <SuitList icon={TrendingUp}  title={t("crops.suit.needs")} items={result.needs} tone="ok" />
            <SuitList icon={AlertTriangle} title={t("crops.suit.risks")} items={result.risks} tone="warn" />
            <SuitList icon={Lightbulb}   title={t("crops.suit.tips")}  items={result.tips}  tone="tip" />
          </div>
        )}
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-3">
        {CROP_RECOMMENDATIONS.map((c) => (
          <GlassCard key={c.id} className="!p-4">
            <div className="flex items-center gap-3">
              <div className="text-5xl">{c.emoji}</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.season} • {c.water} • {c.profit}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{c.score}</div>
                <div className="text-[10px] text-muted-foreground">%</div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/50 dark:bg-white/10 mt-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-leaf" style={{ width: `${c.score}%` }} />
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}

function SuitList({ icon: Icon, title, items, tone }: { icon: typeof Sparkles; title: string; items?: string[]; tone: "ok" | "warn" | "tip" }) {
  if (!items?.length) return null;
  const bg = tone === "warn" ? "bg-amber-500/15" : tone === "tip" ? "bg-accent/15" : "bg-primary/10";
  return (
    <div className={`rounded-2xl p-3 ${bg}`}>
      <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Icon className="size-3.5" /> {title}</p>
      <ul className="text-sm space-y-1">
        {items.map((it, i) => <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">•</span>{it}</li>)}
      </ul>
    </div>
  );
}
