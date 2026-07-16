import { createFileRoute } from "@tanstack/react-router";
import { AppShell, GlassCard, PageHeader } from "@/components/AppShell";
import { FERTILIZATION_PLAN } from "@/lib/mockData";
import { TestTube2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fertilization")({
  head: () => ({ meta: [{ title: "التسميد الذكي — AgriPen" }] }),
  component: () => (
    <AppShell title="التسميد">
      <PageHeader icon="🧪" title="توصيات التسميد" subtitle="مبنية على تحليل التربة الأخير" />
      <div className="space-y-3">
        {FERTILIZATION_PLAN.map((f, i) => (
          <GlassCard key={i}>
            <div className="flex items-start gap-3">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white grid place-items-center"><TestTube2 className="size-6" /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-bold">{f.crop}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{f.when}</span>
                </div>
                <p className="text-sm mt-1"><span className="font-semibold">السماد:</span> {f.type}</p>
                <p className="text-sm"><span className="font-semibold">الكمية:</span> {f.amount}</p>
                <p className="text-xs text-muted-foreground mt-1">📌 {f.reason}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  ),
});
