const API_URL = window.NESTNOTES_API_BASE;

const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

async function loadNotifications() {
  const container = document.getElementById("notificationsContainer");

  if (!container) {
    console.error("Notifications container not found.");
    return;
  }

  if (!token || !userId) {
    showNotificationMessage(
      container,
      "login",
      "Please log in to view your notifications.",
      "Log in",
      "login.html",
    );
    return;
  }

  // Show loading state
  container.innerHTML = `
        <div class="notification-state">
            <div class="notification-state-icon">◌</div>
            <h3>Loading notifications</h3>
            <p>Checking your latest NestNotes activity...</p>
        </div>
    `;

  try {
    const response = await fetch(
      `${API_URL}/messages/notifications/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (response.status === 401) {
      showNotificationMessage(
        container,
        "login",
        "Your session has expired. Please log in again.",
        "Log in again",
        "login.html",
      );

      console.error("Notifications request returned 401 Unauthorized.");
      return;
    }

    if (response.status === 403) {
      showNotificationMessage(
        container,
        "error",
        "You don't have permission to view these notifications.",
      );

      console.error("Notifications request returned 403 Forbidden.");
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to load notifications: ${response.status}`);
    }

    let notifications = await response.json();

    container.replaceChildren();

    if (!Array.isArray(notifications) || notifications.length === 0) {
      showEmptyNotifications(container);
      return;
    }

    // Count unread notifications before changing anything.
    const unreadCount = notifications.filter(
      (notification) => Number(notification.isRead) === 0,
    ).length;

    if (markAllReadButton) {
      markAllReadButton.hidden = unreadCount === 0;
    }

    // Display the notification count.
    const count = document.createElement("div");
    count.className = "notifications-count";

    count.textContent = `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} · ${notifications.length} total`;

    container.appendChild(count);

    // Render notification cards.
    notifications.forEach((notification) => {
      const item = document.createElement("article");
      item.className = "notification-item";

      // Visually distinguish unread notifications from read ones.
      const isUnread = Number(notification.isRead) === 0;

      if (isUnread) {
        item.classList.add("notification-unread");
      } else {
        item.classList.add("notification-read");
      }

      const notificationListingId = Number(notification.listingId);
      const notificationOtherUserId = Number(notification.otherUserId);

      const hasConversation =
        Number.isInteger(notificationListingId) &&
        notificationListingId > 0 &&
        Number.isInteger(notificationOtherUserId) &&
        notificationOtherUserId > 0;

      if (hasConversation) {
        item.classList.add("notification-clickable");
        item.tabIndex = 0;
        item.setAttribute("role", "link");
        item.setAttribute(
          "aria-label",
          `Open conversation: ${notification.message || "New notification"}`,
        );

        const openConversation = async () => {
          // Mark this notification as read before opening the chat.
          if (Number(notification.isRead) === 0) {
            try {
              const response = await fetch(
                `${API_URL}/messages/notifications/${encodeURIComponent(notification.id)}/read`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (!response.ok) {
                throw new Error("Could not mark notification as read.");
              }

              notification.isRead = 1;
              item.classList.remove("notification-unread");
              item.classList.add("notification-read");

              // Refresh the notification badge immediately.
              if (typeof window.refreshUnreadNotifications === "function") {
                window.refreshUnreadNotifications();
              }
            } catch (error) {
              console.error("Mark notification as read failed:", error);
            }
          }

          // Open the conversation using the existing chat URL parameters.
          const chatUrl = new URL("chat.html", window.location.href);
          chatUrl.searchParams.set("listingId", notificationListingId);
          chatUrl.searchParams.set("userId", notificationOtherUserId);

          window.location.href = chatUrl.toString();
        };

        item.addEventListener("click", openConversation);

        item.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openConversation();
          }
        });
      }

      const icon = document.createElement("div");
      icon.className = "notification-item-icon";
      icon.textContent = "🔔";

      const content = document.createElement("div");
      content.className = "notification-item-content";

      const message = document.createElement("p");
      message.className = "notification-item-message";
      message.textContent =
        notification.message || "You have a new notification.";

      const timestamp = document.createElement("small");
      timestamp.className = "notification-item-time";

      if (notification.created_at) {
        const date = new Date(notification.created_at);

        timestamp.textContent = Number.isNaN(date.getTime())
          ? notification.created_at
          : date.toLocaleString();
      } else {
        timestamp.textContent = "Recent activity";
      }

      content.append(message, timestamp);
      item.append(icon, content);

      container.appendChild(item);
    });
  } catch (error) {
    console.error("Notification loading error:", error);

    showNotificationMessage(
      container,
      "error",
      "We couldn't load your notifications. Check your connection and try again.",
      "Try again",
      null,
      loadNotifications,
    );
  }
}

/* ==========================================
   EMPTY STATE
========================================== */

function showEmptyNotifications(container) {
  container.innerHTML = `
        <div class="notification-state notification-empty-state">

            <div class="notification-state-icon">
                <span>🔔</span>
            </div>

            <h3>You're all caught up!</h3>

            <p>
                Nothing new right now. When you receive updates about
                your listings or conversations, they'll appear here.
            </p>

            <a href="index.html#listingContainer"
               class="notification-state-button">
                Explore Listings <span>→</span>
            </a>

        </div>
    `;
}

/* ==========================================
   LOGIN / ERROR STATES
========================================== */

function showNotificationMessage(
  container,
  type,
  message,
  buttonText = null,
  buttonHref = null,
  buttonAction = null,
) {
  container.replaceChildren();

  const state = document.createElement("div");
  state.className = `notification-state notification-${type}-state`;

  const icon = document.createElement("div");
  icon.className = "notification-state-icon";

  icon.textContent = type === "login" ? "🔐" : "⚠️";

  const heading = document.createElement("h3");

  heading.textContent =
    type === "login" ? "Sign in to continue" : "Something went wrong";

  const description = document.createElement("p");
  description.textContent = message;

  state.append(icon, heading, description);

  if (buttonText) {
    if (buttonHref) {
      const link = document.createElement("a");

      link.href = buttonHref;
      link.className = "notification-state-button";
      link.textContent = buttonText;

      state.appendChild(link);
    } else if (buttonAction) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "notification-state-button";
      button.textContent = buttonText;

      button.addEventListener("click", buttonAction);

      state.appendChild(button);
    }
  }

  container.appendChild(state);
}

// ========================================
// MARK ALL NOTIFICATIONS AS READ BUTTON
// ========================================

function setupMarkAllReadButton() {
  const container = document.getElementById("notificationsContainer");

  if (!container) return;

  const button = document.createElement("button");

  button.type = "button";
  button.id = "markAllReadBtn";
  button.className = "mark-all-read-btn";
  button.textContent = "✓ Mark all as read";
  button.hidden = true;

  container.parentNode.insertBefore(button, container);

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    button.disabled = true;
    button.textContent = "Marking as read...";

    try {
      const result = await markNotificationsAsRead();

      // Update all notification cards visually.
      container.querySelectorAll(".notification-item").forEach((item) => {
        item.classList.remove("notification-unread");
        item.classList.add("notification-read");
      });

      // Update the unread count.
      const count = container.querySelector(".notifications-count");

      if (count) {
        const total = container.querySelectorAll(".notification-item").length;

        count.textContent = `0 unread notifications · ${total} total`;
      }

      button.hidden = true;

      // Refresh the navbar notification badge.
      if (typeof window.refreshUnreadNotifications === "function") {
        window.refreshUnreadNotifications();
      }

      console.log("Notifications marked as read:", result.updatedCount);
    } catch (error) {
      console.error("Mark all notifications as read failed:", error);
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "✓ Mark all as read";
    }
  });

  return button;
}

const markAllReadButton = setupMarkAllReadButton();

async function markNotificationsAsRead() {
  const response = await fetch(`${API_URL}/messages/notifications/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to mark notifications as read.");
  }

  return data;
}

loadNotifications();
