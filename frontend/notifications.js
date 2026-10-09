const API_URL = "https://nestnotes-flat-sharing.onrender.com/api";

const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

async function loadNotifications() {
    const container = document.getElementById("notificationsContainer");

    if (!container) {
        console.error("Notifications container not found.");
        return;
    }

    if (!token || !userId) {
        container.textContent = "Please log in to view your notifications.";
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/messages/notifications/${encodeURIComponent(userId)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            container.textContent = "Your session has expired. Please log in again.";
            console.error("Notifications request returned 401 Unauthorized.");
            return;
        }

        if (response.status === 403) {
            container.textContent = "You don't have permission to view these notifications.";
            console.error("Notifications request returned 403 Forbidden.");
            return;
        }

        if (!response.ok) {
            throw new Error(`Failed to load notifications: ${response.status}`);
        }

        const notifications = await response.json();

        container.replaceChildren();

        if (!Array.isArray(notifications) || notifications.length === 0) {
            container.textContent = "No notifications";
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement("div");
            item.className = "notification-item";

            const message = document.createElement("p");
            message.textContent = notification.message;

            const timestamp = document.createElement("small");

            if (notification.created_at) {
                const date = new Date(notification.created_at);

                timestamp.textContent = Number.isNaN(date.getTime())
                    ? notification.created_at
                    : date.toLocaleString();
            }

            item.append(message, timestamp);
            container.appendChild(item);
        });

    } catch (error) {
        console.error("Notification loading error:", error);
        container.textContent = "Unable to load notifications. Please try again.";
    }
}

loadNotifications();