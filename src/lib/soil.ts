// Real soil-readings hook — reads from Supabase, falls back to mock demo data.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/lib/auth-context";
import { SOIL_LATEST } from "@/lib/mockData";

export type SoilReading = {
  moisture: number | null;
  temperature: number | null;
  ph: number | null;
  salinity: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organic: number | null;
  taken_at: string;
  source: string;
  isReal: boolean;
};

function fmtWhen(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-GB", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export function useLatestSoil(lang = "ar"): { reading: SoilReading; loading: boolean } {
  const auth = useOptionalAuth();
  const uid = auth?.user?.id;
  const [reading, setReading] = useState<SoilReading>({
    moisture: SOIL_LATEST.moisture, temperature: SOIL_LATEST.temperature, ph: SOIL_LATEST.ph,
    salinity: SOIL_LATEST.salinity, nitrogen: SOIL_LATEST.nitrogen,
    phosphorus: SOIL_LATEST.phosphorus, potassium: SOIL_LATEST.potassium,
    organic: SOIL_LATEST.organic, taken_at: SOIL_LATEST.takenAt, source: "demo", isReal: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("soil_readings")
        .select("moisture,temperature,ph,salinity,nitrogen,phosphorus,potassium,organic,taken_at,source")
        .eq("user_id", uid)
        .order("taken_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const row = data?.[0];
      if (row) {
        setReading({
          moisture: row.moisture, temperature: row.temperature, ph: row.ph,
          salinity: row.salinity, nitrogen: row.nitrogen, phosphorus: row.phosphorus,
          potassium: row.potassium, organic: row.organic,
          taken_at: fmtWhen(row.taken_at, lang), source: row.source, isReal: true,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [uid, lang]);

  return { reading, loading };
}
