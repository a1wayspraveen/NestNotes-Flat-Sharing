const API_URL =
  "https://nestnotes-flat-sharing.onrender.com/api/listings";

const container = document.getElementById("myListingsContainer");

const listingCount = document.getElementById("listingCount");

const currentUserId = localStorage.getItem("userId");

async function loadMyListings() {
  try {
    const response = await fetch(API_URL);

    const listings = await response.json();

    console.log("Current User ID:", currentUserId);
    console.log("All Listings:", listings);
    console.log(
      "User IDs:",
      listings.map((l) => l.user_id),
    );

    console.log("Listings from API:", listings);

    console.log("Current User:", currentUserId);
    console.log("Listings:", listings);
    console.log(
      "User IDs:",
      listings.map((l) => l.user_id),
    );

    const myListings = listings.filter(
      (listing) => listing.user_id == currentUserId,
    );

    const listingCount = document.getElementById("listingCount");

    if (listingCount) {
      listingCount.textContent = `You have ${myListings.length} listing(s)`;
    }

    if (myListings.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <h2>No Listings Yet</h2>
                    <p>Create your first listing.</p>
                </div>
            `;

      return;
    }

    container.innerHTML = "";

    myListings.forEach((listing) => {
      const imageUrl = listing.image
        ? `${listing.image}?t=${Date.now()}`
        : "https://via.placeholder.com/400x250?text=No+Image";

      const card = document.createElement("div");

      card.className = "my-card";

      card.innerHTML = `
        <img
            src="${imageUrl}"
            class="listing-image"
            alt="${listing.title}"
        >

        <div class="my-card-content">
            <h3>${listing.title}</h3>

            <p>
                <strong>₹${listing.rent}</strong>/month
            </p>

            <p>📍 ${listing.location}</p>

            <p class="badge">${listing.category}</p>

            <div class="my-actions">

    <button
        class="edit-btn"
        onclick="editListing(${listing.id})">
        Edit
    </button>

    <button
        class="delete-btn"
        onclick="deleteListing(${listing.id})">
        Delete
    </button>

    <button
        class="interest-view-btn"
        onclick="viewInterests(${listing.id})">
        View Interested Users
    </button>

</div>

</div>
`;

      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

async function deleteListing(id) {
  const token = localStorage.getItem("token");

  if (!confirm("Delete this listing?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    console.log(data);

    loadMyListings();
  } catch (error) {
    console.error(error);
  }
}

function editListing(id) {
  console.log("Edit clicked, ID =", id);

  window.location.href = `edit-listing.html?id=${id}`;
}

loadMyListings();

async function viewInterestedUsers(listingId) {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(
      `https://nestnotes-flat-sharing.onrender.com/api/interests/listing/${listingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const users = await response.json();

    console.log(users);

    if (users.length === 0) {
      alert("No interested users yet");
      return;
    }

    let message = "Interested Users:\n\n";

    users.forEach((user) => {
      message += `${user.email}\n`;
    });

    alert(message);
  } catch (error) {
    console.error(error);
  }
}

function viewInterests(listingId) {
  window.location.href = `view-interests.html?id=${listingId}`;
}
