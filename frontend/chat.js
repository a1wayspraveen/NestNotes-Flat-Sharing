const API_URL = "https://nestnotes-flat-sharing.onrender.com/api";

const params = new URLSearchParams(window.location.search);
const listingId = params.get("listingId");
const token = localStorage.getItem("token");

const currentUserId = Number(localStorage.getItem("userId"));

const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const chatTitle = document.getElementById("chatTitle");

let isLoading = false;
let lastSignature = "";

function authHeaders() {
    return {
        Authorization: `Bearer ${token}`
    };
}

function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}

// Create elements safely without inserting user messages as HTML.
function createMessageBubble(text, senderName, createdAt, isOwnMessage) {
    const bubble = document.createElement("div");

    bubble.className = isOwnMessage
        ? "message"
        : "owner-reply";

    const sender = document.createElement("strong");
    sender.textContent = senderName;

    const messageText = document.createElement("div");
    messageText.className = "message-text";
    messageText.textContent = text;

    const timestamp = document.createElement("small");
    timestamp.textContent = formatTime(createdAt);

    bubble.append(sender, messageText, timestamp);

    return bubble;
}


// ======================================
// LOAD CONVERSATION
// ======================================

async function loadMessages() {
    if (!token || !listingId || isLoading) return;

    isLoading = true;

    try {
        const response = await fetch(
            `${API_URL}/messages/${encodeURIComponent(listingId)}`,
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {
            throw new Error(
                response.status === 401
                    ? "Please log in again."
                    : response.status === 403
                    ? "You don't have permission to view this conversation."
                    : `Unable to load messages (${response.status}).`
            );
        }

        const messages = await response.json();
        const chatItems = [];

        for (const msg of messages) {
            chatItems.push({
                id: `message-${msg.id}`,
                senderId: Number(msg.senderId),
                text: msg.message,
                createdAt: msg.createdAt
            });

            const repliesResponse = await fetch(
                `${API_URL}/messages/replies/${encodeURIComponent(msg.id)}`,
                {
                    headers: authHeaders()
                }
            );

            if (!repliesResponse.ok) {
                throw new Error(
                    `Unable to load replies (${repliesResponse.status}).`
                );
            }

            const replies = await repliesResponse.json();

            for (const reply of replies) {
                chatItems.push({
                    id: `reply-${reply.id}`,
                    senderId: Number(reply.senderId),
                    text: reply.reply,
                    createdAt: reply.createdAt
                });
            }
        }

        chatItems.sort((a, b) => {
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const signature = JSON.stringify(chatItems);

        // Don't redraw the conversation if nothing has changed.
        if (signature === lastSignature) return;

        const nearBottom =
            messagesContainer.scrollHeight -
            messagesContainer.scrollTop -
            messagesContainer.clientHeight < 100;

        messagesContainer.replaceChildren();

        if (chatItems.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No messages yet. Start the conversation!";
            empty.className = "empty-chat";

            messagesContainer.appendChild(empty);
        }

        for (const item of chatItems) {
            const isOwnMessage =
                Number(item.senderId) === currentUserId;

            const senderName = isOwnMessage
                ? "You"
                : "Other participant";

            const bubble = createMessageBubble(
                item.text,
                senderName,
                item.createdAt,
                isOwnMessage
            );

            messagesContainer.appendChild(bubble);
        }

        lastSignature = signature;

        if (nearBottom) {
            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;
        }

    } catch (error) {
        console.error("Chat loading error:", error);

        if (!lastSignature) {
            messagesContainer.textContent = error.message;
        }
    } finally {
        isLoading = false;
    }
}


// ======================================
// SEND MESSAGE
// ======================================

async function sendMessage() {
    if (!token) {
        alert("Please log in again.");
        window.location.href = "login.html";
        return;
    }

    const message = messageInput.value.trim();

    if (!message) return;

    if (message.length > 2000) {
        alert("Messages cannot exceed 2000 characters.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({
                listingId,
                message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Message could not be sent.");
        }

        messageInput.value = "";
        lastSignature = "";

        await loadMessages();

    } catch (error) {
        console.error("Send message error:", error);
        alert(error.message);
    }
}


// ======================================
// CHAT TITLE
// ======================================

function loadChatTitle() {
    if (!chatTitle) return;

    const name = params.get("name");

    chatTitle.textContent = name && name !== "null"
        ? `Chat with ${name}`
        : "Chat";
}


// ======================================
// KEYBOARD SUPPORT
// ======================================

messageInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});


// ======================================
// START CHAT
// ======================================

if (!token) {
    alert("Please log in to use chat.");
    window.location.href = "login.html";
} else if (!listingId) {
    messagesContainer.textContent = "No listing was selected.";
} else {
    loadChatTitle();
    loadMessages();

    setInterval(() => {
        if (document.visibilityState === "visible") {
            loadMessages();
        }
    }, 5000);
}