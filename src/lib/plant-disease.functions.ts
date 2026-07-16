import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  plantType: z.string().optional(),
  voiceSymptoms: z.string().optional(),
  dialect: z.string().default("darija"),
  userName: z.string().optional(),
});

export const diagnosePlant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const name = (data.userName ?? "").trim();
    const system = `راك خبير فلاحي وتشخيص أمراض النباتات. حلل الصورة وأعطي تقرير مختصر باللهجة الجزائرية البسيطة.
خاطب المستخدم باسمه: ${name || "(بلا 'يا الفلاح')"}. ممنوع تستعمل 'يا الفلاح'. ما تذكرش أنك ذكاء اصطناعي.
الإجابة لازم تكون JSON صافي بهاد الشكل بالضبط (بلا أي شرح خارج JSON، بلا markdown، بلا code fences):
{
  "plant": "اسم النبات إلى عرفتو",
  "healthy": true/false,
  "disease": "اسم المرض بالعربية أو null إذا صحيح",
  "severity": "low" | "medium" | "high" | null,
  "symptoms": ["عرض 1", "عرض 2"],
  "causes": ["السبب 1", "السبب 2"],
  "treatment": ["الحل 1 بطريقة عملية", "الحل 2"],
  "prevention": ["الوقاية 1", "الوقاية 2"],
  "advice": "نصيحة قصيرة باللهجة الجزائرية"
}`;

    const parts: string[] = [];
    if (data.plantType) parts.push(`نوع النبتة: ${data.plantType}`);
    if (data.voiceSymptoms) parts.push(`الفلاح وصف الأعراض بالصوت: "${data.voiceSymptoms}". خذها بعين الاعتبار في التشخيص.`);
    const userText = parts.length ? parts.join("\n") + "\nشخص الحالة من الصورة والوصف." : "شخص هاد النبتة من الصورة.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    let raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
      return JSON.parse(raw);
    } catch {
      return { plant: "غير معروف", healthy: false, disease: null, symptoms: [], causes: [], treatment: [], prevention: [], advice: raw };
    }
  });
