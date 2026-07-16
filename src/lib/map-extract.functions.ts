// Extract farm polygon coordinates from a hand-drawn map photo using Gemini Vision.
// Returns approximate normalized polygon points that the client centers on the current farm GPS.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  centerLat: z.number(),
  centerLng: z.number(),
  approxAreaHa: z.number().optional(),
});

type Point = { x: number; y: number };

export const extractPolygonFromImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You analyze a hand-drawn or scanned farm boundary map.
Return STRICT JSON only, no markdown or fences:
{
  "points": [{"x": 0.12, "y": 0.34}, ...],
  "orientation_deg": 0,
  "approx_area_ha": 1.5,
  "confidence": 0.0
}
- points: 5..40 ordered polygon vertices in NORMALIZED image coordinates (0..1), (0,0)=top-left.
- Trace the CLOSED main plot outline in the image. Skip legends/text.
- If no clear boundary is found, return an empty points array.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: [
            { type: "text", text: "Extract the farm plot polygon from this image." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ] },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI failed: ${res.status}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    let raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { points?: Point[]; approx_area_ha?: number; confidence?: number };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const pts = Array.isArray(parsed.points) ? parsed.points.filter((p) => typeof p?.x === "number" && typeof p?.y === "number") : [];
    if (pts.length < 3) return { latlngs: [] as Array<[number, number]>, confidence: 0 };

    // Convert normalized image points to LatLng around the farm center.
    // Estimate ground extent from area (hectares); default 1 ha ≈ 100m x 100m.
    const areaHa = data.approxAreaHa ?? parsed.approx_area_ha ?? 1.5;
    const sideM = Math.sqrt(areaHa * 10000);
    const halfM = sideM / 2;
    // Meters per degree lat / lng at the given center.
    const mPerDegLat = 110540;
    const mPerDegLng = 111320 * Math.cos((data.centerLat * Math.PI) / 180);

    const latlngs: Array<[number, number]> = pts.map((p) => {
      const dxM = (p.x - 0.5) * 2 * halfM;   // east+
      const dyM = -(p.y - 0.5) * 2 * halfM;  // north+
      return [data.centerLat + dyM / mPerDegLat, data.centerLng + dxM / mPerDegLng];
    });
    return { latlngs, confidence: parsed.confidence ?? 0.6 };
  });
