// Aggregator + suitability score for a target crop given soil & wilaya
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  cropName: z.string().min(1),
  wilaya: z.string().optional(),
  soil: z.object({
    moisture: z.number().optional(),
    temperature: z.number().optional(),
    ph: z.number().optional(),
    salinity: z.number().optional(),
    nitrogen: z.number().optional(),
    phosphorus: z.number().optional(),
    potassium: z.number().optional(),
  }).optional(),
  dialect: z.string().default("darija"),
  userName: z.string().optional(),
});

export const evaluateCropSuitability = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const soil = data.soil
      ? Object.entries(data.soil).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`).join(", ")
      : "(غير متوفرة)";

    const system = `راك خبير فلاحي. حلل احتمال نجاح زرع محصول معين في أرض الفلاح وأرجع JSON صافي فقط بهاد الشكل بالضبط بلا أي شرح خارج JSON ولا code fences:
{
  "crop": "اسم المحصول",
  "probability": 0-100,
  "season": "الموسم المناسب",
  "needs": ["متطلب 1", "متطلب 2", "متطلب 3"],
  "risks": ["خطر 1", "خطر 2"],
  "tips": ["نصيحة عملية باللهجة الجزائرية البسيطة 1", "2", "3"]
}
- خاطب باسم: ${data.userName ?? "بلا 'يا الفلاح'"}.
- ما تذكرش أنك ذكاء اصطناعي.`;

    const userMsg = `المحصول المطلوب: ${data.cropName}\nالولاية: ${data.wilaya ?? "—"}\nقراءات التربة: ${soil}\n\nقدّر نسبة نجاحه واذكر ما يلزم توفيره.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) throw new Error(`Crop eval failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    let raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try { return JSON.parse(raw); } catch { return { crop: data.cropName, probability: 0, needs: [], risks: [], tips: [raw] }; }
  });
