// ==========================================
// NESTNOTES — PROPERTY DETAILS
// ==========================================

const API_BASE = window.NESTNOTES_API_BASE;
const LISTINGS_API = `${API_BASE}/listings`;

const params = new URLSearchParams(window.location.search);
const listingId = params.get("id");

const token = localStorage.getItem("token");
const currentUserId = Number(localStorage.getItem("userId"));

const titleElement = document.getElementById("title");
const rentElement = document.getElementById("rent");
const locationElement = document.getElementById("location");
const locationSummary = document.getElementById("locationSummary");
const categoryElement = document.getElementById("category");
const descriptionElement = document.getElementById("description");
const propertyImage = document.getElementById("propertyImage");

// Create a verification badge without inserting HTML from the API.
function createVerifiedBadge(verified) {
    const badge = document.createElement("span");

    badge.className = verified === 1
        ? "details-verified-badge"
        : "details-pending-badge";

    badge.textContent = verified === 1
        ? "✓ Verified"
        : "Pending verification";

    return badge;
}

// Display errors in a visible page message.
function showPageMessage(message) {
    let messageElement = document.getElementById("detailsMessage");

    if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.id = "detailsMessage";
        messageElement.className = "details-message";

        const page = document.querySelector(".property-page");

        if (page) {
            page.prepend(messageElement);
        }
    }

    messageElement.textContent = message;
    messageElement.style.display = "block";
}

// Add a badge to the property heading.
function displayVerificationStatus(verified) {
    let badge = document.getElementById("verificationBadge");

    if (!badge) {
        badge = document.createElement("span");
        badge.id = "verificationBadge";

        const heading = document.querySelector(".property-heading > div");

        if (heading) {
            heading.appendChild(badge);
        }
    }

    badge.replaceChildren(createVerifiedBadge(verified));
}

// Load property information.
async function loadPropertyDetails() {
    if (!listingId) {
        showPageMessage("No property was selected. Please return to the listings.");
        titleElement.textContent = "Property not found";
        return;
    }

    try {
        const response = await fetch(
            `${LISTINGS_API}/${encodeURIComponent(listingId)}`
        );

        const listing = await response.json();

        if (!response.ok || !listing || !listing.id) {
            throw new Error(
                listing.message || "Unable to load this property."
            );
        }

        titleElement.textContent =
            listing.title || "Untitled property";

        rentElement.textContent =
            listing.rent != null
                ? Number(listing.rent).toLocaleString("en-IN")
                : "Not specified";

        locationElement.textContent =
            listing.location || "Location unavailable";

        if (locationSummary) {
            locationSummary.textContent =
                listing.location || "Location unavailable";
        }

        categoryElement.textContent =
            listing.category || "Not specified";

        descriptionElement.textContent =
            listing.description || "No description provided.";

        propertyImage.src =
            listing.image || "https://placehold.co/1200x650?text=Property";

        propertyImage.alt =
            listing.title
                ? `Property image for ${listing.title}`
                : "Property image";

        propertyImage.onerror = () => {
            propertyImage.onerror = null;
            propertyImage.src =
                "https://placehold.co/1200x650?text=Image+Unavailable";
        };

        displayVerificationStatus(Number(listing.verified));

        // Set up the property actions after the listing has loaded.
        setupPropertyActions(listing);

        // Load the current interest count.
        await refreshInterestCount(listing.id);

    } catch (error) {
        console.error("Property details error:", error);

        titleElement.textContent = "Unable to load property";

        showPageMessage(
            error.message || "Unable to load property details. Please try again."
        );
    }
}

// ==========================================
// PROPERTY ACTIONS
// ==========================================

function setupPropertyActions(listing) {
    const contactPanel = document.querySelector(".contact-panel");

    if (!contactPanel) return;

    let actionsContainer = document.getElementById("propertyActions");

    if (!actionsContainer) {
        actionsContainer = document.createElement("div");
        actionsContainer.id = "propertyActions";
        actionsContainer.className = "property-actions";

        const divider = contactPanel.querySelector(".contact-divider");

        if (divider) {
            divider.insertAdjacentElement("afterend", actionsContainer);
        } else {
            contactPanel.appendChild(actionsContainer);
        }
    }

    actionsContainer.replaceChildren();

    // Interest count.
    const interestCount = document.createElement("p");
    interestCount.className = "interest-count";
    interestCount.id = "interestCount";
    interestCount.textContent = "Interested users: Loading...";

    actionsContainer.appendChild(interestCount);

    // Express Interest.
    const interestButton = document.createElement("button");
    interestButton.type = "button";
    interestButton.className = "property-action-btn interest-action";
    interestButton.textContent = "♥ Express Interest";

    interestButton.addEventListener("click", () => {
        expressInterest(listing.id, interestButton);
    });

    actionsContainer.appendChild(interestButton);

    // Message Owner.
    const messageButton = document.createElement("button");
    messageButton.type = "button";
    messageButton.className = "property-action-btn message-action";
    messageButton.textContent = "💬 Message Owner";

    messageButton.addEventListener("click", () => {
        openPropertyChat(listing);
    });

    actionsContainer.appendChild(messageButton);

    // Show this action only to the owner.
    const ownerId = Number(listing.user_id ?? listing.userId);

    if (currentUserId && ownerId === currentUserId) {
        const interestedButton = document.createElement("button");

        interestedButton.type = "button";
        interestedButton.className = "property-action-btn interested-users-action";
        interestedButton.textContent = "👥 View Interested Users";

        interestedButton.addEventListener("click", () => {
            window.location.href =
                `view-interests.html?listingId=${encodeURIComponent(listing.id)}`;
        });

        actionsContainer.appendChild(interestedButton);
    }
}

// Get the interest count.
async function refreshInterestCount(id) {
    const countElement = document.getElementById("interestCount");

    try {
        const response = await fetch(
            `${API_BASE}/interests/count/${encodeURIComponent(id)}`
        );

        if (!response.ok) {
            throw new Error("Could not load interest count.");
        }

        const data = await response.json();

        if (countElement) {
            countElement.textContent =
                `Interested users: ${Number(data.count) || 0}`;
        }

    } catch (error) {
        console.error("Interest count error:", error);

        if (countElement) {
            countElement.textContent = "Interested users: unavailable";
        }
    }
}

// Express interest in a property.
async function expressInterest(id, button) {
    if (!token) {
        alert("Please log in to express interest.");
        window.location.href = "login.html";
        return;
    }

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const response = await fetch(`${API_BASE}/interests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                listingId: id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to express interest."
            );
        }

        alert(data.message || "Your interest has been submitted!");

        await refreshInterestCount(id);

    } catch (error) {
        console.error("Express interest error:", error);
        alert(error.message || "Unable to express interest.");
    } finally {
        button.disabled = false;
        button.textContent = "♥ Express Interest";
    }
}

// Open the existing chat page.
function openPropertyChat(listing) {
    if (!token) {
        alert("Please log in to message the owner.");
        window.location.href = "login.html";
        return;
    }

    const ownerId = Number(listing.user_id ?? listing.userId);

    if (ownerId && ownerId === currentUserId) {
        alert("This is your listing. You cannot message yourself.");
        return;
    }

    const query = new URLSearchParams({
        listingId: String(listing.id)
    });

    if (ownerId) {
        query.set("userId", String(ownerId));
    }

    window.location.href = `chat.html?${query.toString()}`;
}

// Start the page.
loadPropertyDetails();