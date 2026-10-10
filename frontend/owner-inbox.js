const API_URL = "https://nestnotes-flat-sharing.onrender.com/api/messages";

const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

// Redirect users who aren't logged in
if (!token || !userId) {
    window.location.href = "login.html";
}

// Common headers for authenticated API requests
function getAuthHeaders(includeJson = false) {
    const headers = {
        Authorization: `Bearer ${token}`
    };

    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

// Common response handler
async function handleResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        throw new Error(
            data.message || "Your session has expired or you don't have permission."
        );
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
}

// Load replies for a message
async function getReplies(messageId) {
    const response = await fetch(`${API_URL}/replies/${messageId}`, {
        headers: getAuthHeaders()
    });

    return await handleResponse(response);
}

// Load the owner's inbox
async function loadInbox() {
    const container = document.getElementById("messagesContainer");

    if (!container) {
        console.error("messagesContainer element was not found.");
        return;
    }

    container.innerHTML = "<p>Loading messages...</p>";

    try {
        const response = await fetch(`${API_URL}/owner/${userId}`, {
            headers: getAuthHeaders()
        });

        const messages = await handleResponse(response);

        if (!Array.isArray(messages)) {
            throw new Error("The server returned an unexpected inbox response.");
        }

        if (messages.length === 0) {
            container.innerHTML = "<p>No messages yet.</p>";
            return;
        }

        container.innerHTML = "";

        for (const msg of messages) {
            let replies = [];

            try {
                replies = await getReplies(msg.id);

                if (!Array.isArray(replies)) {
                    replies = [];
                }
            } catch (error) {
                console.error(`Could not load replies for message ${msg.id}:`, error);
            }

            let repliesHtml = "";

            replies.forEach((reply) => {
                repliesHtml += `
                    <div class="reply-box">
                        <strong>Owner:</strong>
                        <p>${reply.reply || ""}</p>
                        <small>${reply.createdAt || ""}</small>
                    </div>
                `;
            });

            const card = document.createElement("div");
            card.className = "message-card";

            card.innerHTML = `
                <h3>🏠 ${msg.title || "Listing"}</h3>

                <p><strong>${msg.name || "Unknown user"}</strong></p>
                <p>${msg.email || ""}</p>

                <hr>

                <p>${msg.message || ""}</p>

                <p>Age: ${msg.age || "Not specified"}</p>
                <p>Gender: ${msg.gender || "Not specified"}</p>
                <p>Occupation: ${msg.occupation || "Not specified"}</p>
                <p>Budget: ${msg.budget ? `₹${msg.budget}` : "Not specified"}</p>

                <button class="view-profile-btn" type="button">
                    View Profile
                </button>

                <button class="open-chat-btn" type="button">
                    Open Chat
                </button>

                <br>

                <small>
                    ${msg.createdAt
                        ? new Date(msg.createdAt).toLocaleString()
                        : ""}
                </small>

                <div class="replies-container">${repliesHtml}</div>

                <br>

                <button class="reply-toggle-btn" type="button">
                    Reply
                </button>

                <div class="reply-form" style="display:none; margin-top:10px;">
                    <textarea placeholder="Type reply..."></textarea>
                    <br>
                    <button class="send-reply-btn" type="button">
                        Send Reply
                    </button>
                </div>
            `;

            card.querySelector(".view-profile-btn").addEventListener("click", () => {
                viewProfile(msg.senderId);
            });

            card.querySelector(".open-chat-btn").addEventListener("click", () => {
                openChat(msg.senderId, msg.listingId, msg.name || "User");
            });

            card.querySelector(".reply-toggle-btn").addEventListener("click", () => {
                const form = card.querySelector(".reply-form");
                form.style.display =
                    form.style.display === "none" ? "block" : "none";
            });

            card.querySelector(".send-reply-btn").addEventListener("click", async () => {
                await sendReply(msg.id, card);
            });

            container.appendChild(card);
        }
    } catch (error) {
        console.error("Inbox loading error:", error);

        container.innerHTML = `
            <p style="color:#c0392b;">
                Unable to load your inbox: ${error.message}
            </p>
            <button type="button" onclick="loadInbox()">Try Again</button>
        `;
    }
}

// Show and send a reply
async function sendReply(messageId, card) {
    const textarea = card.querySelector(".reply-form textarea");
    const reply = textarea.value.trim();

    if (!reply) {
        alert("Please enter a reply.");
        return;
    }

    const button = card.querySelector(".send-reply-btn");
    button.disabled = true;
    button.textContent = "Sending...";

    try {
        const response = await fetch(`${API_URL}/reply`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({
                messageId,
                senderId: Number(userId),
                reply
            })
        });

        const data = await handleResponse(response);

        alert(data.message || "Reply sent successfully!");

        textarea.value = "";
        await loadInbox();
    } catch (error) {
        console.error("Reply sending error:", error);
        alert(`Could not send reply: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Send Reply";
    }
}

// Navigate to a user's profile
function viewProfile(profileUserId) {
    if (!profileUserId) {
        alert("User profile information is unavailable.");
        return;
    }

    window.location.href =
        `user-profile.html?id=${encodeURIComponent(profileUserId)}`;
}

// Open the chat page
function openChat(chatUserId, listingId, name) {
    if (!chatUserId || !listingId) {
        alert("Chat information is incomplete.");
        return;
    }

    window.location.href =
        `chat.html?userId=${encodeURIComponent(chatUserId)}` +
        `&listingId=${encodeURIComponent(listingId)}` +
        `&name=${encodeURIComponent(name)}`;
}

// Start loading the inbox
if (token && userId) {
    loadInbox();
}