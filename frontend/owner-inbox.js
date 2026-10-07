const API_URL = "http://localhost:3000/api/messages";

const userId = localStorage.getItem("userId");

async function getReplies(messageId) {
  const response = await fetch(`${API_URL}/replies/${messageId}`);

  return await response.json();
}

async function loadInbox() {
  const response = await fetch(`${API_URL}/owner/${userId}`);
  const messages = await response.json();
  console.log(JSON.stringify(messages, null, 2));

  const container = document.getElementById("messagesContainer");

  if (messages.length === 0) {
    container.innerHTML = "<p>No messages yet.</p>";
    return;
  }

  container.innerHTML = "";

  for (const msg of messages) {
    const replies = await getReplies(msg.id);

    let repliesHtml = "";

    replies.forEach((reply) => {
      repliesHtml += `
                <div class="reply-box">
                    <strong>Owner:</strong>
                    <p>${reply.reply}</p>
                    <small>${reply.createdAt}</small>
                </div>
            `;
    });

    container.innerHTML += `
            <div class="message-card">
    <h3>🏠 ${msg.title || "Listing"}</h3>

    <p><strong>${msg.name}</strong></p>
    <p>${msg.email}</p>

    <hr>

    <p>${msg.message}</p>

<p>Age: ${msg.age || "Not specified"}</p>
<p>Gender: ${msg.gender || "Not specified"}</p>
<p>Occupation: ${msg.occupation || "Not specified"}</p>
<p>Budget: ₹${msg.budget || "Not specified"}</p>

<button onclick="viewProfile(${msg.senderId})">
    View Profile
</button>

<button onclick="openChat(${msg.senderId}, ${msg.listingId}, '${msg.name}')">
    Open Chat
</button>
                <br>
                <small>${new Date(msg.createdAt).toLocaleString()}</small>

                ${repliesHtml}

                <br>

                <button onclick="showReplyForm(${msg.id})">Reply</button>

                <div id="reply-form-${msg.id}" style="display:none; margin-top:10px;">
                    <textarea id="reply-${msg.id}" placeholder="Type reply..."></textarea>
                    <br>
                    <button onclick="sendReply(${msg.id})">Send Reply</button>
                </div>
            </div>
        `;
  }
}

function showReplyForm(messageId) {
  document.getElementById(`reply-form-${messageId}`).style.display = "block";
}

loadInbox();

async function sendReply(messageId) {
  const reply = document.getElementById(`reply-${messageId}`).value;
  const senderId = localStorage.getItem("userId");

  const response = await fetch(`${API_URL}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messageId,
      senderId,
      reply,
    }),
  });

  const data = await response.json();

  alert(data.message);
  loadInbox();
}

function viewProfile(userId) {
  window.location.href = `user-profile.html?id=${userId}`;
}

function openChat(userId, listingId, name) {
  window.location.href = `chat.html?userId=${userId}&listingId=${listingId}&name=${encodeURIComponent(name)}`;
}
