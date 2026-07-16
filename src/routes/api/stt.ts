import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const inForm = await request.formData();
        const file = inForm.get("file");
        if (!(file instanceof File)) return new Response("Missing file", { status: 400 });
        if (file.size < 1024) return new Response("Audio empty", { status: 400 });

        const up = new FormData();
        up.append("model", "openai/gpt-4o-mini-transcribe");
        up.append("file", file, file.name || "recording.wav");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: up,
        });
        if (!res.ok) return new Response(`STT failed: ${res.status} ${await res.text()}`, { status: res.status });
        const json = (await res.json()) as { text?: string };
        return new Response(JSON.stringify({ text: json.text ?? "" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
