const API_URL =
  "https://nestnotes-flat-sharing.onrender.com/api/listings";

const userId = localStorage.getItem("userId");

async function loadDashboard() {
  try {
    const response = await fetch(API_URL);

    const listings = await response.json();

    const myListings = listings.filter(
      (item) => String(item.user_id) === String(userId),
    );

    document.getElementById("myListings").textContent = myListings.length;

    document.getElementById("verifiedListings").textContent =
    myListings.filter(
      (item) => item.verified === 1,
    ).length;

    const statsResponse =
await fetch(
    `https://nestnotes-flat-sharing.onrender.com/api/listings/dashboard/stats/${userId}`
);

const stats =
await statsResponse.json();

document.getElementById("totalInterests").textContent =
    stats.totalInterests || 0;

document.getElementById("totalMessages").textContent =
    stats.totalMessages || 0;

    const table = document.getElementById("listingsTable");

    table.innerHTML = "";

    for (const item of myListings) {
      const interestCount = await getInterestCount(item.id);
      const messageCount = await getMessageCount(item.id);
      table.innerHTML += `
        <tr>
          <td>${item.title}</td>
          <td>₹${item.rent}</td>
          <td>${item.location}</td>
          <td>
            ${item.verified === 1 ? "✅ Verified" : "❌ Pending"}
          </td>
          <td>${interestCount}</td>
          <td>${messageCount}</td>
          <td>
            <button onclick="editListing(${item.id})">
              Edit
            </button>
            <button onclick="openInbox()">
              Inbox
            </button>
            <button onclick="deleteListing(${item.id})">
              Delete
            </button>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadStats() {

    const response = await fetch(
        `https://nestnotes-flat-sharing.onrender.com/api/listings/dashboard/stats/${userId}`
    );

    const stats = await response.json();

    document.getElementById("myListings").textContent =
        stats.totalListings;

    document.getElementById("totalInterests").textContent =
        stats.totalInterests;

    document.getElementById("totalMessages").textContent =
        stats.totalMessages;
}

async function getInterestCount(listingId) {

    try {

        const response = await fetch(
            `https://nestnotes-flat-sharing.onrender.com/api/interests
/count/${listingId}`
        );

        const data = await response.json();

        return data.count;

    } catch(error) {

        console.error(error);
        return 0;
    }
}

async function getMessageCount(listingId) {

    try {

        const response = await fetch(
            `https://nestnotes-flat-sharing.onrender.com/api/messages/${listingId}`
        );

        const messages = await response.json();

        return messages.length;

    } catch(error) {

        console.error(error);
        return 0;
    }
}

function openInbox() {
    window.location.href = "inbox.html";
}

function viewInterests(id) {

    window.location.href =
    `view-interests.html?id=${id}`;
}

loadStats();
loadDashboard();
