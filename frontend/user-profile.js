const API_BASE = "https://nestnotes-flat-sharing.onrender.com/api";

const params = new URLSearchParams(window.location.search);
const profileUserId = params.get("id");

const token = localStorage.getItem("token");
const currentUserId = localStorage.getItem("userId");

const container = document.getElementById("profileContainer");
const messageBtn = document.getElementById("messageBtn");

async function loadProfile() {
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    if (!profileUserId || !/^\d+$/.test(profileUserId)) {
        container.textContent = "Invalid profile link.";
        messageBtn.disabled = true;
        return;
    }

    container.textContent = "Loading profile...";

    try {
        const response = await fetch(
            `${API_BASE}/profile/${encodeURIComponent(profileUserId)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
            container.textContent =
                "Your session has expired. Please log in again.";
            return;
        }

        if (!response.ok) {
            throw new Error(
                data.message || `Unable to load profile (${response.status}).`
            );
        }

        document.title = `${data.name || "Flatmate"} | NestNotes`;

        container.replaceChildren();

        const heading = document.createElement("h2");
        heading.textContent = data.name || "NestNotes Member";
        container.appendChild(heading);

        const fields = [
            ["Age", data.age],
            ["Gender", data.gender],
            ["Occupation", data.occupation],
            ["Monthly Budget", data.budget],
            ["Food Preference", data.food_preference],
            ["Smoking", data.smoking],
            ["Drinking", data.drinking],
            ["About Me", data.bio]
        ];

        fields.forEach(([label, value]) => {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = `${label}: `;
            paragraph.appendChild(strong);
            paragraph.appendChild(
                document.createTextNode(
                    value !== null && value !== undefined && value !== ""
                        ? value
                        : "Not specified"
                )
            );

            container.appendChild(paragraph);
        });

        messageBtn.disabled =
            String(currentUserId) === String(profileUserId);

    } catch (error) {
        console.error("Profile loading error:", error);
        container.textContent =
            error.message || "Unable to load this profile.";
        messageBtn.disabled = true;
    }
}

messageBtn.addEventListener("click", () => {
    if (!profileUserId) return;

    // The chat page should receive the selected user's ID.
    window.location.href =
        `chat.html?userId=${encodeURIComponent(profileUserId)}`;
});

loadProfile();