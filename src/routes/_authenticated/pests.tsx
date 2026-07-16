import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { reportPest, listPestReports } from "@/lib/pest-reports.functions";
import { WILAYAS } from "@/lib/wilayas";
import { AlertTriangle, Bug, MapPin, Plus, X, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pests")({
  head: () => ({ meta: [{ title: "الإنذار المبكر للآفات — AgriPen" }] }),
  component: PestsPage,
});

type Row = { id: string; wilaya: string | null; baladia: string | null; pest_name: string; plant: string | null; severity: string; notes: string | null; created_at: string };

const SEVERITY: Record<string, { color: string; label: string }> = {
  low:    { color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300", label: "خفيف" },
  medium: { color: "bg-amber-500/20 text-amber-700 dark:text-amber-300",       label: "متوسط" },
  high:   { color: "bg-rose-500/20 text-rose-700 dark:text-rose-300",           label: "شديد" },
};

function PestsPage() {
  const { user } = useAuth();
  const list = useServerFn(listPestReports);
  const report = useServerFn(reportPest);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [userWilaya, setUserWilaya] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("farms").select("wilaya").eq("user_id", user.id).limit(1);
      const w = data?.[0]?.wilaya as string | null;
      setUserWilaya(w);
      const r = await list({ data: { wilaya: w, limit: 100 } });
      setRows(r as Row[]);
    })();
  }, [user]);

  const refresh = async () => {
    setRows(null);
    const r = await list({ data: { wilaya: userWilaya, limit: 100 } });
    setRows(r as Row[]);
  };

  return (
    <AppShell title="الإنذار المبكر للآفات">
      <PageHeader title="الإنذار المبكر للآفات" subtitle={userWilaya ? `تقارير الفلاحين في ${userWilaya}` : "خريطة الآفات الإقليمية"} icon="🐛" />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="hero-card-accent grain rounded-2xl px-4 py-3 flex items-center gap-3 flex-1">
          <AlertTriangle className="size-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs opacity-90">شارك حين تلاحظ آفة — أنقذ مزرعة جارك</p>
          </div>
        </div>
        <button onClick={() => setOpenAdd(true)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold flex items-center gap-2 press rise shrink-0">
          <Plus className="size-4" /> بلّغ
        </button>
      </div>

      {rows === null && <SkeletonList count={4} />}

      {rows && rows.length === 0 && (
        <EmptyState
          variant="search"
          title="لا توجد تقارير في منطقتك"
          description="لم يبلغ أي فلاح بعد. إذا لاحظت آفة، كن أول من يبلّغ."
          action={<button onClick={() => setOpenAdd(true)} className="rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold press">أضف تقرير</button>}
        />
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const s = SEVERITY[r.severity] ?? SEVERITY.medium;
            const when = new Date(r.created_at).toLocaleDateString("ar-DZ", { day: "2-digit", month: "short" });
            return (
              <div key={r.id} className="glass rounded-2xl p-4 rise-in rise" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 grid place-items-center text-white shrink-0 shadow">
                    <Bug className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{r.pest_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.color}`}>{s.label}</span>
                    </div>
                    {r.plant && <p className="text-xs text-muted-foreground mt-0.5">على {r.plant}</p>}
                    {r.notes && <p className="text-sm mt-2 leading-relaxed">{r.notes}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{r.wilaya ?? "—"}{r.baladia ? ` · ${r.baladia}` : ""}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" />{when}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openAdd && (
        <ReportModal
          defaultWilaya={userWilaya}
          onClose={() => setOpenAdd(false)}
          onSave={async (p) => { await report({ data: p }); setOpenAdd(false); void refresh(); }}
        />
      )}
    </AppShell>
  );
}

function ReportModal({ defaultWilaya, onClose, onSave }: {
  defaultWilaya: string | null;
  onClose: () => void;
  onSave: (p: { wilaya: string; baladia?: string; pest_name: string; plant?: string; severity: "low" | "medium" | "high"; notes?: string }) => Promise<void>;
}) {
  const [pest, setPest] = useState("");
  const [plant, setPlant] = useState("");
  const [wilaya, setWilaya] = useState(defaultWilaya ?? "تيسمسيلت");
  const [baladia, setBaladia] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm grid place-items-center p-4 rise-in">
      <div className="glass-strong rounded-3xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">تبليغ عن آفة</h3>
          <button onClick={onClose} className="size-8 rounded-full grid place-items-center hover:bg-white/10 press"><X className="size-4" /></button>
        </div>
        <input value={pest} onChange={(e) => setPest(e.target.value)} placeholder="اسم الآفة (مثل: من، جراد)" className="w-full rounded-2xl bg-input px-4 py-3 text-sm mb-2" />
        <input value={plant} onChange={(e) => setPlant(e.target.value)} placeholder="النبات (اختياري)" className="w-full rounded-2xl bg-input px-4 py-3 text-sm mb-2" />
        <div className="flex gap-2 mb-2">
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="flex-1 rounded-2xl bg-input px-3 py-3 text-sm">
            {WILAYAS.map((w) => <option key={w.code} value={w.ar}>{w.ar}</option>)}
          </select>
          <input value={baladia} onChange={(e) => setBaladia(e.target.value)} placeholder="البلدية" className="flex-1 rounded-2xl bg-input px-4 py-3 text-sm" />
        </div>
        <div className="flex gap-2 mb-3">
          {(["low", "medium", "high"] as const).map((s) => (
            <button key={s} onClick={() => setSeverity(s)} className={`flex-1 rounded-2xl py-2.5 text-xs font-bold press ${severity === s ? "bg-primary text-primary-foreground" : "glass"}`}>
              {SEVERITY[s].label}
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="وصف الإصابة" className="w-full rounded-2xl bg-input px-4 py-3 text-sm mb-4" />
        <button
          onClick={async () => { if (!pest.trim()) return; setBusy(true); try { await onSave({ pest_name: pest.trim(), plant: plant.trim() || undefined, wilaya, baladia: baladia.trim() || undefined, severity, notes: notes.trim() || undefined }); } finally { setBusy(false); } }}
          disabled={busy || !pest.trim()}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold press disabled:opacity-50"
        >
          {busy ? "..." : "نشر التبليغ"}
        </button>
      </div>
    </div>
  );
}
