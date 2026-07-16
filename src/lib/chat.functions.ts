import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .min(1),
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

export const chat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const label = DIALECT_LABEL[data.dialect] ?? DIALECT_LABEL.darija;
    const name = (data.userName ?? "").trim();

    const system = `راك مساعد فلاحي ذكي تابع لتطبيق AgriPen. تعاون المستخدم في كل ما يخص الفلاحة.
- خاطب المستخدم باسمه: ${name || "(بلا اسم — استعمل صيغة عامة محترمة بلا 'يا الفلاح')"}.
- ممنوع تماماً تستعمل عبارة "يا الفلاح" أو أي صيغة شبيهة، فيها إهانة.
- تكلم فقط بـ${label}، كلام بسيط، حار، عملي.
- ما تستعملش مصطلحات تقنية صعيبة.
- جاوب قصير ومفيد (2-5 جمل).
- ما تستعملش markdown ولا قوائم ولا عناوين، نص بسيط فقط.
- ما تذكرش أبداً أنك مساعد ذكاء اصطناعي ولا أي مزود خارجي.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return { text: json.choices?.[0]?.message?.content?.trim() ?? "" };
  });
