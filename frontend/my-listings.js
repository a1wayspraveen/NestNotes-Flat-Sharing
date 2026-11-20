const API_BASE_URL = window.NESTNOTES_API_BASE.replace(/\/api$/, "");
const API_URL = `${API_BASE_URL}/api/listings`;

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
        ? listing.image.startsWith("http")
          ? listing.image.replace(
              "https://nestnotes-flat-sharing.onrender.com",
              API_BASE_URL,
            )
          : `${API_BASE_URL}${listing.image.startsWith("/") ? "" : "/"}${listing.image}`
        : "https://placehold.co/600x400";

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

  if (!token) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/interests/listing/${listingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const users = await response.json();

    if (!response.ok) {
      alert(users.message || "Unable to load interested users.");
      return;
    }

    if (users.length === 0) {
      alert("No interested users yet.");
      return;
    }

    let message = "Interested Users:\n\n";

    users.forEach((user) => {
      message += `Name: ${user.name}\n`;
      message += `Email: ${user.email}\n`;
      message += `Occupation: ${user.occupation || "Not specified"}\n`;
      message += `Budget: ${user.budget || "Not specified"}\n\n`;
    });

    alert(message);

  } catch (error) {
    console.error("View interested users error:", error);
    alert("Something went wrong while loading interested users.");
  }
}


/* =========================================
   MY LISTINGS — MOBILE NAVIGATION
========================================= */

(function initializeDashboardMobileNavigation() {
  const toggle = document.getElementById("dashboardMenuToggle");
  const menu = document.getElementById("dashboardNavLinks");

  if (!toggle || !menu) return;

  const icon = toggle.querySelector(".menu-icon");

  function openMenu() {
    menu.classList.add("is-open");

    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation menu");

    if (icon) {
      icon.textContent = "✕";
    }
  }

  function closeMenu() {
    menu.classList.remove("is-open");

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");

    if (icon) {
      icon.textContent = "☰";
    }
  }

  toggle.addEventListener("click", function () {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", function (event) {
    if (
      !event.target.closest(".dashboard-navbar") &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu();
      toggle.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1000) {
      closeMenu();
    }
  });
})();
