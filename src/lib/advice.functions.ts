import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  moisture: z.number().optional(),
  temperature: z.number().optional(),
  ph: z.number().optional(),
  salinity: z.number().optional(),
  nitrogen: z.number().optional(),
  phosphorus: z.number().optional(),
  potassium: z.number().optional(),
  crop: z.string().optional(),
  dialect: z.string().default("darija"),
  userName: z.string().optional(),
});

const DIALECT_LABEL: Record<string, string> = {
  darija: "الدارجة الجزائرية العامة",
  wahrania: "اللهجة الوهرانية",
  chelfia: "اللهجة الشلفية",
  tlemcania: "اللهجة التلمسانية",
  charqia: "اللهجة الشرقية القسنطينية",
  adraria: "اللهجة الأدرارية الصحراوية",
};

export const generateAdvice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const label = DIALECT_LABEL[data.dialect] ?? DIALECT_LABEL.darija;
    const name = (data.userName ?? "").trim();

    const readings = [
      data.moisture !== undefined && `الرطوبة: ${data.moisture}%`,
      data.temperature !== undefined && `الحرارة: ${data.temperature}°C`,
      data.ph !== undefined && `الحموضة pH: ${data.ph}`,
      data.salinity !== undefined && `الملوحة: ${data.salinity} dS/m`,
      data.nitrogen !== undefined && `النيتروجين N: ${data.nitrogen} mg/kg`,
      data.phosphorus !== undefined && `الفوسفور P: ${data.phosphorus} mg/kg`,
      data.potassium !== undefined && `البوتاسيوم K: ${data.potassium} mg/kg`,
      data.crop && `المحصول: ${data.crop}`,
    ].filter(Boolean).join("\n");

    const system = `راك مساعد فلاحي ذكي تابع لتطبيق AgriPen.
- خاطب المستخدم باسمه: ${name || "(بلا اسم — استعمل صيغة محترمة بلا 'يا الفلاح')"}. ممنوع تستعمل "يا الفلاح".
- تكلم فقط بـ${label}، كلام بسيط، عملي، بحال راك تهدر مع شخص في الحقل.
- ما تستعملش مصطلحات تقنية صعيبة.
- أعطي نصائح واضحة: واش يدير، وقتاش، وكيفاش.
- جاوب فقط بنص بسيط (بلا عناوين، بلا markdown، بلا قوائم).
- ابدأ بسلام باسم الشخص وخلص بكلمة تشجيع.
- الطول: من 4 حتى 8 جمل.
- ما تذكرش أبداً أنك مساعد ذكاء اصطناعي ولا أي مزود خارجي.`;

    const user = `هاد القراءات اللي جابهم قلم AgriPen من التربة:\n${readings || "(ما كاينش قراءات)"}\n\nحلل الوضع وأعطي نصايح: الري، التسميد، والمحصول المناسب إلى لزم.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Advice failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return { text: json.choices?.[0]?.message?.content?.trim() ?? "" };
  });
