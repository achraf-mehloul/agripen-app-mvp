// Rule-based irrigation scheduler: soil moisture + rain forecast → next 7-day plan.
export type ForecastDay = { date: string; tempMax: number; tempMin: number; rainMm: number; humidity: number };
export type IrrigationDay = { date: string; action: "skip" | "light" | "normal" | "deep"; amountL: number; reason: string };

export function planIrrigation(
  moisturePct: number,
  forecast: ForecastDay[],
  areaHectares = 1,
): IrrigationDay[] {
  const baseLPerHa = 30000; // ~30 m³/ha per full watering
  const out: IrrigationDay[] = [];
  let simMoisture = moisturePct;

  for (const day of forecast.slice(0, 7)) {
    simMoisture -= 6; // daily evapotranspiration
    simMoisture += day.rainMm * 1.4; // rain absorption
    simMoisture = Math.max(5, Math.min(95, simMoisture));

    let action: IrrigationDay["action"] = "skip";
    let reason = "الرطوبة كافية";
    if (day.rainMm >= 5) { action = "skip"; reason = `مطر متوقع ${day.rainMm.toFixed(1)}mm`; }
    else if (simMoisture < 25) { action = "deep"; reason = "الرطوبة منخفضة جداً"; simMoisture += 40; }
    else if (simMoisture < 40) { action = "normal"; reason = "الرطوبة منخفضة"; simMoisture += 25; }
    else if (day.tempMax >= 35) { action = "light"; reason = "درجة حرارة مرتفعة"; simMoisture += 12; }

    const factor = action === "deep" ? 1 : action === "normal" ? 0.6 : action === "light" ? 0.3 : 0;
    out.push({
      date: day.date,
      action,
      amountL: Math.round(baseLPerHa * areaHectares * factor),
      reason,
    });
  }
  return out;
}

export function mockForecast(): ForecastDay[] {
  const now = new Date();
  const out: ForecastDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 864e5);
    const rain = i === 2 || i === 5 ? Math.random() * 12 : Math.random() * 1.2;
    out.push({
      date: d.toISOString().slice(0, 10),
      tempMax: 26 + Math.round(Math.random() * 12),
      tempMin: 12 + Math.round(Math.random() * 8),
      rainMm: +rain.toFixed(1),
      humidity: 40 + Math.round(Math.random() * 30),
    });
  }
  return out;
}
