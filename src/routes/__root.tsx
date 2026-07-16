import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerPwa } from "../lib/pwa-register";
import { SplashScreen } from "../components/SplashScreen";

function NotFoundComponent() {
  return (
    <div dir="rtl" className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass rounded-3xl p-8 max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <Link to="/" className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">العودة للرئيسية</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div dir="rtl" className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass rounded-3xl p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold">حدث خطأ</h1>
        <p className="mt-2 text-sm text-muted-foreground">جرب إعادة المحاولة.</p>
        <div className="mt-6 flex gap-2 justify-center">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">إعادة المحاولة</button>
          <a href="/" className="rounded-2xl border px-4 py-2 text-sm">الرئيسية</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "AgriPen" },
      { name: "description", content: "AgriPen" },
      { name: "theme-color", content: "#2f7d4f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AgriPen" },
      { property: "og:title", content: "AgriPen" },
      { property: "og:description", content: "AgriPen" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "AgriPen" },
      { name: "twitter:description", content: "AgriPen" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/KPcl2igEvncTdKxqQOkyNTvzalE3/social-images/social-1782609573199-photo-pen.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/KPcl2igEvncTdKxqQOkyNTvzalE3/social-images/social-1782609573199-photo-pen.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/pwa-icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/pwa-icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Rubik:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { void registerPwa(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />
      <Outlet />
    </QueryClientProvider>
  );
}
