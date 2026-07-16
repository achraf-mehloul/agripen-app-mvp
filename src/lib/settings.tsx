import { useOptionalAuth } from "@/lib/auth-context";

export type Settings = {
  showTrees: boolean;
  showWeather: boolean;
  notifications: boolean;
  dark: boolean;
};

const DEFAULTS: Settings = {
  showTrees: true,
  showWeather: true,
  notifications: true,
  dark: false,
};

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

/** Reads/writes settings from the authenticated user's profile when available. */
export function useSettings(): Ctx {
  const auth = useOptionalAuth();
  if (!auth?.profile) return { settings: DEFAULTS, update: () => {} };
  const p = auth.profile;
  return {
    settings: {
      showTrees: p.show_trees,
      showWeather: p.show_weather,
      notifications: p.notifications,
      dark: p.dark_mode,
    },
    update: (patch) => {
      const dbPatch: Record<string, boolean> = {};
      if (patch.showTrees !== undefined) dbPatch.show_trees = patch.showTrees;
      if (patch.showWeather !== undefined) dbPatch.show_weather = patch.showWeather;
      if (patch.notifications !== undefined) dbPatch.notifications = patch.notifications;
      if (patch.dark !== undefined) dbPatch.dark_mode = patch.dark;
      void auth.updateProfile(dbPatch as Parameters<typeof auth.updateProfile>[0]);
    },
  };
}
