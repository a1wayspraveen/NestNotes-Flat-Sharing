const API_URL = "https://nestnotes-flat-sharing.onrender.com/api/messages";

const userId = localStorage.getItem("userId");

async function loadNotifications() {

    try {

        const response = await fetch(
            `${API_URL}/notifications/${userId}`
        );

        const notifications =
            await response.json();

        const container =
            document.getElementById(
                "notificationsContainer"
            );

        if (!notifications.length) {
            container.innerHTML =
                "<p>No notifications</p>";
            return;
        }

        container.innerHTML = "";

        notifications.forEach(notification => {

            container.innerHTML += `
                <div class="message-card">
                    <p>${notification.message}</p>

                    <small>
                        ${new Date(
                            notification.created_at
                        ).toLocaleString()}
                    </small>
                </div>
            `;
        });

    } catch(error) {
        console.error(error);
    }
}

loadNotifications();