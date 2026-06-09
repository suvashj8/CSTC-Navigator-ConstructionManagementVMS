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

/** Mark specific notifications read, or all unread when ids is empty. */
export async function markNotificationsReadBulk(ids: string[] = []) {
  if (useMock) {
    await delay(100);
    if (ids.length === 0) {
      mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
    } else {
      const idSet = new Set(ids);
      mockNotifications = mockNotifications.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n));
    }
    return;
  }
  await api.post("/api/v1/notifications/mark-read", { ids });
}

export function unreadCount(notifications: AppNotification[]) {
  return notifications.filter((n) => !n.read).length;
}
