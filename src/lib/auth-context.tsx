import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  full_name_latin: string | null;
  email: string | null;
  language: string;
  dialect: string;
  dark_mode: boolean;
  show_trees: boolean;
  show_weather: boolean;
  notifications: boolean;
  voice_control: boolean;
  onboarded: boolean;
};

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    if (data.user) await loadProfile(data.user.id);
    else setProfile(null);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (mounted) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (session?.user) void loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [refresh, loadProfile]);

  // Apply dark mode based on profile
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", !!profile?.dark_mode);
  }, [profile?.dark_mode]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!user) return;
    setProfile((p) => (p ? { ...p, ...patch } : p));
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.href = "/auth";
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refresh, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Optional reader for components that may render outside the provider
export function useOptionalAuth(): Ctx | null {
  return useContext(AuthContext);
}
