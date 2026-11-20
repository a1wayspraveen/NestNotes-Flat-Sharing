document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.NESTNOTES_API_BASE;
    const token = localStorage.getItem("token");

    const form = document.getElementById("profileForm");
    const statusMessage = document.getElementById("statusMessage");
    const saveButton = document.getElementById("saveButton");
    const loadingMessage = document.getElementById("loadingMessage");

    const fields = [
        "name",
        "email",
        "age",
        "gender",
        "occupation",
        "budget",
        "food_preference",
        "smoking",
        "drinking",
        "bio"
    ];

    function showMessage(message, success = false) {
        statusMessage.textContent = message;
        statusMessage.style.color = success ? "green" : "red";
    }

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    async function loadProfile() {
        try {
            const response = await fetch(`${API_BASE}/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load profile.");
            }

            fields.forEach(field => {
                const element = document.getElementById(field);

                if (element) {
                    element.value = data[field] ?? "";
                }
            });

            document.getElementById("displayName").textContent =
                data.name || "Your Name";

            document.getElementById("displayEmail").textContent =
                data.email || "";

            document.getElementById("avatar").textContent =
                data.name ? data.name.charAt(0).toUpperCase() : "N";

        } catch (error) {
            showMessage(error.message);
        } finally {
            loadingMessage.style.display = "none";
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        const profileData = {
            age: document.getElementById("age").value
                ? Number(document.getElementById("age").value)
                : null,

            gender: document.getElementById("gender").value,
            occupation: document.getElementById("occupation").value.trim(),
            budget: document.getElementById("budget").value,
            food_preference: document.getElementById("food_preference").value,
            smoking: document.getElementById("smoking").value,
            drinking: document.getElementById("drinking").value,
            bio: document.getElementById("bio").value.trim()
        };

        try {
            const response = await fetch(`${API_BASE}/profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to save profile.");
            }

            showMessage("Profile saved successfully!", true);

        } catch (error) {
            showMessage(error.message);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Profile";
        }
    });

    loadProfile();
});