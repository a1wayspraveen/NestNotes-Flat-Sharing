const API_BASE = "https://nestnotes-flat-sharing.onrender.com/api";

const token = localStorage.getItem("token");

const profileForm = document.getElementById("profileForm");
const statusMessage = document.getElementById("statusMessage");
const saveButton = document.getElementById("saveButton");
const loadingMessage = document.getElementById("loadingMessage");

const profileFields = [
    "age",
    "gender",
    "occupation",
    "budget",
    "food_preference",
    "smoking",
    "drinking",
    "bio"
];

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user");

    window.location.href = "login.html";
}

function updateProfileSummary(profile) {
    const name = profile.name || "NestNotes Member";
    const email = profile.email || "";

    document.getElementById("displayName").textContent = name;
    document.getElementById("displayEmail").textContent = email;

    const avatar = document.getElementById("avatar");

    // Use the first letter of the user's name.
    avatar.textContent = name.trim().charAt(0).toUpperCase() || "N";
}

async function loadProfile() {
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            showStatus("Your session has expired. Please log in again.", "error");
            return;
        }

        if (!response.ok) {
            throw new Error(`Unable to load profile (${response.status}).`);
        }

        const profile = await response.json();

        updateProfileSummary(profile);

        document.getElementById("name").value = profile.name || "";
        document.getElementById("email").value = profile.email || "";

        profileFields.forEach(field => {
            const input = document.getElementById(field);

            if (input) {
                input.value = profile[field] ?? "";
            }
        });

    } catch (error) {
        console.error("Profile loading error:", error);

        showStatus(
            "Could not load your profile. Please check your connection and try again.",
            "error"
        );
    } finally {
        loadingMessage.style.display = "none";
    }
}

profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const profileData = {};

    profileFields.forEach(field => {
        const input = document.getElementById(field);
        profileData[field] = input.value.trim();
    });

    const ageValue = document.getElementById("age").value;

    if (ageValue && (Number(ageValue) < 18 || Number(ageValue) > 100)) {
        showStatus("Please enter an age between 18 and 100.", "error");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

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

        if (response.status === 401 || response.status === 403) {
            showStatus("Your session has expired. Please log in again.", "error");
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || "Unable to save your profile.");
        }

        showStatus("Your profile has been saved successfully!", "success");

        const currentName = document.getElementById("name").value;
        const currentEmail = document.getElementById("email").value;

        updateProfileSummary({
            name: currentName,
            email: currentEmail
        });

    } catch (error) {
        console.error("Profile saving error:", error);

        showStatus(
            error.message || "Unable to save your profile. Please try again.",
            "error"
        );
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Profile";
    }
});

loadProfile();