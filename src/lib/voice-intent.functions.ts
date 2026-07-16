import { createServerFn } from "@tanstack/react-start";

export type VoiceIntent =
  | { action: "navigate"; to: string; reply: string }
  | { action: "reply"; reply: string };

const ROUTES: Record<string, string> = {
  home: "/", "/": "/",
  ai: "/ai", assistant: "/ai",
  crops: "/crops", cultures: "/crops",
  disease: "/disease", maladies: "/disease",
  fertilization: "/fertilization",
  trees: "/trees", arbres: "/trees",
  weather: "/weather", meteo: "/weather",
  profile: "/profile", account: "/profile",
  farm: "/farm", map: "/farm",
};

export const parseVoiceCommand = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const v = input as { text?: string; language?: string };
    return { text: (v.text ?? "").trim(), language: v.language ?? "ar" };
  })
  .handler(async ({ data }): Promise<VoiceIntent> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { action: "reply", reply: "الخدمة غير متوفرة." };
    if (!data.text) return { action: "reply", reply: "لم أسمعك، أعد من فضلك." };

    const system = `You are AgriPen's voice assistant for Algerian farmers. Reply in the same language as the user (Arabic/Darija, French, or English).
Return STRICT JSON: {"action":"navigate","to":"/ai"|"/crops"|"/disease"|"/fertilization"|"/trees"|"/weather"|"/profile"|"/farm"|"/","reply":"short spoken confirmation"} OR {"action":"reply","reply":"answer"}.
Route hints: "home/الرئيسية"=/, "assistant/المساعد"=/ai, "crops/المحاصيل"=/crops, "disease/الأمراض"=/disease, "fertilization/التسميد"=/fertilization, "trees/الأشجار"=/trees, "weather/الطقس"=/weather, "profile/الحساب"=/profile, "farm/المزرعة/الخريطة"=/farm.
Keep reply under 15 words.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.text },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as VoiceIntent;
      if (parsed.action === "navigate") {
        const to = ROUTES[parsed.to.replace(/^\//, "").toLowerCase()] ?? parsed.to;
        return { action: "navigate", to, reply: parsed.reply || "حسنا" };
      }
      return parsed;
    } catch {
      // Fallback simple keyword match
      const t = data.text.toLowerCase();
      for (const [k, v] of Object.entries(ROUTES)) {
        if (t.includes(k)) return { action: "navigate", to: v, reply: "حاضر" };
      }
      return { action: "reply", reply: "لم أفهم الطلب." };
    }
  });
