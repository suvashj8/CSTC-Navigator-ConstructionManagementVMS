import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-config";
import { useAuthStore } from "../store/auth";

const baseURL = getApiBaseUrl();

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  const t = state.token ?? state.platformToken;
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  if (state.tenantSubdomain && !config.url?.includes("/platform/")) {
    config.headers["X-Tenant-Subdomain"] = state.tenantSubdomain;
  }
  return config;
});

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  meta?: { total?: number; page?: number; per_page?: number; total_pages?: number };
  error?: { code: string; message: string };
  timestamp?: string;
};

export function apiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: ApiEnvelope<unknown>; status?: number } }).response;
    const msg = res?.data?.error?.message;
    if (msg) return msg;
    const status = res?.status;
    if (status === 503) {
      return msg ?? "Database not ready — start Docker Desktop, then run npm run dev from the project root.";
    }
    if (status === 401 && msg?.includes("invalid")) {
      return "invalid tenant or credentials";
    }
    if (status === 500 || status === 502 || status === 504) {
      return "Cannot reach API. Start Docker Desktop, then run npm run dev from the project root.";
    }
    if (status) return `Request failed (${status})`;
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "ERR_NETWORK" || code === "ECONNREFUSED") {
      return "Cannot reach API. Start Docker Desktop, then run npm run dev from the project root.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Request failed";
}

export async function unwrap<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const { data } = await p;
    if (!data.success || data.data === undefined || data.data === null) {
      throw new Error(data.error?.message ?? "Request failed");
    }
    return data.data;
  } catch (e) {
    throw new Error(apiErrorMessage(e));
  }
}

export async function unwrapPaginated<T>(
  p: Promise<{ data: ApiEnvelope<T[] | null> }>
): Promise<{ rows: T[]; total: number; page: number; per_page: number }> {
  const { data } = await p;
  if (!data.success) throw new Error(data.error?.message ?? "Request failed");
  return {
    rows: data.data ?? [],
    total: data.meta?.total ?? 0,
    page: data.meta?.page ?? 1,
    per_page: data.meta?.per_page ?? 10,
  };
}

export async function unwrapList<T>(p: Promise<{ data: ApiEnvelope<T[] | null> }>): Promise<T[]> {
  const { data } = await p;
  if (!data.success) throw new Error(data.error?.message ?? "Request failed");
  return data.data ?? [];
}

/** Download binary export (PDF/XLSX) with auth headers. */
export async function downloadBlob(path: string, fileName: string) {
  const state = useAuthStore.getState();
  const headers: Record<string, string> = {};
  const t = state.token ?? state.platformToken;
  if (t) headers.Authorization = `Bearer ${t}`;
  if (state.tenantSubdomain) headers["X-Tenant-Subdomain"] = state.tenantSubdomain;

  const res = await axios.get(`${baseURL}${path}`, { headers, responseType: "blob" });
  const blob = res.data as Blob;
  return { blob, fileName };
}
