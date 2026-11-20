// ========================================
// NESTNOTES OWNER INBOX
// Group messages into conversations
// ========================================

const API_URL = `${window.NESTNOTES_API_BASE}/messages`;

const token = localStorage.getItem("token");
const userId = localStorage.getItem("userId");

// Redirect users who aren't logged in.
if (!token || !userId) {
  window.location.href = "login.html";
}

// ========================================
// AUTHENTICATION HELPERS
// ========================================

function getAuthHeaders(includeJson = false) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      data.message || "Your session has expired or you don't have permission.",
    );
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

// ========================================
// LOAD REPLIES
// ========================================

async function getReplies(messageId) {
  const response = await fetch(
    `${API_URL}/replies/${encodeURIComponent(messageId)}`,
    {
      headers: getAuthHeaders(),
    },
  );

  return handleResponse(response);
}

// ========================================
// GROUP MESSAGES INTO CONVERSATIONS
// ========================================

function groupMessagesIntoConversations(messages) {
  const conversations = new Map();
  const currentUserId = Number(userId);

  for (const message of messages) {
    const senderId = Number(message.senderId);
    const recipientId =
      message.recipientId == null ? null : Number(message.recipientId);

    // The owner is the current user.
    // The other participant is the person on the other side
    // of the conversation.
    let participantId;

    if (senderId === currentUserId) {
      participantId = recipientId;
    } else {
      participantId = senderId;
    }

    // Old messages with no recipient and sent by the owner
    // cannot safely be assigned to a particular conversation.
    if (
      !Number.isInteger(participantId) ||
      participantId <= 0 ||
      participantId === currentUserId
    ) {
      console.warn(
        "Skipping a message whose conversation participant is unknown:",
        message.id,
      );
      continue;
    }

    const key = `${message.listingId}:${participantId}`;

    if (!conversations.has(key)) {
      conversations.set(key, {
        key,
        listingId: Number(message.listingId),
        participantId,
        title: message.title || "Listing",
        name: message.name || "User",
        email: message.email || "",
        age: message.age,
        gender: message.gender,
        occupation: message.occupation,
        budget: message.budget,
        food_preference: message.food_preference,
        smoking: message.smoking,
        drinking: message.drinking,
        bio: message.bio,
        messages: [],
        latestMessage: message,
        unreadCount: 0,
      });
    }

    const conversation = conversations.get(key);

    conversation.messages.push(message);

    // Count only messages addressed to the current user.
    if (recipientId === currentUserId && Number(message.isRead) === 0) {
      conversation.unreadCount++;
    }

    // The API orders messages newest first, but compare dates
    // to keep the latest message correct even if that changes.
    const currentLatestTime = Date.parse(
      conversation.latestMessage.createdAt || "",
    );

    const messageTime = Date.parse(message.createdAt || "");

    if (
      Number.isFinite(messageTime) &&
      (!Number.isFinite(currentLatestTime) || messageTime > currentLatestTime)
    ) {
      conversation.latestMessage = message;

      // Prefer the sender's name when the latest message
      // comes from the other participant.
      if (Number(message.senderId) === participantId) {
        conversation.name = message.name || conversation.name;
        conversation.email = message.email || conversation.email;
      }
    }
  }

  return Array.from(conversations.values()).sort((a, b) => {
    const timeA = Date.parse(a.latestMessage.createdAt || "") || 0;
    const timeB = Date.parse(b.latestMessage.createdAt || "") || 0;

    return timeB - timeA;
  });
}

// ========================================
// LOAD OWNER INBOX
// ========================================

async function loadInbox() {
  const container = document.getElementById("messagesContainer");

  if (!container) {
    console.error("messagesContainer element was not found.");
    return;
  }

  container.innerHTML = "<p>Loading conversations...</p>";

  try {
    const response = await fetch(
      `${API_URL}/owner/${encodeURIComponent(userId)}`,
      {
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    const messages = await handleResponse(response);

    if (!Array.isArray(messages)) {
      throw new Error("The server returned an unexpected inbox response.");
    }

    const conversations = groupMessagesIntoConversations(messages);

    if (conversations.length === 0) {
      container.innerHTML = `
                <div class="empty-inbox">
                    <h3>No conversations yet</h3>
                    <p>Messages from interested users will appear here.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = "";

    for (const conversation of conversations) {
      const latest = conversation.latestMessage;
      const card = document.createElement("div");

      card.className = "message-card conversation-card";

      if (conversation.unreadCount > 0) {
        card.classList.add("unread-message-card");
      }

      const unreadBadge =
        conversation.unreadCount > 0
          ? `
                    <span class="inbox-unread-badge">
                        ${conversation.unreadCount} unread
                    </span>
                  `
          : "";

      const latestDate = latest.createdAt
        ? new Date(latest.createdAt).toLocaleString()
        : "";

      const latestSenderId = Number(latest.senderId);

      const latestSenderLabel =
        latestSenderId === Number(userId) ? "You" : conversation.name;

      card.innerHTML = `
                <div class="conversation-header">
                    <h3>
                        🏠 ${escapeHtml(conversation.title)}
                    </h3>

                    ${unreadBadge}
                </div>

                <p>
                    <strong>
                        ${escapeHtml(conversation.name)}
                    </strong>
                </p>

                <p>
                    ${escapeHtml(conversation.email)}
                </p>

                <p>
                    <strong>Messages:</strong>
                    ${conversation.messages.length}
                </p>

                <div class="conversation-latest-message">
                    <strong>Latest message — ${escapeHtml(latestSenderLabel)}:</strong>
                    <p>${escapeHtml(latest.message || "")}</p>
                </div>

                <small>
                    ${escapeHtml(latestDate)}
                </small>

                <div class="reply-history-section">
    <button
        type="button"
        class="toggle-history-btn"
        aria-expanded="false"
    >
        💬 View Reply History
    </button>

    <div class="reply-history-container" hidden>
        <p class="reply-history-status" role="status">
            Click above to load replies.
        </p>

        <div class="reply-history-list"></div>
    </div>
</div>

        <div class="conversation-reply-section">
    <button
        class="toggle-reply-btn"
        type="button"
        aria-expanded="false"
    >
        Reply to Conversation
    </button>

    <form class="conversation-reply-form" hidden>
        <label>Write your reply</label>

        <textarea
            class="conversation-reply-input"
            rows="3"
            maxlength="2000"
            placeholder="Type your reply here..."
            required
        ></textarea>

        <button type="submit" class="send-reply-btn">
            Send Reply
        </button>

        <p class="reply-status" role="status"></p>
    </form>
    </div>

        <div class="conversation-actions">
            <button
                class="view-profile-btn"
                type="button"
            >
                View Profile
            </button>

            <button
                class="open-chat-btn"
                type="button"
            >
                Open Conversation
            </button>
        </div>
            `;

      card.querySelector(".view-profile-btn").addEventListener("click", () => {
        viewProfile(conversation.participantId);
      });

      card.querySelector(".open-chat-btn").addEventListener("click", () => {
        openChat(
          conversation.participantId,
          conversation.listingId,
          conversation.name,
        );
      });

      // Toggle the reply form.
      const toggleReplyBtn = card.querySelector(".toggle-reply-btn");
      const replyForm = card.querySelector(".conversation-reply-form");
      const replyInput = card.querySelector(".conversation-reply-input");
      const replyStatus = card.querySelector(".reply-status");

      toggleReplyBtn.addEventListener("click", () => {
        const opening = replyForm.hidden;

        replyForm.hidden = !opening;
        toggleReplyBtn.setAttribute("aria-expanded", String(opening));

        if (opening) {
          replyInput.focus();
        }
      });

      // Submit a reply to the latest message in this conversation.
      replyForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const reply = replyInput.value.trim();

        if (!reply) {
          replyStatus.textContent = "Please enter a reply.";
          return;
        }

        const sendButton = replyForm.querySelector(".send-reply-btn");

        sendButton.disabled = true;
        replyStatus.textContent = "Sending reply...";

        try {
          const response = await fetch(`${API_URL}/reply`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              messageId: latest.id,
              senderId: Number(userId),
              reply,
            }),
          });

          await handleResponse(response);

          // Refresh the unread notification badge immediately.
          if (typeof window.refreshUnreadNotifications === "function") {
            window.refreshUnreadNotifications();
          }

          replyInput.value = "";
          replyStatus.textContent = "Reply sent successfully!";

          // Keep reply history open and refresh it after sending.
          historyContainer.hidden = false;

          historyButton.setAttribute("aria-expanded", "true");
          historyButton.textContent = "✖ Hide Reply History";

          await refreshReplyHistory(false);
        } catch (error) {
          console.error("Reply submission error:", error);
          replyStatus.textContent = error.message || "Unable to send reply.";
        } finally {
          sendButton.disabled = false;
        }
      });

      // ========================================
      // REPLY HISTORY WITH AUTO-REFRESH
      // ========================================

      const historyButton = card.querySelector(".toggle-history-btn");
      const historyContainer = card.querySelector(".reply-history-container");
      const historyList = card.querySelector(".reply-history-list");
      const historyStatus = card.querySelector(".reply-history-status");

      let historyLoading = false;

      // Load and render replies for this conversation.
      async function refreshReplyHistory(silent = false) {
        if (historyLoading) return;

        historyLoading = true;

        if (!silent) {
          historyStatus.textContent = "Loading reply history...";
        }

        try {
          const results = await Promise.all(
            conversation.messages.map(async (message) => {
              const replies = await getReplies(message.id);

              if (!Array.isArray(replies)) {
                throw new Error("Unexpected reply history response.");
              }

              return replies.map((reply) => ({
                ...reply,
                originalMessageId: message.id,
              }));
            }),
          );

          const allReplies = results.flat().sort((a, b) => {
            const dateA = Date.parse(a.createdAt || "") || 0;
            const dateB = Date.parse(b.createdAt || "") || 0;

            return dateA - dateB;
          });

          // Show an empty state if there are no replies.
          if (allReplies.length === 0) {
            historyList.innerHTML = "";

            historyStatus.textContent =
              "No replies yet. You can send the first reply below.";

            return;
          }

          historyStatus.textContent = `${allReplies.length} ${
            allReplies.length === 1 ? "reply" : "replies"
          }`;

          // Preserve the history panel's scroll position.
          const previousScrollTop = historyContainer.scrollTop;

          historyList.innerHTML = allReplies
            .map((reply) => {
              const replySenderId = Number(reply.senderId);
              const currentUserId = Number(userId);
              const participantId = Number(conversation.participantId);

              let senderLabel;

              if (replySenderId === currentUserId) {
                senderLabel = "You";
              } else if (replySenderId === participantId) {
                senderLabel = conversation.name || "Participant";
              } else {
                senderLabel = "Unknown user";
              }

              const replyDate = reply.createdAt
                ? new Date(reply.createdAt).toLocaleString()
                : "Date unavailable";

              return `
                <article class="reply-history-item">
                    <div class="reply-history-header">
                        <strong>${escapeHtml(senderLabel)}</strong>
                        <time>${escapeHtml(replyDate)}</time>
                    </div>

                    <p>${escapeHtml(reply.reply || "")}</p>
                </article>
            `;
            })
            .join("");

          historyContainer.scrollTop = previousScrollTop;
        } catch (error) {
          console.error("Reply history refresh error:", error);

          // Don't disrupt the existing history during a background refresh.
          if (!silent) {
            historyStatus.textContent =
              "Unable to load reply history. Please try again.";

            historyButton.textContent = "↻ Retry Reply History";
          }
        } finally {
          historyLoading = false;
        }
      }

      // Make the refresh function available to the global polling timer.
      card.refreshReplyHistory = () => {
        if (!historyContainer.hidden) {
          refreshReplyHistory(true);
        }
      };

      // Open or close Reply History.
      historyButton.addEventListener("click", async () => {
        if (!historyContainer.hidden) {
          historyContainer.hidden = true;

          historyButton.setAttribute("aria-expanded", "false");
          historyButton.textContent = "💬 View Reply History";

          return;
        }

        historyContainer.hidden = false;

        historyButton.setAttribute("aria-expanded", "true");
        historyButton.textContent = "✖ Hide Reply History";

        await refreshReplyHistory(false);
      });

      container.appendChild(card);
    }
  } catch (error) {
    console.error("Inbox loading error:", error);

    container.innerHTML = `
            <p style="color:#c0392b;">
                Unable to load your inbox: ${escapeHtml(error.message)}
            </p>

            <button type="button" id="retryInboxBtn">
                Try Again
            </button>
        `;

    document
      .getElementById("retryInboxBtn")
      ?.addEventListener("click", loadInbox);
  }
}

// ========================================
// HTML ESCAPING
// ========================================

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

// ========================================
// VIEW USER PROFILE
// ========================================

function viewProfile(profileUserId) {
  if (!profileUserId) {
    alert("User profile information is unavailable.");
    return;
  }

  window.location.href = `user-profile.html?id=${encodeURIComponent(profileUserId)}`;
}

// ========================================
// OPEN CONVERSATION
// ========================================

function openChat(chatUserId, listingId, name) {
  const currentUserId = Number(localStorage.getItem("userId"));
  const otherUserId = Number(chatUserId);
  const propertyId = Number(listingId);

  if (
    !Number.isInteger(otherUserId) ||
    otherUserId <= 0 ||
    !Number.isInteger(propertyId) ||
    propertyId <= 0
  ) {
    alert("Chat information is incomplete. Please try again.");

    console.error("Invalid chat details:", {
      chatUserId,
      listingId,
    });

    return;
  }

  if (otherUserId === currentUserId) {
    alert("You cannot start a conversation with yourself.");
    return;
  }

  const params = new URLSearchParams({
    userId: String(otherUserId),
    listingId: String(propertyId),
    name: name || "User",
  });

  window.location.href = `chat.html?${params.toString()}`;
}

// ========================================
// AUTOMATIC REPLY HISTORY REFRESH
// ========================================

// Check every 15 seconds.
// Refresh only conversations whose Reply History is open.
setInterval(() => {
  document.querySelectorAll(".conversation-card").forEach((card) => {
    const historyContainer = card.querySelector(".reply-history-container");

    if (
      historyContainer &&
      !historyContainer.hidden &&
      typeof card.refreshReplyHistory === "function"
    ) {
      card.refreshReplyHistory();
    }
  });
}, 15000);

// ========================================
// SEARCH CONVERSATIONS
// ========================================

const searchInbox = document.getElementById("searchInbox");

if (searchInbox) {
  searchInbox.addEventListener("input", () => {
    const searchTerm = searchInbox.value.trim().toLowerCase();

    document.querySelectorAll(".conversation-card").forEach((card) => {
      const searchableText = card.textContent.toLowerCase();

      card.style.display = searchableText.includes(searchTerm) ? "" : "none";
    });
  });
}

// ========================================
// START
// ========================================

if (token && userId) {
  loadInbox();
}
