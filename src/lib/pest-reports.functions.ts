import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Insert = z.object({
  wilaya: z.string().nullish(),
  baladia: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  pest_name: z.string().min(2).max(120),
  plant: z.string().nullish(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().nullish(),
});

export const reportPest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Insert.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("pest_reports")
      .insert({ ...data, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const List = z.object({ wilaya: z.string().nullish(), limit: z.number().default(50) });
export const listPestReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => List.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("pest_reports")
      .select("id, wilaya, baladia, latitude, longitude, pest_name, plant, severity, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.wilaya) q = q.eq("wilaya", data.wilaya);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
