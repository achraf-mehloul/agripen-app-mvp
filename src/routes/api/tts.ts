import { createFileRoute } from "@tanstack/react-router";

const VOICE_INSTRUCTIONS: Record<string, string> = {
  darija:
    "Speak in Algerian Darija (الدارجة الجزائرية) — warm, friendly farmer tone. Use everyday spoken Algerian words. Speak clearly at a calm pace.",
  wahrania:
    "Speak in the Oranian Algerian dialect (الوهرانية) from western Algeria, warm and friendly.",
  chelfia:
    "Speak in the Chelfi Algerian dialect (الشلفية) from Chlef region, warm and friendly.",
  tlemcania:
    "Speak in the Tlemcani Algerian dialect (التلمسانية) with the soft western pronunciation, warm and friendly.",
  charqia:
    "Speak in the Eastern Algerian dialect (الشرقية) from Constantine/Annaba region, warm and friendly.",
  adraria:
    "Speak in the Adrari Algerian dialect (الأدرارية) from the southern Sahara, warm and friendly.",
};

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { text, dialect = "darija", voice = "alloy" } = (await request.json()) as {
          text?: string;
          dialect?: string;
          voice?: string;
        };
        if (!text) return new Response("Missing text", { status: 400 });

        const instructions =
          VOICE_INSTRUCTIONS[dialect] ?? VOICE_INSTRUCTIONS.darija;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice,
            instructions,
            response_format: "mp3",
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          return new Response(`TTS failed: ${res.status} ${body}`, {
            status: res.status,
          });
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      },
    },
  },
});
