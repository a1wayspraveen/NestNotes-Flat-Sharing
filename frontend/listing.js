const params = new URLSearchParams(window.location.search);

const id = params.get("id");

const API_URL = `https://nestnotes-flat-sharing.onrender.com/api/listings/${id}`;

const container = document.getElementById("listingDetails");

async function loadListing() {
  const interestCount = await getInterestCount(id);

  try {
    const response = await fetch(API_URL);

    const listing = await response.json();

    container.innerHTML = `
<div class="details-card">

    <img
        src="${listing.image || "https://placehold.co/600x400"}"
        class="details-image"
    >

    ${
      listing.verified === 1
        ? '<span class="verified-badge">✔ Verified</span>'
        : ""
    }

    <h3>
    ${listing.title}
    ${
      listing.verified === 1
        ? '<span class="verified-badge">✔ Verified</span>'
        : ""
    }
    </h3>

    <h2>
    ${listing.rent ? `₹${listing.rent}/month` : "Rent not specified"}
    </h2>    

    <p>
        <strong>Location:</strong>
        ${listing.location || "Location unavailable"}
    </p>

    <p>
        <strong>Category:</strong>
        ${listing.category || "Not specified"}
    </p>

    <p>
        <strong>Status:</strong>
        ${listing.verified === 1 ? "✅ Verified" : "❌ Pending Verification"}
    </p>

    <p>
        <strong>Description:</strong>
        ${listing.description || "Description unavailable"}
    </p>

    <button onclick="expressInterest(${listing.id})">
    Express Interest
</button>

<p>
    <strong>Interested Users:</strong>
    ${interestCount}
</p>

<button onclick="sendMessage(${listing.id})">
    Message Owner
</button>

${
  localStorage.getItem("userId") == listing.user_id
    ? `
        <button onclick="viewInterestedUsers(${listing.id})">
            View Interested Users
        </button>
      `
    : ""
}

    <br><br>

    <a href="index.html">
        ← Back to Listings
    </a>

</div>
`;
  } catch (error) {
    console.error(error);
  }
}

loadListing();

function sendMessage(listingId) {
  window.location.href = `chat.html?listingId=${listingId}`;
}

async function getInterestCount(listingId) {
  try {
    const response = await fetch(
      `https://nestnotes-flat-sharing.onrender.com/api/interests/count/${listingId}`,
    );

    const data = await response.json();

    return data.count;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

async function expressInterest(listingId) {
  const token = localStorage.getItem("token");

  try {
    const response = await fetch("https://nestnotes-flat-sharing.onrender.com/api/interests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        listingId,
      }),
    });

    const data = await response.json();

    alert(data.message);

    loadListing();
  } catch (error) {
    console.error(error);
  }
}

function viewInterestedUsers(listingId) {
    window.location.href =
    `view-interests.html?listingId=${listingId}`;
}
