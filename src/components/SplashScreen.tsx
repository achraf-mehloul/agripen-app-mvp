// Native-feel splash screen shown once per session on cold boot.
import { useEffect, useState } from "react";
import logo from "@/assets/agripen-logo.png.asset.json";

const KEY = "agripen-splash-shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(KEY) !== "1"; } catch { return false; }
  });
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setFade(true), 1100);
    const t2 = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center transition-opacity duration-500 ${fade ? "opacity-0" : "opacity-100"}`}
      style={{ background: "linear-gradient(135deg, #2f7d4f 0%, #4ea36a 50%, #86d29b 100%)" }}
      aria-hidden={fade}
    >
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="size-28 rounded-[32px] bg-white/95 shadow-2xl grid place-items-center animate-pulse">
          <img src={logo.url} alt="AgriPen" className="size-20" />
        </div>
        <div className="text-white text-center">
          <h1 className="text-3xl font-black tracking-tight">AgriPen</h1>
          <p className="text-xs mt-1 opacity-90">Smart Farming for Algeria</p>
        </div>
        <div className="mt-6 flex gap-1.5">
          <span className="size-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="size-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="size-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
