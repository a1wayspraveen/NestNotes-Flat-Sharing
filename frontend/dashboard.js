const API_BASE_URL = window.NESTNOTES_API_BASE.replace(/\/api$/, "");

const API_URL = `${API_BASE_URL}/api/listings`;

const userId = localStorage.getItem("userId");

async function loadDashboard() {
    const token = localStorage.getItem("token");

    if (!token || !userId) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Unable to load listings");
        }

        const listings = await response.json();

        const myListings = listings.filter(
            item => String(item.user_id) === String(userId)
        );

        document.getElementById("myListings").textContent =
            myListings.length;

        document.getElementById("verifiedListings").textContent =
            myListings.filter(item => item.verified === 1).length;

        const statsResponse = await fetch(
            `${API_BASE_URL}/api/listings/dashboard/stats/${userId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!statsResponse.ok) {
            throw new Error("Unable to load dashboard statistics");
        }

        const stats = await statsResponse.json();

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
        console.error("Dashboard error:", error);
    }
}

async function loadStats() {
    const token = localStorage.getItem("token");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/listings/dashboard/stats/${userId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load statistics");
        }

        const stats = await response.json();

        document.getElementById("myListings").textContent =
            stats.totalListings || 0;

        document.getElementById("totalInterests").textContent =
            stats.totalInterests || 0;

        document.getElementById("totalMessages").textContent =
            stats.totalMessages || 0;

    } catch (error) {
        console.error(error);
    }
}

async function getInterestCount(listingId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/interests/count/${listingId}`
        );

        if (!response.ok) {
            throw new Error("Unable to load interest count");
        }

        const data = await response.json();

        return data.count || 0;

    } catch (error) {
        console.error(error);
        return 0;
    }
}

async function getMessageCount(listingId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/messages/${listingId}`
        );

        if (!response.ok) {
            throw new Error("Unable to load message count");
        }

        const messages = await response.json();

        return Array.isArray(messages) ? messages.length : 0;

    } catch (error) {
        console.error(error);
        return 0;
    }
}

function openInbox() {
    window.location.href = "inbox.html";
}

function editListing(id) {
    window.location.href = `edit-listing.html?id=${id}`;
}

async function deleteListing(id) {
    if (!confirm("Are you sure you want to delete this listing?")) {
        return;
    }

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Unable to delete listing");
        }

        alert("Listing deleted successfully!");
        loadDashboard();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

loadDashboard();