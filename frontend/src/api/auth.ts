import type { AuthUser } from "@/types/domain";
import { api, unwrap } from "./client";
import { MOCK_CREDENTIALS, delay } from "./mock/data";
import { useAuthStore } from "@/store/auth";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

type LoginResponse = {
  access_token: string;
  expires_in: number;
  user: AuthUser;
};

export async function login(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const subdomain = useAuthStore.getState().tenantSubdomain || "demo";

  if (useMock) {
    await delay();
    const cred = MOCK_CREDENTIALS[normalized];
    if (!cred || cred.password !== password) throw new Error("Invalid email or password");
    return {
      access_token: `mock-token-${cred.user.id}`,
      expires_in: 900,
      user: cred.user,
    } satisfies LoginResponse;
  }

  return unwrap(
    api.post("/api/v1/auth/login", { email: normalized, password })
  ) as Promise<LoginResponse>;
}

export async function loginPlatform(email: string, password: string) {
  const normalized = email.trim().toLowerCase();

  if (useMock) {
    await delay();
    if (normalized !== "super@vms.local" || password !== "super123") {
      throw new Error("Invalid credentials");
    }
    return {
      access_token: "mock-platform-token",
      expires_in: 28800,
      user: {
        id: "super-1",
        name: "Platform Admin",
        email: "super@vms.local",
        role: "super_user",
        location_ids: [],
        tenant_id: "",
        tenant_name: "Platform",
      },
    } satisfies LoginResponse;
  }

  return unwrap(
    api.post("/api/v1/platform/auth/login", { email: normalized, password })
  ) as Promise<LoginResponse>;
}
