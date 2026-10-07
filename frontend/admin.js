const API_URL = "http://localhost:3000/api/admin";

async function loadListings() {
  try {
    const response = await fetch(`${API_URL}/listings`);

    const listings = await response.json();

    document.getElementById("totalListings").textContent = listings.length;

    document.getElementById("verifiedListings").textContent = listings.filter(
      (item) => item.verified === 1,
    ).length;

    document.getElementById("pendingListings").textContent = listings.filter(
      (item) => item.verified !== 1,
    ).length;

    const table = document.getElementById("listingsTable");

    table.innerHTML = "";

    listings.forEach((item) => {
      table.innerHTML += `
                <tr>
                    <td>${item.title}</td>
                    <td>₹${item.rent}</td>
                    <td>${item.location}</td>

                    <td>
                        ${item.verified === 1 ? "✅ Verified" : "❌ Pending"}
                    </td>

                    <td>
                        <button
                            onclick="verifyListing(${item.id})">
                            Verify
                        </button>

                        <button
                            onclick="unverifyListing(${item.id})">
                            Unverify
                        </button>

                        <button
                            onclick="deleteListing(${item.id})">
                            Delete
                        </button>

                    </td>
                </tr>
            `;
    });
  } catch (error) {
    console.error(error);
  }
}

async function verifyListing(id) {
  await fetch(`${API_URL}/verify/${id}`, {
    method: "PUT",
  });

  loadListings();
}

async function unverifyListing(id) {
  await fetch(`${API_URL}/unverify/${id}`, {
    method: "PUT",
  });

  loadListings();
}

async function deleteListing(id) {
  if (!confirm("Delete this listing?")) {
    return;
  }

  const token = localStorage.getItem("token");

  await fetch(`http://localhost:3000/api/listings/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  loadListings();
}


  async function verifyUser(id) {
    await fetch(`http://localhost:3000/api/admin/verify/${id}`, {
      method: "PUT",
    });

    loadUsers();
  }

loadListings();
