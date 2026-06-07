import type { AppNotification } from "@/types/domain";
import { api, unwrapList } from "./client";
import { MOCK_NOTIFICATIONS, delay } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockNotifications = [...MOCK_NOTIFICATIONS];

export async function listNotifications() {
  if (useMock) {
    await delay();
    return [...mockNotifications];
  }
  return unwrapList(api.get("/api/v1/notifications")) as Promise<AppNotification[]>;
}

export async function markNotificationRead(id: string) {
  if (useMock) {
    await delay(100);
    mockNotifications = mockNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    return;
  }
  await api.put(`/api/v1/notifications/${id}/read`);
}

export function unreadCount(notifications: AppNotification[]) {
  return notifications.filter((n) => !n.read).length;
}
