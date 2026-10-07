const API_URL = "http://localhost:3000/api/messages";

const listingId = new URLSearchParams(window.location.search).get("listingId");

async function loadMessages() {
  const res = await fetch(`${API_URL}/${listingId}`);

  const messages = await res.json();

  document.getElementById("messagesContainer").innerHTML = messages
    .map(
      (m) => `
    <div class="message">
        <strong>User ${m.senderId}</strong>
        <p>${m.message}</p>
        <small>${m.createdAt}</small>
    </div>
`,
    )
    .join("");
}

async function sendMessage() {
  const token = localStorage.getItem("token");

  const message = document.getElementById("messageInput").value;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      listingId,
      message,
    }),
  });

  if (res.ok) {
    document.getElementById("messageInput").value = "";

    loadMessages();
  }
}

loadMessages();
