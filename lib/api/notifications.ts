import { apiClient } from "./client";
import type { Notification } from "@/lib/types/api";

type BackendNotification = {
  id?: string;
  notification_id?: string;
  user_id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  is_read?: boolean;
  created_at?: string;
  createdAt?: string;
};

type BackendNotificationsResponse = {
  data?: BackendNotificationsResponse | BackendNotification[];
  notifications?: BackendNotification[];
  results?: number;
  status?: string;
};

function unwrapNotifications(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data;
  }

  const maybeData = (data as BackendNotificationsResponse).data;
  if (maybeData && typeof maybeData === "object") {
    return unwrapNotifications(maybeData);
  }

  return data;
}

function toNotification(item: BackendNotification): Notification {
  return {
    id: item.id ?? item.notification_id ?? "",
    user_id: item.user_id ?? "",
    title: item.title ?? "",
    message: item.message ?? "",
    read: Boolean(item.read ?? item.is_read ?? false),
    created_at: item.created_at ?? item.createdAt ?? "",
  };
}

function normalizeNotifications(response: unknown): Notification[] {
  const unwrapped = unwrapNotifications(response);

  if (Array.isArray(unwrapped)) {
    return unwrapped.map((item) => toNotification(item as BackendNotification));
  }

  const maybeResponse = unwrapped as BackendNotificationsResponse;
  if (Array.isArray(maybeResponse.notifications)) {
    return maybeResponse.notifications.map((item) => toNotification(item));
  }

  if (Array.isArray(maybeResponse.data)) {
    return (maybeResponse.data as BackendNotification[]).map((item) =>
      toNotification(item)
    );
  }

  return [];
}

export const notificationService = {
  async getMyNotifications(token: string) {
    const response = await apiClient.get<unknown>("/api/notifications/me", {
      token,
    });
    return normalizeNotifications(response);
  },

  async markAsRead(notificationId: string | number, token: string) {
    return apiClient.patch(
      `/api/notifications/${notificationId}/read`,
      undefined,
      { token }
    );
  },

  async markAsReadByQuery(notificationId: string | number, token: string) {
    return apiClient.post<Notification | any>(
      `/api/notifications/read?id=${notificationId}`,
      undefined,
      { token }
    );
  },
};
