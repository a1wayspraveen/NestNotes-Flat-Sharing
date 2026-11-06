const API_BASE_URL = window.NESTNOTES_API_BASE.replace(/\/api$/, "");

const API_URL = `${API_BASE_URL}/api/listings`;

const container = document.getElementById("listingContainer");

const form = document.getElementById("listingForm");

const searchInput = document.getElementById("search");

const token = localStorage.getItem("token");

let listings = [];

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

async function fetchListings() {
  try {
    document.getElementById("loader").style.display = "block";

    const response = await fetch(API_URL);

    listings = await response.json();

    displayListings(listings);
  } catch (error) {
    console.error(error);
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}

function displayListings(data) {
  console.log("Listings received:", data);

  container.innerHTML = "";

  if (listings.length === 0) {
    container.innerHTML = `
        <p class="empty-message">
            No properties available.
        </p>
    `;
    return;
  }

  data.forEach((listing) => {
    console.log(listing);
  });

  if (data.length === 0) {
    container.innerHTML = `
        <div class="empty-state">
            <h2>No Listings Found</h2>
            <p>Try adding a new listing.</p>
        </div>
    `;

    return;
  }

  const listingCount = document.getElementById("listingCount");

  if (listingCount) {
    listingCount.textContent = `${data.length} Listing(s) Found`;
  }

  const favoriteCount = document.getElementById("favoriteCount");

  if (favoriteCount) {
    favoriteCount.textContent = `Saved Listings: ${favorites.length}`;
  }

  container.innerHTML = "";

  const currentUserId = localStorage.getItem("userId");

  data.forEach(async (listing) => {
    const card = document.createElement("div");

    card.classList.add("card");

    const isOwner = listing.userId === localStorage.getItem("userId");

    console.log("Listing ID:", listing.id);

    console.log("Listing object:", listing);
    console.log("Listing ID:", listing.id);

    const interestCount = await getInterestCount(listing.id);

    card.innerHTML = `

    <div class="favorite-btn"
    onclick="toggleFavorite(${listing.id})">
    ${favorites.includes(listing.id) ? "❤️" : "🤍"}
    </div>

    <img
    class="listing-image"
    src="${
      listing.image
        ? listing.image.startsWith("http")
          ? listing.image.replace(
              "https://nestnotes-flat-sharing.onrender.com",
              API_BASE_URL,
            )
          : `${API_BASE_URL}${listing.image.startsWith("/") ? "" : "/"}${listing.image}`
        : "https://placehold.co/400x250?text=No+Image"
    }"
    >

    <div class="listing-content">

    <h3>
    ${listing.title}

    ${
      listing.verified === 1
        ? `<span class="verified-badge">✔ Verified</span>`
        : `<span class="pending-badge">Pending</span>`
    }
    </h3>

    <div class="price">
    ₹${listing.rent || "N/A"}/month
    </div>

    <div class="location">
    📍 ${listing.location || "Location unavailable"}
    </div>

    <div class="category-badge">
    ${listing.category}
    </div>

    <p class="description">
    ${listing.description || "Description unavailable"}
    </p>

    <div class="interest-count">
    👥 ${interestCount} Interested
    </div>

    <button
    class="view-btn"
    onclick="window.location.href='details.html?id=${listing.id}'">
    View Details
    </button>

    <button
    class="interest-btn"
    onclick="expressInterest(${listing.id}, this)">

    I'm Interested

    </button>

    <button
    class="message-btn"
    onclick="openChatPage(${listing.id})"
>
    💬 Message
    </button>

   ${
     isOwner
       ? `
    <div class="owner-actions">

   <button
    class="edit-btn"
    onclick="editListing(${listing.id})">
    Edit
    </button>

    ${
      listing.userId === localStorage.getItem("userId")
        ? `
    <button onclick="viewInterests(${listing.id})">
        View Interests
    </button>
    `
        : ""
    }

    <button
    class="delete-btn"
    onclick="deleteListing(${listing.id})">
    Delete
    </button>

    </div>
    `
       : ""
   }

    </div>
    `;

    container.appendChild(card);
  });
}

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter((item) => item !== id);
  } else {
    favorites.push(id);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));

  fetchListings();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  try {
    const imageFile = document.getElementById("image").files[0];

    const formData = new FormData();

    formData.append("image", imageFile);

    const uploadResponse = await fetch(`${API_BASE_URL}/api/listings/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadData.image) {
      throw new Error(
        uploadData.message || "Image upload failed. No image URL returned.",
      );
    }

    console.log("Uploaded image URL:", uploadData.image);

    const newListing = {
      title: document.getElementById("title").value,
      rent: document.getElementById("rent").value,
      location: document.getElementById("location").value,
      category: document.getElementById("category").value,
      image: uploadData.image,
      description: document.getElementById("description").value,
    };

    console.log("New listing payload:", newListing);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newListing),
    });

    const createdListing = await response.json();

    if (!response.ok) {
      throw new Error(createdListing.message || "Unable to create listing");
    }

    form.reset();
    fetchListings();
  } catch (error) {
    console.error(error);
    alert("Unable to add listing");
  }
});

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase();

  const filtered = listings.filter(
    (item) =>
      item.title.toLowerCase().includes(keyword) ||
      item.location.toLowerCase().includes(keyword),
  );

  displayListings(filtered);
});

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

    fetchListings();
  } catch (error) {
    console.error(error);
  }
}

async function editListingPrompt(id) {
  const listing = listings.find((item) => item.id === id);

  if (!listing) return;

  const title = prompt("Title", listing.title);

  const rent = prompt("Rent", listing.rent);

  const location = prompt("Location", listing.location);

  const image = prompt("Image URL", listing.image);

  const description = prompt("Description", listing.description);

  try {
    await fetch(`${API_URL}/${id}`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        title,
        rent,
        location,
        description,
      }),
    });

    fetchListings();
  } catch (error) {
    console.error(error);
  }
}

async function expressInterest(id, button) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please log in to express interest.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/interests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        listingId: id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to express interest.");
      return;
    }

    alert(data.message);

    button.innerText = "Interested ✓";
    button.style.background = "#28a745";
    button.disabled = true;
  } catch (error) {
    console.error("Express interest error:", error);
    alert("Unable to express interest. Please try again.");
  }
}

fetchListings();
loadStats();

document.getElementById("sortRent").addEventListener("change", (e) => {
  let sorted = [...listings];

  if (e.target.value === "low") {
    sorted.sort((a, b) => a.rent - b.rent);
  } else if (e.target.value === "high") {
    sorted.sort((a, b) => b.rent - a.rent);
  }

  displayListings(sorted);
});

document.getElementById("categoryFilter").addEventListener("change", (e) => {
  const category = e.target.value;

  if (category === "All Categories" || category === "") {
    displayListings(listings);
    return;
  }

  const filtered = listings.filter((item) => item.category === category);

  displayListings(filtered);
});

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/listings/stats/summary`);

    if (!response.ok) {
      throw new Error(`Statistics request failed: ${response.status}`);
    }

    const stats = await response.json();

    document.getElementById("totalListings").textContent =
      stats.totalListings ?? 0;

    document.getElementById("averageRent").textContent =
      "₹" + Math.round(stats.averageRent ?? 0);

    document.getElementById("highestRent").textContent =
      "₹" + (stats.highestRent ?? 0);
  } catch (error) {
    console.error("Unable to load dashboard statistics:", error);
  }
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");

    window.location.href = "login.html";
  });
}

const toggleBtn = document.getElementById("toggleFormBtn");

const formContainer = document.getElementById("formContainer");
formContainer.style.display = "none";

toggleBtn.addEventListener("click", () => {
  if (formContainer.style.display === "none") {
    formContainer.style.display = "block";

    toggleBtn.textContent = "− Hide Form";
  } else {
    formContainer.style.display = "none";
    toggleBtn.textContent = "+ Add New Listing";
  }
});

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");

  window.location.href = "login.html";
}

function updateNavigation() {
  const loggedIn = Boolean(localStorage.getItem("token"));
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const visibility = {
    ownerInboxLink: loggedIn,
    favoritesLink: true,
    notificationsLink: loggedIn,
    myListingsLink: loggedIn,
    dashboardLink: loggedIn,
    adminLink: loggedIn && user.role === "admin",
  };

  Object.entries(visibility).forEach(([id, visible]) => {
    const element = document.getElementById(id);

    if (element) {
      element.style.display = visible ? "" : "none";
    }
  });

  document.querySelectorAll(".nav-login, .nav-signup").forEach((element) => {
    element.style.display = loggedIn ? "none" : "";
  });

  const logoutButton = document.getElementById("logoutBtn");

  if (logoutButton) {
    logoutButton.style.display = loggedIn ? "" : "none";
  }
}

updateNavigation();

function editListing(id) {
  console.log("Edit clicked, ID =", id);

  if (!id) {
    alert("Listing ID is missing!");
    return;
  }

  window.location.href = `edit-listing.html?id=${id}`;
}

async function viewInterests(id) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please log in to continue.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/interests/listing/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const interests = await response.json();

    if (!response.ok) {
      alert(interests.message || "Unable to load interests.");
      return;
    }

    let text = "";

    interests.forEach((user) => {
      text += `User: ${user.name}\n`;
    });

    alert(text || "No interests yet");
  } catch (error) {
    console.error("View interests error:", error);
    alert("Something went wrong while loading interests.");
  }
}

async function viewMessages(listingId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages/${listingId}`);

    const messages = await response.json();

    if (messages.length === 0) {
      alert("No messages yet");

      return;
    }

    let text = "";

    messages.forEach((msg) => {
      text += `${msg.sender}: ${msg.text}\n`;
    });

    alert(text);
  } catch (error) {
    console.error(error);

    alert("Unable to load messages");
  }
}

async function getInterestCount(listingId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/interests/count/${listingId}`,
    );

    const data = await response.json();

    return data.count;
  } catch (error) {
    console.error(error);

    return 0;
  }
}

function openChatPage(listingId) {
  window.location.href = `chat.html?listingId=${listingId}`;
}

/* =========================================
   NESTNOTES MOBILE NAVIGATION
========================================= */

(function initializeMobileNavigation() {
  const menuToggle = document.getElementById("mobileMenuToggle");
  const navLinks = document.getElementById("navLinks");

  if (!menuToggle || !navLinks) {
    return;
  }

  function closeMenu() {
    navLinks.classList.remove("mobile-menu-open");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  }

  function openMenu() {
    navLinks.classList.add("mobile-menu-open");

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation menu");
  }

  menuToggle.addEventListener("click", function () {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";

    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  /* Close after choosing a navigation link */

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  /* Close when clicking outside the navbar */

  document.addEventListener("click", function (event) {
    if (
      !event.target.closest(".navbar") &&
      menuToggle.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
    }
  });

  /* Close with Escape */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu();
      menuToggle.focus();
    }
  });

  /* Reset the menu when switching back to desktop */

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1050) {
      closeMenu();
    }
  });
})();

/* =========================================
   MOBILE UNREAD NOTIFICATION BADGE
========================================= */

(function initializeMobileNotificationBadge() {
  const badge = document.getElementById("mobileNotificationBadge");

  if (!badge) return;

  function hideBadge() {
    badge.hidden = true;
    badge.textContent = "0";
    badge.removeAttribute("aria-label");
  }

  function showBadge(count) {
    const unreadCount = Number(count);

    if (!Number.isFinite(unreadCount) || unreadCount <= 0) {
      hideBadge();
      return;
    }

    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = false;
    badge.setAttribute(
      "aria-label",
      `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`,
    );
  }

  async function loadUnreadNotifications() {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      hideBadge();
      return;
    }

    try {
      const response = await fetch(
        `${window.NESTNOTES_API_BASE}/messages/notifications/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        hideBadge();
        return;
      }

      const data = await response.json();

      // Adapt to the response shape returned by your API.
      const notifications = Array.isArray(data)
        ? data
        : Array.isArray(data.notifications)
          ? data.notifications
          : null;

      if (!notifications) {
        hideBadge();
        return;
      }

      // Count unread notifications if the API supplies a read status.
      const hasReadStatus = notifications.some(
        (item) =>
          Object.prototype.hasOwnProperty.call(item, "is_read") ||
          Object.prototype.hasOwnProperty.call(item, "read"),
      );

      if (!hasReadStatus) {
        // Do not claim every notification is unread if the API
        // doesn't provide read/unread information.
        hideBadge();
        return;
      }

      const unreadCount = notifications.filter((item) => {
        const value = item.is_read ?? item.read;

        return value === 0 || value === false || value === "0";
      }).length;

      showBadge(unreadCount);
    } catch (error) {
      console.error("Unable to load notification badge:", error);
      hideBadge();
    }
  }

  loadUnreadNotifications();

  // Refresh when the user returns to the tab.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadUnreadNotifications();
    }
  });
})();
