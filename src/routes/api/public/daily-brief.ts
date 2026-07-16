// AI daily brief — invoked by external cron (pg_cron / GitHub Actions / etc.)
// Auth: Bearer token via `Authorization: Bearer $DAILY_BRIEF_SECRET`.
// Iterates all users with push subs + a farm, generates a short AI brief,
// and pushes it to each subscription.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/daily-brief")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const secret = process.env.DAILY_BRIEF_SECRET;
        if (!secret || auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT!,
          process.env.VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!,
        );

        // Fetch every user that has at least one push subscription
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("user_id, endpoint, p256dh, auth");
        if (!subs?.length) return Response.json({ ok: true, sent: 0 });

        // Group by user
        const byUser = new Map<string, typeof subs>();
        for (const s of subs) {
          const arr = byUser.get(s.user_id) ?? [];
          arr.push(s); byUser.set(s.user_id, arr);
        }

        let sent = 0;
        for (const [userId, userSubs] of byUser) {
          // Pull latest farm + soil reading
          const { data: farms } = await supabaseAdmin.from("farms").select("wilaya,baladia,area_hectares").eq("user_id", userId).limit(1);
          const { data: readings } = await supabaseAdmin.from("soil_readings")
            .select("moisture,temperature,ph,nitrogen,phosphorus,potassium,taken_at")
            .eq("user_id", userId).order("taken_at", { ascending: false }).limit(1);
          const farm = farms?.[0] as Farm; const r = readings?.[0] as Reading;

          const brief = await generateBrief(farm, r);
          const payload = JSON.stringify({
            title: "🌱 نشرة اليوم من AgriPen",
            body: brief,
            url: "/",
            tag: "daily-brief",
          });

          for (const s of userSubs) {
            try {
              await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
              sent++;
            } catch (e) {
              // Expired subscriptions — clean them up
              const code = (e as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) {
                await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
              }
            }
          }
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});

type Farm = { wilaya: string | null; baladia: string | null; area_hectares: number | null } | undefined;
type Reading = { moisture: number | null; temperature: number | null; ph: number | null; nitrogen: number | null; phosphorus: number | null; potassium: number | null } | undefined;

async function generateBrief(farm: Farm, r: Reading): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  const ctx = [
    farm?.wilaya ? `الولاية: ${farm.wilaya}` : "",
    farm?.area_hectares ? `المساحة: ${farm.area_hectares} هكتار` : "",
    r?.moisture != null ? `الرطوبة: ${r.moisture}%` : "",
    r?.temperature != null ? `الحرارة: ${r.temperature}°` : "",
    r?.ph != null ? `pH: ${r.ph}` : "",
  ].filter(Boolean).join(" • ");

  if (!key) return `صباح الخير 🌱 راقب أرضك اليوم. ${ctx}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت مستشار فلاحي جزائري. اكتب نصيحة يومية قصيرة (جملة أو جملتين، أقل من 140 حرفا) بالدارجة الجزائرية الفصيحة، عملية وواضحة، تبدأ بإيموجي مناسب." },
          { role: "user", content: `أعطني نصيحة اليوم لهذا الفلاح: ${ctx || "لا توجد بيانات حديثة"}` },
        ],
        temperature: 0.7,
        max_tokens: 120,
      }),
    });
    const j = await res.json() as { choices?: { message?: { content?: string } }[] };
    const text = j.choices?.[0]?.message?.content?.trim();
    return text || `صباح الخير 🌱 ${ctx}`;
  } catch {
    return `صباح الخير 🌱 ${ctx}`;
  }
}
