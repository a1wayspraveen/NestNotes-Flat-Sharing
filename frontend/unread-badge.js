// ========================================
// NESTNOTES UNREAD MESSAGE BADGE
// ========================================

(async function initUnreadMessageBadge() {
  const badge = document.getElementById("unreadMessageBadge");

  if (!badge) return;

  let token = localStorage.getItem("token");

  if (!token) {
    badge.hidden = true;
    return;
  }

  let isUpdating = false;

  // ========================================
  // UPDATE UNREAD MESSAGE COUNT
  // ========================================

  async function updateUnreadCount() {
    if (isUpdating || document.hidden) return;

    token = localStorage.getItem("token");

    if (!token) {
      badge.hidden = true;
      return;
    }

    isUpdating = true;

    try {
      const response = await fetch(
        `${window.NESTNOTES_API_BASE}/messages/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (response.status === 401 || response.status === 403) {
        badge.hidden = true;
        return;
      }

      if (!response.ok) {
        console.warn("Unable to fetch unread message count:", response.status);
        return;
      }

      const data = await response.json();
      const count = Number(data.unreadCount);

      if (!Number.isFinite(count) || count < 0) {
        return;
      }

      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count === 0;
    } catch (error) {
      console.error("Error updating unread message badge:", error);
    } finally {
      isUpdating = false;
    }
  }

  // Initial count.
  await updateUnreadCount();

  // Periodically refresh while the page is visible.
  window.setInterval(updateUnreadCount, 15000);

  // Refresh when returning to this page.
  window.addEventListener("pageshow", updateUnreadCount);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateUnreadCount();
    }
  });

  // Refresh when another script requests an update.
  window.addEventListener("unreadMessagesUpdated", updateUnreadCount);

  // Refresh when localStorage changes in another browser tab.
  window.addEventListener("storage", (event) => {
    if (event.key === "nestnotesUnreadRefresh") {
      updateUnreadCount();
    }

    if (event.key === "token") {
      token = localStorage.getItem("token");

      if (!token) {
        badge.hidden = true;
      } else {
        updateUnreadCount();
      }
    }
  });
})();

// ========================================
// NESTNOTES UNREAD NOTIFICATION BADGE
// ========================================

(async function initUnreadNotificationBadge() {
  const badge = document.getElementById("unreadNotificationBadge");

  if (!badge) return;

  let token = localStorage.getItem("token");

  if (!token) {
    badge.hidden = true;
    return;
  }

  let isUpdating = false;

  async function updateUnreadNotificationCount() {
    if (isUpdating || document.hidden) return;

    token = localStorage.getItem("token");

    if (!token) {
      badge.hidden = true;
      return;
    }

    isUpdating = true;

    try {
      const response = await fetch(
        `${window.NESTNOTES_API_BASE}/messages/notifications/${encodeURIComponent(
          localStorage.getItem("userId"),
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          badge.hidden = true;
        }

        return;
      }

      const notifications = await response.json();

      if (!Array.isArray(notifications)) return;

      const unreadCount = notifications.filter(
        (notification) => Number(notification.isRead) === 0,
      ).length;

      badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);

      badge.hidden = unreadCount === 0;
    } catch (error) {
      console.error("Error updating unread notification badge:", error);
    } finally {
      isUpdating = false;
    }
  }

  await updateUnreadNotificationCount();

  window.setInterval(updateUnreadNotificationCount, 15000);

  window.addEventListener("pageshow", updateUnreadNotificationCount);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateUnreadNotificationCount();
    }
  });

  window.addEventListener(
    "unreadNotificationsUpdated",
    updateUnreadNotificationCount,
  );

  window.addEventListener("storage", (event) => {
    if (
      event.key === "nestnotesUnreadRefresh" ||
      event.key === "token" ||
      event.key === "userId"
    ) {
      updateUnreadNotificationCount();
    }
  });
})();

// ========================================
// REFRESH NESTNOTES NOTIFICATION BADGE
// ========================================

window.refreshUnreadNotifications = function () {
  window.dispatchEvent(new Event("unreadNotificationsUpdated"));

  // Notify other open NestNotes tabs.
  localStorage.setItem("nestnotesUnreadRefresh", String(Date.now()));
};
