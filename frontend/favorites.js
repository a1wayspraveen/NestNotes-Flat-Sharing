const API_BASE_URL = window.NESTNOTES_API_BASE.replace(/\/api$/, "");

const API_URL = `${API_BASE_URL}/api/listings`;

const container = document.getElementById("favoriteContainer");

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

async function loadFavorites() {
  try {
    const response = await fetch(API_URL);

    const listings = await response.json();

    const favoriteListings = listings.filter((listing) =>
      favorites.includes(listing.id),
    );

    displayFavorites(favoriteListings);
  } catch (error) {
    console.error(error);
  }
}

function displayFavorites(data) {
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
            <h2>
                No favorite listings yet.
            </h2>
        `;

    return;
  }

  data.forEach((listing) => {
    const imageUrl = listing.image
      ? listing.image.startsWith("http")
        ? listing.image.replace(
            "https://nestnotes-flat-sharing.onrender.com",
            API_BASE_URL,
          )
        : `${API_BASE_URL}${listing.image.startsWith("/") ? "" : "/"}${listing.image}`
      : "https://placehold.co/400x250";

    container.innerHTML += `
            <div class="card">

                <img
                class="listing-image"
                src="${imageUrl}"
                alt="${listing.title}"
                >

                <h3>
                    ${listing.title}
                </h3>

                <p>
                    ₹${listing.rent}/month
                </p>

                <p>
                    📍 ${listing.location}
                </p>

                <button
                onclick="
                window.location.href=
                'details.html?id=${listing.id}'
                ">
                View Details
                </button>

                <button
                onclick="
                removeFavorite(${listing.id})
                ">
                Remove ❤️
                </button>

            </div>
        `;
  });
}

function removeFavorite(id) {
  favorites = favorites.filter((fav) => fav !== id);

  localStorage.setItem("favorites", JSON.stringify(favorites));

  loadFavorites();
}

loadFavorites();
