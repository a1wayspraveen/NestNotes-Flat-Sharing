const API_URL = window.NESTNOTES_API_BASE;

const params = new URLSearchParams(window.location.search);
const listingId = params.get("listingId");
const otherUserId = params.get("userId");
const token = localStorage.getItem("token");

const currentUserId = Number(localStorage.getItem("userId"));

const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const chatTitle = document.getElementById("chatTitle");

let isLoading = false;
let lastSignature = "";

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
  };
}

// ======================================
// MARK CONVERSATION MESSAGES AS READ
// ======================================

async function markConversationAsRead() {
  if (!token || !listingId) return;

  try {
    const response = await fetch(
      `${API_URL}/messages/read/${encodeURIComponent(listingId)}`,
      {
        method: "PATCH",
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      console.warn("Unable to mark messages as read:", response.status);
      return;
    }

    const result = await response.json();

    console.log("Messages marked as read:", result.updatedCount);

    window.dispatchEvent(new Event("unreadMessagesUpdated"));

    localStorage.setItem("nestnotesUnreadRefresh", String(Date.now()));
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

// Create elements safely without inserting user messages as HTML.
function createMessageBubble(text, senderName, createdAt, isOwnMessage) {
  const bubble = document.createElement("div");

  bubble.className = isOwnMessage ? "message" : "owner-reply";

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
    const messageUrl = new URL(
      `${API_URL}/messages/${encodeURIComponent(listingId)}`,
    );

    if (otherUserId) {
      messageUrl.searchParams.set("userId", otherUserId);
    }

    const response = await fetch(messageUrl.toString(), {
      headers: authHeaders(),
    });

    console.log("Chat request URL:", response.url);
    console.log("Chat response status:", response.status);

    const responseText = await response.clone().text();
    console.log("Chat response body:", responseText);

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Please log in again."
          : response.status === 403
            ? "You don't have permission to view this conversation."
            : `Unable to load messages (${response.status}).`,
      );
    }

    const messages = await response.json();
    await markConversationAsRead();
    const chatItems = [];

    for (const msg of messages) {
      chatItems.push({
        id: `message-${msg.id}`,
        senderId: Number(msg.senderId),
        senderName: msg.senderName,
        text: msg.message,
        createdAt: msg.createdAt,
      });

      const repliesResponse = await fetch(
        `${API_URL}/messages/replies/${encodeURIComponent(msg.id)}`,
        {
          headers: authHeaders(),
        },
      );

      if (!repliesResponse.ok) {
        throw new Error(`Unable to load replies (${repliesResponse.status}).`);
      }

      const replies = await repliesResponse.json();

      for (const reply of replies) {
        chatItems.push({
          id: `reply-${reply.id}`,
          senderId: Number(reply.senderId),
          senderName: reply.senderName,
          text: reply.reply,
          createdAt: reply.createdAt,
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
        messagesContainer.clientHeight <
      100;

    messagesContainer.replaceChildren();

    if (chatItems.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No messages yet. Start the conversation!";
      empty.className = "empty-chat";

      messagesContainer.appendChild(empty);
    }

    for (const item of chatItems) {
      const isOwnMessage = Number(item.senderId) === currentUserId;

      const senderName = isOwnMessage
    ? "You"
    : item.senderName || "Other participant";

      const bubble = createMessageBubble(
        item.text,
        senderName,
        item.createdAt,
        isOwnMessage,
      );

      messagesContainer.appendChild(bubble);
    }

    lastSignature = signature;

    if (nearBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        ...authHeaders(),
      },
      body: JSON.stringify({
        listingId,
        message,
        recipientId: otherUserId ? Number(otherUserId) : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Message could not be sent.");
    }

    // Refresh the unread notification badge immediately.
    if (typeof window.refreshUnreadNotifications === "function") {
      window.refreshUnreadNotifications();
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

  chatTitle.textContent =
    name && name !== "null" ? `Chat with ${name}` : "Chat";
}

// ======================================
// KEYBOARD SUPPORT
// ======================================

messageInput.addEventListener("keydown", (event) => {
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
  // Helpful empty state when no listing is selected
  messagesContainer.innerHTML = `
        <div class="chat-empty-state">
            <div class="chat-empty-icon" aria-hidden="true">💬</div>

            <h3>Ready to find your next home?</h3>

            <p>
                Select a property to start a conversation with its owner.
                Your conversations will appear here.
            </p>

            <a href="index.html#listingContainer" class="chat-empty-button">
                Explore Listings →
            </a>
        </div>
    `;
} else {
  loadChatTitle();
  loadMessages();

  setInterval(() => {
    if (document.visibilityState === "visible") {
      loadMessages();
    }
  }, 5000);
}
