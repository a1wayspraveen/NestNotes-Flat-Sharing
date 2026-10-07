const params = new URLSearchParams(window.location.search);

const receiverId = params.get("userId");

const listingId = params.get("listingId");

const token = localStorage.getItem("token");

async function loadMessages() {
  try {
    const response = await fetch(
      `http://localhost:3000/api/messages/${listingId}`,
    );

    const messages = await response.json();

    const container = document.getElementById("messages");
    container.innerHTML = "";

    let chatItems = [];

    for (const msg of messages) {
      chatItems.push({
        type: "user",
        text: msg.message,
        createdAt: msg.createdAt,
      });

      const repliesResponse = await fetch(
        `http://localhost:3000/api/messages/replies/${msg.id}`,
      );

      const replies = await repliesResponse.json();

      replies.forEach((reply) => {
        chatItems.push({
          type: "owner",
          text: reply.reply,
          createdAt: reply.createdAt,
        });
      });
    }

    chatItems.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let html = "";

    chatItems.forEach((item) => {
      if (item.type === "user") {
        html += `
      <div class="message">
        <strong>You</strong><br>
        ${item.text}
        <small>${item.createdAt}</small>
      </div>
    `;
      } else {
        html += `
      <div class="owner-reply">
        <strong>🏠 Owner</strong><br>
        ${item.text}
        <small>${item.createdAt}</small>
      </div>
    `;
      }
    });

    container.innerHTML = html;

    container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error(error);
  }
}

async function sendMessage() {
  const input = document.getElementById("messageInput");

  const message = input.value.trim();

  if (!message) return;

  try {
    const response = await fetch("http://localhost:3000/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        listingId: listingId,
        message: message,
      }),
    });

    const data = await response.json();

    console.log(data);

    input.value = "";

    loadMessages();
  } catch (error) {
    console.error(error);
  }
}

loadMessages();

setInterval(() => {
  if (document.visibilityState === "visible") {
    loadMessages();
  }
}, 5000);

async function loadChatTitle() {
  try {
    const response = await fetch(
      `http://localhost:3000/api/messages/owner/${receiverId}`,
    );

    const data = await response.json();

    if (data.length > 0) {
      const userName = params.get("name");

      document.getElementById("chatTitle").textContent =
        `Chat with ${userName}`;
    } else {
      document.getElementById("chatTitle").textContent = "Chat";
    }
  } catch (err) {
    console.error(err);
  }
}

loadChatTitle();
