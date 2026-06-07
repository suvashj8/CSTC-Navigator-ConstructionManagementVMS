import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/domain";

type AuthState = {
  token: string | null;
  platformToken: string | null;
  user: AuthUser | null;
  tenantSubdomain: string;
  setAuth: (token: string, user: AuthUser) => void;
  setPlatformAuth: (token: string, user: AuthUser) => void;
  setTenantSubdomain: (subdomain: string) => void;
  logout: () => void;
  logoutPlatform: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      platformToken: null,
      user: null,
      tenantSubdomain: "demo",
      setAuth: (token, user) => set({ token, user }),
      setPlatformAuth: (platformToken, user) => set({ platformToken, user }),
      setTenantSubdomain: (tenantSubdomain) => set({ tenantSubdomain }),
      logout: () => set({ token: null, user: null }),
      logoutPlatform: () => set({ platformToken: null }),
    }),
    { name: "vms-auth" }
  )
);
