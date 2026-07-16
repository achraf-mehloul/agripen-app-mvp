import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <AuthProvider>
      <OnboardingGate />
    </AuthProvider>
  );
}

function OnboardingGate() {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!profile) { setReady(true); return; }
    const onOnboarding = location.pathname.startsWith("/onboarding");
    if (!profile.onboarded && !onOnboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (profile.onboarded && onOnboarding) {
      navigate({ to: "/", replace: true });
      return;
    }
    setReady(true);
  }, [loading, profile, location.pathname, navigate]);

  if (!ready || loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  return <Outlet />;
}
