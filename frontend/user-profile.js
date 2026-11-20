const API_BASE = window.NESTNOTES_API_BASE;

const params = new URLSearchParams(window.location.search);
const profileUserId = params.get("id");

const token = localStorage.getItem("token");
const currentUserId = localStorage.getItem("userId");

const statusElement = document.getElementById("profileStatus");
const profileContent = document.getElementById("profileContent");

const messageBtn = document.getElementById("messageBtn");
const messageBtnBottom = document.getElementById("messageBtnBottom");
const backBtn = document.getElementById("backBtn");

let selectedUserId = null;


/* DISPLAY STATUS */

function showStatus(message, type = "") {
    statusElement.textContent = message;
    statusElement.className = "profile-status";

    if (type) {
        statusElement.classList.add(type);
    }

    statusElement.hidden = false;
}


/* SAFELY DISPLAY PROFILE VALUES */

function displayValue(elementId, value) {
    const element = document.getElementById(elementId);

    if (!element) return;

    const hasValue =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "";

    element.textContent = hasValue
        ? String(value)
        : "Not specified";
}


/* INITIALS */

function displayAvatar(name) {
    const avatar = document.getElementById("profileAvatar");

    const initials = String(name || "N")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");

    avatar.textContent = initials || "N";
}


/* LOAD PROFILE */

async function loadProfile() {
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    if (!profileUserId || !/^\d+$/.test(profileUserId)) {
        showStatus(
            "This profile link is invalid. Open a flatmate's profile from a valid user link.",
            "error"
        );

        profileContent.hidden = true;
        messageBtn.disabled = true;
        messageBtnBottom.disabled = true;

        return;
    }

    selectedUserId = profileUserId;

    showStatus("Loading profile...");

    messageBtn.disabled = true;
    messageBtnBottom.disabled = true;

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
            showStatus(
                "Your session may have expired. Please log in again.",
                "error"
            );

            return;
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Unable to load profile (${response.status}).`
            );
        }

        /*
         * Populate the profile.
         * These property names match your existing API response.
         */

        const name = data.name || "NestNotes Member";

        document.title = `${name} | NestNotes`;

        document.getElementById("profileName").textContent = name;

        displayAvatar(name);

        displayValue("profileAge", data.age);
        displayValue("profileGender", data.gender);
        displayValue("profileOccupation", data.occupation);
        displayValue("profileBudget", data.budget);
        displayValue("profileFood", data.food_preference);
        displayValue("profileSmoking", data.smoking);
        displayValue("profileDrinking", data.drinking);

        const bioElement = document.getElementById("profileBio");

        bioElement.textContent =
            data.bio && String(data.bio).trim()
                ? String(data.bio)
                : "This member hasn't added a bio yet.";

        /*
         * Show profile content only after successful loading.
         */

        profileContent.hidden = false;
        statusElement.hidden = true;

        /*
         * Prevent users from messaging themselves.
         */

        const isOwnProfile =
            currentUserId !== null &&
            String(currentUserId) === String(profileUserId);

        messageBtn.disabled = isOwnProfile;
        messageBtnBottom.disabled = isOwnProfile;

        if (isOwnProfile) {
            messageBtn.textContent = "This Is Your Profile";
            messageBtnBottom.textContent = "This Is Your Profile";
        }

    } catch (error) {
        console.error("Profile loading error:", error);

        profileContent.hidden = true;

        showStatus(
            error.message || "Unable to load this profile. Please try again.",
            "error"
        );

        messageBtn.disabled = true;
        messageBtnBottom.disabled = true;
    }
}


/* MESSAGE USER */

function messageUser() {
    if (!selectedUserId || !token) {
        return;
    }

    if (
        currentUserId !== null &&
        String(currentUserId) === String(selectedUserId)
    ) {
        return;
    }

    /*
     * Preserve the userId query parameter expected by
     * the existing chat integration.
     *
     * Messaging behavior still depends on chat.js and
     * the backend supporting this URL format.
     */

    window.location.href =
        `chat.html?userId=${encodeURIComponent(selectedUserId)}`;
}


/* EVENT LISTENERS */

messageBtn.addEventListener("click", messageUser);

messageBtnBottom.addEventListener("click", messageUser);

backBtn.addEventListener("click", () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "index.html";
    }
});


/* START */

loadProfile();