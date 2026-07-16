// Pull-to-refresh wrapper — native-app style; triggers onRefresh when threshold met.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { haptic } from "@/lib/haptics";

const THRESHOLD = 70;
const MAX = 110;

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => void | Promise<void> }) {
  const startY = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 4 || busy) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const d = e.touches[0].clientY - startY.current;
      if (d <= 0) { setDy(0); return; }
      const eased = Math.min(MAX, d * 0.5);
      setDy(eased);
      if (eased > THRESHOLD - 6 && eased < THRESHOLD + 6) haptic("light");
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      const armed = dy >= THRESHOLD;
      startY.current = null;
      if (armed) {
        setBusy(true); haptic("medium");
        try { await onRefresh(); } finally { setBusy(false); setDy(0); haptic("success"); }
      } else setDy(0);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [dy, busy, onRefresh]);

  const armed = dy >= THRESHOLD;

  return (
    <div ref={ref} className="relative">
      <div
        className="pointer-events-none absolute top-0 inset-x-0 flex justify-center transition-transform"
        style={{ transform: `translateY(${busy ? 20 : dy - 40}px)`, opacity: busy || dy > 6 ? 1 : 0 }}
      >
        <div className="glass rounded-full size-11 grid place-items-center shadow-lg">
          {busy ? <Loader2 className="size-5 animate-spin text-primary" />
            : <ArrowDown className={`size-5 text-primary transition-transform ${armed ? "rotate-180" : ""}`} />}
        </div>
      </div>
      <div style={{ transform: busy ? "translateY(30px)" : `translateY(${dy * 0.35}px)`, transition: startY.current ? "none" : "transform 200ms" }}>
        {children}
      </div>
    </div>
  );
}
