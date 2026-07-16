import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { listFarmEvents, addFarmEvent } from "@/lib/farm-events.functions";
import { Droplets, Sprout, Leaf, TestTube2, Wheat, StickyNote, Plus, X, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({ meta: [{ title: "خط زمن المزرعة — AgriPen" }] }),
  component: TimelinePage,
});

type Row = { id: string; kind: string; title: string; detail: string | null; amount: number | null; unit: string | null; occurred_at: string };

const KIND_META: Record<string, { icon: typeof Droplets; color: string; label: string }> = {
  irrigation:    { icon: Droplets,    color: "from-sky-500 to-blue-600",       label: "ري" },
  fertilization: { icon: TestTube2,   color: "from-amber-500 to-orange-600",   label: "تسميد" },
  planting:      { icon: Sprout,      color: "from-lime-500 to-emerald-600",   label: "غرس" },
  harvest:       { icon: Wheat,       color: "from-yellow-500 to-amber-600",   label: "حصاد" },
  disease:       { icon: Leaf,        color: "from-rose-500 to-red-600",       label: "مرض" },
  soil:          { icon: TestTube2,   color: "from-emerald-500 to-teal-600",   label: "تربة" },
  note:          { icon: StickyNote,  color: "from-slate-500 to-slate-700",    label: "ملاحظة" },
};

function TimelinePage() {
  const list = useServerFn(listFarmEvents);
  const add = useServerFn(addFarmEvent);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const refresh = async () => { setRows(null); const r = await list(); setRows(r as Row[]); };
  useEffect(() => { void refresh(); }, []);

  return (
    <AppShell title="خط زمن المزرعة">
      <PageHeader title="خط زمن المزرعة" subtitle="كل نشاط، قراءة، ومرض في مكان واحد" icon="🕒" />

      <div className="mb-4 flex justify-end">
        <button onClick={() => setOpenAdd(true)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold flex items-center gap-2 press rise">
          <Plus className="size-4" /> إضافة نشاط
        </button>
      </div>

      {rows === null && <SkeletonList count={4} />}

      {rows && rows.length === 0 && (
        <EmptyState
          variant="plant"
          title="لا يوجد أي نشاط بعد"
          description="سجّل عملية ري أو تسميد لتبدأ بناء سجل مزرعتك."
          action={
            <button onClick={() => setOpenAdd(true)} className="rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold press">
              أضف أول نشاط
            </button>
          }
        />
      )}

      {rows && rows.length > 0 && (
        <div className="relative ps-6">
          <div className="absolute inset-y-2 start-2 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
          <div className="space-y-3">
            {rows.map((e, i) => {
              const meta = KIND_META[e.kind] ?? KIND_META.note;
              const Icon = meta.icon;
              const when = new Date(e.occurred_at).toLocaleString("ar-DZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={e.id} className="relative rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={`absolute -start-[22px] top-4 size-4 rounded-full bg-gradient-to-br ${meta.color} shadow-lg ring-4 ring-background`} />
                  <div className="glass rounded-2xl p-4 rise">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl bg-gradient-to-br ${meta.color} grid place-items-center text-white shadow`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="eyebrow">{meta.label}</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{when}</span>
                        </div>
                        <p className="font-semibold text-sm mt-0.5 truncate">{e.title}</p>
                        {e.detail && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.detail}</p>}
                        {e.amount !== null && <p className="text-xs mt-1 font-mono">{e.amount} {e.unit ?? ""}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openAdd && (
        <AddEventModal
          onClose={() => setOpenAdd(false)}
          onSave={async (payload) => { await add({ data: payload }); setOpenAdd(false); void refresh(); }}
        />
      )}
    </AppShell>
  );
}

function AddEventModal({ onClose, onSave }: { onClose: () => void; onSave: (p: { kind: "irrigation" | "fertilization" | "planting" | "harvest" | "disease" | "note"; title: string; detail?: string; amount?: number; unit?: string }) => Promise<void> }) {
  const [kind, setKind] = useState<"irrigation" | "fertilization" | "planting" | "harvest" | "disease" | "note">("irrigation");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("لتر");
  const [busy, setBusy] = useState(false);

  const KINDS: [typeof kind, string, string][] = [
    ["irrigation", "💧", "ري"], ["fertilization", "🧪", "تسميد"], ["planting", "🌱", "غرس"],
    ["harvest", "🌾", "حصاد"], ["disease", "🍂", "مرض"], ["note", "📝", "ملاحظة"],
  ];

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSave({
        kind, title: title.trim(),
        detail: detail.trim() || undefined,
        amount: amount ? +amount : undefined,
        unit: amount ? unit : undefined,
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm grid place-items-center p-4 rise-in">
      <div className="glass-strong rounded-3xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">إضافة نشاط</h3>
          <button onClick={onClose} className="size-8 rounded-full grid place-items-center hover:bg-white/10 press"><X className="size-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {KINDS.map(([k, e, l]) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-2xl px-2 py-3 text-xs font-semibold press ${kind === k ? "bg-primary text-primary-foreground shadow" : "glass"}`}>
              <div className="text-xl mb-1">{e}</div>{l}
            </button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" className="w-full rounded-2xl bg-input px-4 py-3 text-sm mb-2" />
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="التفاصيل (اختياري)" rows={2} className="w-full rounded-2xl bg-input px-4 py-3 text-sm mb-2" />
        <div className="flex gap-2 mb-4">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="الكمية" className="flex-1 rounded-2xl bg-input px-4 py-3 text-sm" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="الوحدة" className="w-24 rounded-2xl bg-input px-4 py-3 text-sm" />
        </div>
        <button onClick={submit} disabled={busy || !title.trim()} className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold press disabled:opacity-50">
          {busy ? "..." : "حفظ"}
        </button>
      </div>
    </div>
  );
}
