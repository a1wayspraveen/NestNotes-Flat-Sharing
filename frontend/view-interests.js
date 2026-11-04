const API_BASE = window.NESTNOTES_API_BASE;

const params = new URLSearchParams(window.location.search);

/*
 * Support both URL formats used in the project:
 * view-interests.html?listingId=5
 * view-interests.html?id=5
 */
const listingId = params.get("listingId") || params.get("id");

const token = localStorage.getItem("token");

const container = document.getElementById("usersContainer");
const statusElement = document.getElementById("usersStatus");
const userCountElement = document.getElementById("userCount");
const backToListing = document.getElementById("backToListing");


/* STATUS */

function showStatus(message, type = "") {
    statusElement.textContent = message;
    statusElement.className = "users-status";

    if (type) {
        statusElement.classList.add(type);
    }

    statusElement.hidden = false;
}


/* INITIALS */

function getInitials(name) {
    return String(name || "U")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "U";
}


/* SAFE ELEMENT CREATION */

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}


/* USER CARD */

function createUserCard(user) {
    const userId = user.id ?? user.user_id;
    const name = user.name || "NestNotes Member";
    const email = user.email || "Email unavailable";

    const card = createElement("article", "user-card");

    const top = createElement("div", "user-card-top");

    const avatar = createElement(
        "div",
        "user-avatar",
        getInitials(name)
    );

    avatar.setAttribute("aria-hidden", "true");

    const mainInfo = createElement("div", "user-main-info");

    mainInfo.appendChild(
        createElement("h3", "", name)
    );

    mainInfo.appendChild(
        createElement("span", "user-role", "Interested in your property")
    );

    top.appendChild(avatar);
    top.appendChild(mainInfo);

    card.appendChild(top);


    /* EMAIL */

    const emailBox = createElement("div", "user-email-box");

    emailBox.appendChild(
        createElement("span", "user-email-icon", "✉️")
    );

    emailBox.appendChild(
        createElement("span", "", email)
    );

    card.appendChild(emailBox);


    /* ACTIONS */

    const actions = createElement("div", "user-card-actions");

    if (userId !== undefined && userId !== null) {
        const profileButton = createElement(
            "a",
            "user-action-button secondary",
            "👤 View Profile"
        );

        profileButton.href =
            `user-profile.html?id=${encodeURIComponent(userId)}`;

        const contactButton = createElement(
            "a",
            "user-action-button",
            "💬 Contact User"
        );

        contactButton.href =
            `chat.html?userId=${encodeURIComponent(userId)}&listingId=${encodeURIComponent(listingId)}`;

        actions.appendChild(profileButton);
        actions.appendChild(contactButton);
    } else {
        actions.appendChild(
            createElement(
                "p",
                "",
                "Actions are unavailable because this user has no ID."
            )
        );
    }

    card.appendChild(actions);

    return card;
}


/* LOAD INTERESTED USERS */

async function loadUsers() {
    container.replaceChildren();
    userCountElement.textContent = "— users";

    if (!token) {
        showStatus(
            "Please log in to view users interested in your property.",
            "error"
        );

        return;
    }

    if (!listingId || !/^\d+$/.test(listingId)) {
        showStatus(
            "The property link is invalid. Open this page from a valid property listing.",
            "error"
        );

        return;
    }

    backToListing.href =
        `listing.html?id=${encodeURIComponent(listingId)}`;

    showStatus("Loading interested users...");

    try {
        const response = await fetch(
            `${API_BASE}/interests/listing/${encodeURIComponent(listingId)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const users = await response.json().catch(() => []);

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Your session may have expired, or you may not have permission to view these users."
            );
        }

        if (!response.ok) {
            throw new Error(
                users.message ||
                `Unable to load interested users (${response.status}).`
            );
        }

        if (!Array.isArray(users)) {
            throw new Error(
                "The server returned an unexpected response."
            );
        }

        container.replaceChildren();

        userCountElement.textContent =
            `${users.length} ${users.length === 1 ? "user" : "users"}`;

        if (users.length === 0) {
            showStatus(
                "No one has expressed interest in this property yet. Check back later!",
                "empty"
            );

            return;
        }

        const fragment = document.createDocumentFragment();

        users.forEach(user => {
            fragment.appendChild(createUserCard(user));
        });

        container.appendChild(fragment);

        statusElement.hidden = true;

    } catch (error) {
        console.error("Interested users loading error:", error);

        container.replaceChildren();

        showStatus(
            error.message || "Unable to load interested users.",
            "error"
        );
    }
}


/* START */

loadUsers();