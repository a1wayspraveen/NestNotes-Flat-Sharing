// =========================================
// API CONFIGURATION
// =========================================

const API_BASE_URL = window.NESTNOTES_API_BASE.replace(/\/api$/, "");

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

// =========================================
// LOAD ADMIN LISTINGS
// =========================================

async function loadListings() {
    try {
        const token = localStorage.getItem("token");

        if (!token) {
            alert("Please log in first.");
            return;
        }

        const response = await fetch(`${API_URL}/listings`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401 || response.status === 403) {
            alert("Access denied. Please log in with your admin account.");
            return;
        }

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // Support either an array or an object containing listings.
        const listings = Array.isArray(data)
            ? data
            : data.listings;

        if (!Array.isArray(listings)) {
            throw new Error("Invalid listings response from server.");
        }

        const isVerified = (item) =>
            item.verified === 1 ||
            item.verified === true ||
            item.verified === "1";

        document.getElementById("totalListings").textContent =
            listings.length;

        document.getElementById("verifiedListings").textContent =
            listings.filter(isVerified).length;

        document.getElementById("pendingListings").textContent =
            listings.filter(item => !isVerified(item)).length;

        const table = document.getElementById("listingsTable");

        table.innerHTML = "";

        if (listings.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">No listings available.</td>
                </tr>
            `;
            return;
        }

        listings.forEach((item) => {
            table.innerHTML += `
                <tr>
                    <td>${item.title || "Untitled"}</td>
                    <td>₹${item.rent || 0}</td>
                    <td>${item.location || "Not specified"}</td>

                    <td>
                        ${isVerified(item) ? "✅ Verified" : "❌ Pending"}
                    </td>

                    <td>
                        <button onclick="verifyListing(${item.id})">
                            Verify
                        </button>

                        <button onclick="unverifyListing(${item.id})">
                            Unverify
                        </button>

                        <button onclick="deleteListing(${item.id})">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Admin listings error:", error);
    }
}

// =========================================
// VERIFY LISTING
// =========================================

async function verifyListing(id) {
    try {
        const response = await fetch(`${API_URL}/verify/${id}`, {
            method: "PUT",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            alert("Unable to verify listing. Check admin permissions.");
            return;
        }

        alert("Listing verified successfully!");
        await loadListings();

    } catch (error) {
        console.error("Verify listing error:", error);
    }
}

// =========================================
// UNVERIFY LISTING
// =========================================

async function unverifyListing(id) {
    try {
        const response = await fetch(`${API_URL}/unverify/${id}`, {
            method: "PUT",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            alert("Unable to unverify listing.");
            return;
        }

        alert("Listing unverified successfully!");
        await loadListings();

    } catch (error) {
        console.error("Unverify listing error:", error);
    }
}

// =========================================
// DELETE LISTING
// =========================================

async function deleteListing(id) {
    if (!confirm("Are you sure you want to delete this listing?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/listings/${id}`,
            {
                method: "DELETE",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            alert("Unable to delete listing.");
            return;
        }

        alert("Listing deleted successfully!");
        await loadListings();

    } catch (error) {
        console.error("Delete listing error:", error);
    }
}

// ========================================
// VERIFY USER
// ========================================

async function verifyUser(id) {
    try {
        const response = await fetch(`${API_URL}/users/verify/${id}`, {
            method: "PUT",
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to verify user.");
        }

        alert("User verified successfully!");

        await loadUsers();

    } catch (error) {
        console.error("Verify user error:", error);
        alert(error.message);
    }
}

// =========================================
// ADMIN MOBILE NAVIGATION
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("adminMenuToggle");
    const navLinks = document.getElementById("adminNavLinks");

    if (!menuToggle || !navLinks) return;

    function closeMenu() {
        navLinks.classList.remove("is-open");
        menuToggle.classList.remove("is-active");

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("is-open");

        menuToggle.classList.toggle("is-active", isOpen);

        menuToggle.setAttribute("aria-expanded", String(isOpen));

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );
    });

    navLinks.querySelectorAll("a, button").forEach((item) => {
        item.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
        if (
            !navLinks.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMenu();
        }
    });
});

// =========================================
// INITIALIZE ADMIN DASHBOARD
// =========================================

loadListings();

// ========================================
// USER MANAGEMENT
// ========================================

async function loadUsers() {
    const usersTable = document.getElementById("usersTable");

    if (!usersTable) return;

    usersTable.innerHTML = `
        <tr>
            <td colspan="5">Loading users...</td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Failed to load users (${response.status})`);
        }

        const users = await response.json();

        if (!Array.isArray(users)) {
            throw new Error("Invalid users response.");
        }

        usersTable.innerHTML = "";

        if (users.length === 0) {
            usersTable.innerHTML = `
                <tr>
                    <td colspan="5">No registered users found.</td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = user.name;

            const emailCell = document.createElement("td");
            emailCell.textContent = user.email;

            const roleCell = document.createElement("td");
            roleCell.textContent = user.role;

            const statusCell = document.createElement("td");
            statusCell.textContent =
                Number(user.verified) === 1 ? "Verified" : "Pending";

            const actionCell = document.createElement("td");

            if (user.role !== "admin" && Number(user.verified) !== 1) {
                const button = document.createElement("button");

                button.textContent = "Verify User";
                button.className = "verify-btn";
                button.addEventListener("click", () => verifyUser(user.id));

                actionCell.appendChild(button);
            } else if (user.role === "admin") {
                actionCell.textContent = "Admin Account";
            } else {
                actionCell.textContent = "Already Verified";
            }

            row.append(
                nameCell,
                emailCell,
                roleCell,
                statusCell,
                actionCell
            );

            usersTable.appendChild(row);
        });

    } catch (error) {
        console.error("Load users error:", error);

        usersTable.innerHTML = `
            <tr>
                <td colspan="5">Unable to load users. Check the console.</td>
            </tr>
        `;
    }
}

// Load users when the Admin Dashboard opens.
loadUsers();