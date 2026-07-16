// Lightweight haptic feedback (no-op on unsupported devices).
type Pattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const MAP: Record<Pattern, number | number[]> = {
  light: 8,
  medium: 15,
  heavy: 25,
  success: [10, 40, 10],
  warning: [20, 60, 20],
  error: [30, 40, 30, 40, 60],
};

export function haptic(kind: Pattern = "light") {
  if (typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(MAP[kind]);
  } catch { /* ignore */ }
}
