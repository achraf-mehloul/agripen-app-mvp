import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Insert = z.object({
  farm_id: z.string().nullish(),
  kind: z.enum(["irrigation", "fertilization", "planting", "harvest", "disease", "soil", "note"]),
  title: z.string().min(1).max(160),
  detail: z.string().nullish(),
  amount: z.number().nullish(),
  unit: z.string().nullish(),
  occurred_at: z.string().optional(),
});

export const addFarmEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Insert.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("farm_events")
      .insert({ ...data, user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listFarmEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("farm_events")
      .select("id, kind, title, detail, amount, unit, occurred_at")
      .eq("user_id", context.userId)
      .order("occurred_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
