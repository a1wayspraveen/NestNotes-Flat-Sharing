const params = new URLSearchParams(window.location.search);

const listingId = params.get("id");
const token = localStorage.getItem("token");

console.log("Listing ID:", listingId);

async function loadUsers() {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `http://localhost:3000/api/interests/listing/${listingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const users = await response.json();

    console.log(users);

    const container = document.getElementById("usersContainer");

    if (users.length === 0) {
      container.innerHTML = "<p>No interested users.</p>";
      return;
    }

    container.innerHTML = users
      .map((user) => {
        const userId = user.id || user.user_id;

        return `
                <div class="message-card">
                    <h3>${user.name}</h3>

                    <p>${user.email}</p>

                    <button onclick="viewProfile('${userId}')">
                        View Profile
                    </button>

                    <button onclick="contactUser('${userId}')">
                        Contact
                    </button>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error(error);
  }
}

function viewProfile(userId) {
  window.location.href = `user-profile.html?id=${userId}`;
}

function contactUser(userId) {
  window.location.href = `chat.html?userId=${userId}&listingId=${listingId}`;
}

loadUsers();
