import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Home, Sparkles, Wheat, Leaf, User, WifiOff, LogOut, Map } from "lucide-react";
import logo from "@/assets/agripen-logo.png.asset.json";
import { useOptionalAuth } from "@/lib/auth-context";
import { VoiceFAB } from "@/components/VoiceFAB";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useT } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";

function usePrimary() {
  const { t } = useT();
  return [
    { to: "/",         label: t("nav.home"),    icon: Home },
    { to: "/ai",       label: t("nav.ai"),      icon: Sparkles },
    { to: "/farm",     label: t("nav.farm"),    icon: Map },
    { to: "/disease",  label: t("nav.disease"), icon: Leaf },
    { to: "/crops",    label: t("nav.crops"),   icon: Wheat },
    { to: "/profile",  label: t("nav.profile"), icon: User },
  ] as const;
}

function useSecondary() {
  const { t } = useT();
  return [
    { to: "/irrigation",   label: t("nav.irrigation"),   icon: "💧" },
    { to: "/timeline",     label: t("nav.timeline"),     icon: "🕒" },
    { to: "/pests",        label: t("nav.pests"),        icon: "🐛" },
    { to: "/trees",        label: t("nav.trees"),        icon: "🌳" },
    { to: "/weather",      label: t("nav.weather"),      icon: "☁️" },
    { to: "/fertilization",label: t("nav.fertilization"),icon: "🧪" },
  ] as const;
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const auth = useOptionalAuth();
  const PRIMARY = usePrimary();
  const SECONDARY = useSecondary();
  const { dir, t } = useT();

  return (
    <div dir={dir} className="mx-auto max-w-[1400px] min-h-dvh">
      <span className="sr-only">{t("app.name")}</span>
      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex sticky top-0 h-dvh w-64 flex-col gap-2 p-4">
          <div className="glass rounded-3xl p-4 flex items-center gap-3">
            <img src={logo.url} alt="AgriPen" className="size-12 rounded-2xl shadow-lg" />
            <div className="min-w-0">
              <p className="font-bold text-lg leading-tight">AgriPen</p>
              <p className="text-xs text-muted-foreground truncate">{auth?.profile?.full_name ?? t("app.tagline")}</p>
            </div>
          </div>
          <nav className="glass rounded-3xl p-2 flex-1 overflow-y-auto no-scrollbar">
            {PRIMARY.map((n) => {
              const active = path === n.to;
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to} onClick={() => haptic("light")} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${active ? "bg-gradient-to-l from-primary to-leaf text-primary-foreground shadow-lg" : "hover:bg-white/50 dark:hover:bg-white/10"}`}>
                  <Icon className="size-5 shrink-0" />
                  <span>{n.label}</span>
                </Link>
              );
            })}
            <div className="h-px my-2 bg-border/60" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">{t("nav.more")}</p>
            {SECONDARY.map((n) => {
              const active = path === n.to;
              return (
                <Link key={n.to} to={n.to} onClick={() => haptic("light")} className={`flex items-center gap-3 px-3 py-2 rounded-2xl text-sm transition-all ${active ? "bg-primary/15 text-primary font-semibold" : "hover:bg-white/40 dark:hover:bg-white/5"}`}>
                  <span className="text-lg">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </nav>
          {auth?.user && (
            <button onClick={() => void auth.signOut()} className="glass rounded-2xl p-3 flex items-center gap-2 text-sm font-bold text-rose-600 press">
              <LogOut className="size-4" /> {t("common.signout")}
            </button>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 pb-[96px] lg:pb-6">
          <header className="lg:hidden sticky top-0 z-30 px-3 pt-3">
            <div className="glass rounded-2xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={logo.url} alt="AgriPen" className="size-9 rounded-xl shadow shrink-0" />
                <div className="leading-tight min-w-0">
                  <p className="font-bold text-sm truncate">{title ?? "AgriPen"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{auth?.profile?.full_name ?? t("app.tagline")}</p>
                </div>
              </div>
              <div className={`size-2.5 rounded-full shrink-0 ${online ? "bg-emerald-500" : "bg-amber-500"} shadow-[0_0_10px] shadow-emerald-500/60`} />
            </div>
            {!online && (
              <div className="mt-2 glass rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-amber-700">
                <WifiOff className="size-3.5" /> {t("common.offline_note")}
              </div>
            )}
          </header>

          <div key={path} className="p-4 lg:p-6 page-enter">{children}</div>
        </main>
      </div>

      {/* Bottom nav - mobile: 6 primary items */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-2 mb-2 glass-strong rounded-[28px] px-1 py-1.5 flex items-center justify-between shadow-2xl">
          {PRIMARY.map((n) => {
            const active = path === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => haptic("light")}
                className={`relative flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all duration-300 ${active ? "bg-gradient-to-br from-primary to-leaf text-primary-foreground shadow-md scale-[1.03]" : "text-muted-foreground active:scale-95"}`}
              >
                <Icon className="size-[20px]" strokeWidth={active ? 2.4 : 2} />
                <span className="text-[9.5px] font-semibold leading-none">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <VoiceFAB />
      <OnboardingTour />
    </div>
  );
}

export function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {icon && <div className="text-3xl">{icon}</div>}
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
