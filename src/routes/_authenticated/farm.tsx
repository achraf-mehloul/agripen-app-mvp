import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import {
  FarmMap, suggestSensorPoints, polygonAreaHectares,
  boundaryToZones, zonesToBoundary,
  type LatLng, type Zone, type ZoneKind, ZONE_STYLE,
} from "@/components/FarmMap";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { extractPolygonFromImage } from "@/lib/map-extract.functions";
import { haptic } from "@/lib/haptics";
import {
  MapPin, Save, Crosshair, Sparkles, Ruler, Loader2, Radio, TestTube2, Camera,
  Trash2, Satellite,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/farm")({
  head: () => ({ meta: [{ title: "خريطة المزرعة — AgriPen" }] }),
  component: FarmPage,
});

type Farm = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  area_hectares: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boundary_geojson: any;
};

function FarmPage() {
  const { user } = useAuth();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeKind, setActiveKind] = useState<ZoneKind>("crop");
  const [suggestCount, setSuggestCount] = useState(6);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNDVI, setShowNDVI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [insertBusy, setInsertBusy] = useState(false);
  const [extractBusy, setExtractBusy] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const extractFn = useServerFn(extractPolygonFromImage);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("farms")
        .select("id,name,latitude,longitude,area_hectares,boundary_geojson")
        .eq("user_id", user.id).order("created_at").limit(1);
      const f = (data?.[0] as Farm | undefined) ?? null;
      setFarm(f);
      setZones(boundaryToZones(f?.boundary_geojson));
      setLoading(false);
    })();
  }, [user]);

  const cropZones = useMemo(() => zones.filter((z) => z.kind === "crop"), [zones]);
  const treeZones = useMemo(() => zones.filter((z) => z.kind === "tree"), [zones]);
  const totalArea = useMemo(() => zones.reduce((s, z) => s + polygonAreaHectares(z.points), 0), [zones]);
  const cropArea  = useMemo(() => cropZones.reduce((s, z) => s + polygonAreaHectares(z.points), 0), [cropZones]);
  const treeArea  = useMemo(() => treeZones.reduce((s, z) => s + polygonAreaHectares(z.points), 0), [treeZones]);

  const center: LatLng = useMemo(() => {
    if (zones.length) {
      const pts = zones.flatMap((z) => z.points);
      const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return [lat, lng];
    }
    if (farm?.latitude != null && farm?.longitude != null) return [farm.latitude, farm.longitude];
    return [36.75, 3.05];
  }, [zones, farm]);

  const sensorPoints = useMemo(() => {
    if (!showSuggestions) return [];
    return cropZones.flatMap((z) => suggestSensorPoints(z.points, Math.max(2, Math.ceil(suggestCount / Math.max(1, cropZones.length)))));
  }, [showSuggestions, cropZones, suggestCount]);

  const save = async () => {
    if (!farm) return;
    setSaving(true); setSavedMsg(null); haptic("medium");
    try {
      const geo = zonesToBoundary(zones);
      const { error } = await supabase.from("farms").update({
        boundary_geojson: geo,
        area_hectares: totalArea > 0 ? Number(totalArea.toFixed(3)) : farm.area_hectares,
      }).eq("id", farm.id);
      if (error) throw error;
      setSavedMsg(`تم حفظ ${zones.length} منطقة (${totalArea.toFixed(2)} هكتار)`);
      haptic("success");
    } catch (e) { setSavedMsg(e instanceof Error ? e.message : "خطأ"); }
    finally { setSaving(false); setTimeout(() => setSavedMsg(null), 3500); }
  };

  const clearAll = () => { setZones([]); haptic("warning"); };

  const insertReadings = async () => {
    if (!farm || sensorPoints.length === 0) return;
    setInsertBusy(true); setSavedMsg(null);
    try {
      const rows = sensorPoints.map(() => ({
        user_id: user!.id, farm_id: farm.id,
        moisture: +(20 + Math.random() * 55).toFixed(1),
        temperature: +(18 + Math.random() * 12).toFixed(1),
        ph: +(6 + Math.random() * 1.5).toFixed(1),
        nitrogen: +(30 + Math.random() * 60).toFixed(1),
        phosphorus: +(20 + Math.random() * 40).toFixed(1),
        potassium: +(80 + Math.random() * 60).toFixed(1),
        organic: +(1.5 + Math.random() * 2.5).toFixed(2),
        source: "sim",
      }));
      await supabase.from("soil_readings").insert(rows);
      setSavedMsg(`تم تسجيل ${rows.length} قراءة تربة`);
      haptic("success");
    } catch (e) { setSavedMsg(e instanceof Error ? e.message : "خطأ"); }
    finally { setInsertBusy(false); setTimeout(() => setSavedMsg(null), 3500); }
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !farm) return;
    setExtractBusy(true); setSavedMsg(null);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
      });
      const lat = farm.latitude ?? center[0];
      const lng = farm.longitude ?? center[1];
      const { latlngs, confidence } = await extractFn({ data: { imageDataUrl: dataUrl, centerLat: lat, centerLng: lng, approxAreaHa: farm.area_hectares ?? undefined } });
      if (latlngs.length >= 3) {
        setZones((zs) => [...zs, { kind: activeKind, points: latlngs as LatLng[] }]);
        setSavedMsg(`تم استخراج حدود من الصورة (ثقة ${Math.round(confidence * 100)}%)`);
      } else setSavedMsg("لم نتمكن من استخراج مضلع واضح");
    } catch (err) { setSavedMsg(err instanceof Error ? err.message : "خطأ"); }
    finally { setExtractBusy(false); setTimeout(() => setSavedMsg(null), 5000); }
  };

  return (
    <AppShell title="خريطة المزرعة">
      <PageHeader icon="🗺️" title="خريطة المزرعة" subtitle="ارسم حدود أراضيك الزراعية وأشجارك على الخريطة" />

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : !farm ? (
        <EmptyState
          variant="soil"
          title="لا توجد مزرعة بعد"
          description="أضف مزرعتك الأولى من صفحة الحساب لتبدأ رسم الحدود وتتبع القراءات."
        />
      ) : (
        <>
          {/* Kind selector */}
          <div className="glass rounded-2xl p-1.5 grid grid-cols-2 gap-1 mb-3">
            {(Object.keys(ZONE_STYLE) as ZoneKind[]).map((k) => {
              const s = ZONE_STYLE[k];
              const active = activeKind === k;
              return (
                <button
                  key={k}
                  onClick={() => { setActiveKind(k); haptic("light"); }}
                  className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${active ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow" : "text-muted-foreground press"}`}
                >
                  <span className="text-lg">{s.emoji}</span> {s.label}
                </button>
              );
            })}
          </div>

          <GlassCard className="!p-3">
            <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
              <span className="text-sm font-bold flex items-center gap-1.5"><MapPin className="size-4 text-primary" /> {farm.name}</span>
              {totalArea > 0 && (
                <span className="text-xs bg-primary/10 rounded-full px-2.5 py-1 flex items-center gap-1">
                  <Ruler className="size-3" /> {totalArea.toFixed(2)} هكتار
                </span>
              )}
              {cropZones.length > 0 && (
                <span className="text-xs bg-lime-500/15 text-lime-800 dark:text-lime-300 rounded-full px-2.5 py-1">🌾 {cropZones.length} × {cropArea.toFixed(2)}ha</span>
              )}
              {treeZones.length > 0 && (
                <span className="text-xs bg-orange-500/15 text-orange-800 dark:text-orange-300 rounded-full px-2.5 py-1">🌳 {treeZones.length} × {treeArea.toFixed(2)}ha</span>
              )}
              {sensorPoints.length > 0 && (
                <span className="text-xs bg-amber-500/10 text-amber-700 rounded-full px-2.5 py-1 flex items-center gap-1">
                  <Radio className="size-3" /> {sensorPoints.length} نقطة
                </span>
              )}
              <button onClick={() => { setShowNDVI((v) => !v); haptic("light"); }} className={`ms-auto text-xs rounded-full px-2.5 py-1 flex items-center gap-1 press ${showNDVI ? "bg-emerald-600 text-white" : "bg-white/50 dark:bg-white/10"}`}>
                <Satellite className="size-3" /> NDVI
              </button>
            </div>
            <FarmMap
              center={center}
              zones={zones}
              activeKind={activeKind}
              sensorPoints={sensorPoints}
              onZonesChange={setZones}
              showNDVI={showNDVI}
            />
            <p className="text-[11px] text-muted-foreground mt-2 px-1">
              اختر النوع (زراعية/أشجار) ثم استعمل زر الرسم أعلى الخريطة لرسم كل منطقة. يمكنك إضافة عدة مناطق ثم الحفظ.
            </p>
          </GlassCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <GlassCard>
              <h3 className="font-bold mb-2 flex items-center gap-2"><Sparkles className="size-4 text-primary" /> اقتراح نقاط الاستشعار</h3>
              <p className="text-xs text-muted-foreground">توزيع نقاط قراءات التربة داخل الأراضي الزراعية.</p>
              <div className="flex items-center gap-3 mt-3">
                <input type="range" min={3} max={20} value={suggestCount} onChange={(e) => setSuggestCount(+e.target.value)} className="flex-1" />
                <span className="w-8 text-center font-bold">{suggestCount}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => { setShowSuggestions((s) => !s); haptic("light"); }} disabled={cropZones.length === 0}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-2.5 disabled:opacity-40 press flex items-center justify-center gap-1.5">
                  <Crosshair className="size-4" /> {showSuggestions ? "إخفاء" : "اقتراح"}
                </button>
                <button onClick={insertReadings} disabled={insertBusy || sensorPoints.length === 0}
                  className="rounded-2xl bg-gradient-to-r from-primary to-leaf text-white font-bold py-2.5 disabled:opacity-40 press flex items-center justify-center gap-1.5">
                  {insertBusy ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
                  تسجيل قراءات
                </button>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-bold mb-2 flex items-center gap-2"><Save className="size-4 text-primary" /> حفظ الحدود</h3>
              <p className="text-xs text-muted-foreground">تُخزَّن جميع المناطق كـ GeoJSON مع نوعها (زراعية/أشجار).</p>
              <button onClick={save} disabled={saving || zones.length === 0}
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-primary to-leaf text-white font-bold py-3 disabled:opacity-40 press flex items-center justify-center gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                حفظ ({zones.length} منطقة)
              </button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
                <button onClick={() => photoInput.current?.click()} disabled={extractBusy}
                  className="rounded-2xl glass border border-primary/30 text-primary font-bold py-2.5 disabled:opacity-40 press flex items-center justify-center gap-2">
                  {extractBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  من صورة
                </button>
                <button onClick={clearAll} disabled={zones.length === 0}
                  className="rounded-2xl bg-rose-500/15 text-rose-600 font-bold py-2.5 disabled:opacity-40 press flex items-center justify-center gap-2">
                  <Trash2 className="size-4" /> مسح الكل
                </button>
              </div>
              {savedMsg && <p className="mt-2 text-xs bg-primary/10 rounded-xl px-3 py-2 rise-in">{savedMsg}</p>}
            </GlassCard>
          </div>
        </>
      )}
    </AppShell>
  );
}
