const API_BASE = window.NESTNOTES_API_BASE;
const LISTINGS_API = `${API_BASE}/listings`;

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const container = document.getElementById("listingDetails");
const statusElement = document.getElementById("listingStatus");

let currentListing = null;


/* STATUS MESSAGES */

function showStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = "listing-status";

    if (isError) {
        statusElement.classList.add("error");
    }

    statusElement.hidden = false;
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


/* PROPERTY INFORMATION ITEM */

function createInfoItem(label, value) {
    const item = createElement("div", "details-info-item");

    item.appendChild(
        createElement("span", "details-info-label", label)
    );

    item.appendChild(
        createElement(
            "span",
            "details-info-value",
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
                ? value
                : "Not specified"
        )
    );

    return item;
}


/* ACTION BUTTON */

function createActionButton(text, className, onClick) {
    const button = createElement(
        "button",
        `details-action-button ${className || ""}`.trim(),
        text
    );

    button.type = "button";
    button.addEventListener("click", onClick);

    return button;
}


/* LOAD INTEREST COUNT */

async function getInterestCount(listingId) {
    try {
        const response = await fetch(
            `${API_BASE}/interests/count/${encodeURIComponent(listingId)}`
        );

        if (!response.ok) {
            throw new Error("Unable to load interest count.");
        }

        const data = await response.json();

        return Number.isFinite(Number(data.count))
            ? Number(data.count)
            : 0;

    } catch (error) {
        console.error("Interest count error:", error);
        return null;
    }
}


/* LOAD LISTING */

async function loadListing() {
    if (!id || !/^\d+$/.test(id)) {
        showStatus(
            "This property link is invalid. Please open a property from the listings page.",
            true
        );

        return;
    }

    showStatus("Loading property details...");

    try {
        const response = await fetch(
            `${window.NESTNOTES_API_BASE}/listings/${encodeURIComponent(id)}`
        );

        const listing = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                listing.message ||
                `Unable to load property (${response.status}).`
            );
        }

        if (
            !listing ||
            typeof listing !== "object" ||
            listing.id === undefined ||
            listing.id === null
        ) {
            throw new Error(
                "The server returned incomplete property information."
            );
        }

        currentListing = listing;

        document.title =
            `${listing.title || "Property Details"} | NestNotes`;

        renderListing(listing);

        statusElement.hidden = true;
        container.hidden = false;

        /*
         * Fetch the interest count independently.
         * A count failure should not prevent the listing from appearing.
         */
        updateInterestCount(listing.id);

    } catch (error) {
        console.error("Listing loading error:", error);

        container.hidden = true;

        showStatus(
            error.message ||
            "Unable to load this property. Please try again.",
            true
        );
    }
}


/* RENDER PROPERTY */

function renderListing(listing) {
    container.replaceChildren();

    const card = createElement("article", "details-card");

    /*
     * IMAGE
     */

    const gallery = createElement("div", "details-gallery");

    const imageUrl =
        typeof listing.image === "string"
            ? listing.image.trim()
            : "";

    if (imageUrl) {
        const image = createElement("img", "details-image");

        image.alt = listing.title
            ? `Property: ${listing.title}`
            : "Property image";

        image.loading = "eager";

        image.addEventListener("error", () => {
            gallery.replaceChildren();

            const placeholder = createElement(
                "div",
                "image-placeholder"
            );

            placeholder.appendChild(
                createElement(
                    "span",
                    "image-placeholder-icon",
                    "🏠"
                )
            );

            placeholder.appendChild(
                createElement(
                    "p",
                    "",
                    "Property image unavailable"
                )
            );

            gallery.appendChild(placeholder);
        });

        image.src = imageUrl;
        gallery.appendChild(image);

    } else {
        const placeholder = createElement(
            "div",
            "image-placeholder"
        );

        placeholder.appendChild(
            createElement("span", "image-placeholder-icon", "🏠")
        );

        placeholder.appendChild(
            createElement(
                "p",
                "",
                "No property image has been uploaded."
            )
        );

        gallery.appendChild(placeholder);
    }

    const isVerified =
        listing.verified === 1 ||
        listing.verified === true;

    const badge = createElement(
        "span",
        isVerified ? "verified-badge" : "pending-badge",
        isVerified
            ? "✓ Verified Property"
            : "⏳ Pending Verification"
    );

    gallery.appendChild(badge);
    card.appendChild(gallery);


    /*
     * MAIN CONTENT
     */

    const content = createElement("div", "details-content");

    const topLine = createElement("div", "details-topline");
    const heading = createElement("div", "details-heading");

    heading.appendChild(
        createElement(
            "span",
            "details-category",
            listing.category || "Property"
        )
    );

    heading.appendChild(
        createElement(
            "h1",
            "details-title",
            listing.title || "Untitled Property"
        )
    );

    const location = createElement("p", "details-location");

    location.appendChild(document.createTextNode("📍 "));

    location.appendChild(
        document.createTextNode(
            listing.location || "Location unavailable"
        )
    );

    heading.appendChild(location);
    topLine.appendChild(heading);


    /*
     * RENT
     */

    const price = createElement("div", "details-price");

    const rent = Number(listing.rent);

    price.appendChild(
        createElement(
            "strong",
            "",
            listing.rent !== null &&
            listing.rent !== undefined &&
            String(listing.rent).trim() !== "" &&
            Number.isFinite(rent)
                ? `₹${rent.toLocaleString("en-IN")}`
                : "Not specified"
        )
    );

    price.appendChild(
        createElement("span", "", "Monthly rent")
    );

    topLine.appendChild(price);
    content.appendChild(topLine);


    /*
     * DIVIDER
     */

    content.appendChild(
        createElement("div", "details-divider")
    );


    /*
     * PROPERTY OVERVIEW
     */

    const overview = createElement("section", "details-section");

    overview.appendChild(
        createElement("h2", "", "Property Overview")
    );

    const infoGrid = createElement("div", "details-info-grid");

    infoGrid.appendChild(
        createInfoItem("Property Category", listing.category)
    );

    infoGrid.appendChild(
        createInfoItem(
            "Verification Status",
            isVerified ? "Verified" : "Pending Verification"
        )
    );

    infoGrid.appendChild(
        createInfoItem("Location", listing.location)
    );

    infoGrid.appendChild(
        createInfoItem(
            "Monthly Rent",
            Number.isFinite(rent) && String(listing.rent).trim() !== ""
                ? `₹${rent.toLocaleString("en-IN")}`
                : "Not specified"
        )
    );

    overview.appendChild(infoGrid);
    content.appendChild(overview);


    /*
     * DESCRIPTION
     */

    const descriptionSection = createElement(
        "section",
        "details-section"
    );

    descriptionSection.appendChild(
        createElement("h2", "", "About This Property")
    );

    descriptionSection.appendChild(
        createElement(
            "div",
            "details-description",
            listing.description || "No description has been provided."
        )
    );

    content.appendChild(descriptionSection);


    /*
     * CONTACT AND INTEREST ACTIONS
     */

    const actions = createElement("section", "details-actions");

    actions.appendChild(
        createElement("h2", "", "Interested in this property?")
    );

    actions.appendChild(
        createElement(
            "p",
            "",
            "Connect with the owner to learn more about the property."
        )
    );

    const countBox = createElement("div", "interest-count");

    countBox.appendChild(
        createElement("span", "", "People interested in this property")
    );

    countBox.appendChild(
        createElement("strong", "", "Loading...")
    );

    countBox.id = "interestCountBox";

    actions.appendChild(countBox);

    const buttonRow = createElement("div", "details-button-row");

    buttonRow.appendChild(
        createActionButton(
            "♥ Express Interest",
            "",
            () => expressInterest(listing.id)
        )
    );

    buttonRow.appendChild(
        createActionButton(
            "💬 Message Owner",
            "secondary",
            () => sendMessage(listing.id)
        )
    );

    const currentUserId = localStorage.getItem("userId");

    if (
        currentUserId !== null &&
        String(currentUserId) === String(listing.user_id)
    ) {
        buttonRow.appendChild(
            createActionButton(
                "👥 View Interested Users",
                "secondary",
                () => viewInterestedUsers(listing.id)
            )
        );
    }

    actions.appendChild(buttonRow);

    const feedback = createElement("div", "listing-feedback");
    feedback.id = "listingFeedback";

    actions.appendChild(feedback);

    content.appendChild(actions);


    /*
     * BACK LINK
     */

    const backLink = createElement(
        "a",
        "details-bottom-link",
        "← Back to Listings"
    );

    backLink.href = "index.html#listingContainer";

    content.appendChild(backLink);

    card.appendChild(content);
    container.appendChild(card);
}


/* UPDATE INTEREST COUNT */

async function updateInterestCount(listingId) {
    const count = await getInterestCount(listingId);

    const countBox = document.getElementById("interestCountBox");

    if (!countBox) return;

    const countValue = countBox.querySelector("strong");

    if (count === null) {
        countValue.textContent = "Unavailable";
    } else {
        countValue.textContent = String(count);
    }
}


/* SHOW FEEDBACK */

function showFeedback(message, type) {
    const feedback = document.getElementById("listingFeedback");

    if (!feedback) return;

    feedback.textContent = message;
    feedback.className = `listing-feedback ${type}`;
}


/* EXPRESS INTEREST */

async function expressInterest(listingId) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const buttons = container.querySelectorAll(
        ".details-action-button"
    );

    buttons.forEach(button => {
        button.disabled = true;
    });

    try {
        const response = await fetch(`${API_BASE}/interests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                listingId
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
            throw new Error("Please log in again to express interest.");
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to express interest."
            );
        }

        showFeedback(
            data.message || "Your interest has been recorded.",
            "success"
        );

        await updateInterestCount(listingId);

    } catch (error) {
        console.error("Express interest error:", error);

        showFeedback(
            error.message || "Unable to express interest.",
            "error"
        );

    } finally {
        buttons.forEach(button => {
            button.disabled = false;
        });
    }
}


/* MESSAGE OWNER */

function sendMessage(listingId) {
    if (!localStorage.getItem("token")) {
        window.location.href = "login.html";
        return;
    }

    if (!currentListing) return;

    const currentUserId = localStorage.getItem("userId");

    if (
        currentUserId !== null &&
        String(currentUserId) === String(currentListing.user_id)
    ) {
        showFeedback(
            "You cannot message yourself about your own listing.",
            "error"
        );

        return;
    }

    window.location.href =
        `chat.html?listingId=${encodeURIComponent(listingId)}`;
}


/* VIEW INTERESTED USERS */

function viewInterestedUsers(listingId) {
    if (!localStorage.getItem("token")) {
        window.location.href = "login.html";
        return;
    }

    window.location.href =
        `view-interests.html?listingId=${encodeURIComponent(listingId)}`;
}


/* START */

loadListing();