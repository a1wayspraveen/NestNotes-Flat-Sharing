const API_URL =
"https://nestnotes-flat-sharing.onrender.com/api/listings";

const container =
document.getElementById("favoriteContainer");

let favorites =
JSON.parse(
localStorage.getItem("favorites")
) || [];

async function loadFavorites() {

    try {

        const response =
        await fetch(API_URL);

        const listings =
        await response.json();

        const favoriteListings =
        listings.filter(listing =>
            favorites.includes(listing.id)
        );

        displayFavorites(
            favoriteListings
        );

    } catch(error) {

        console.error(error);
    }
}

function displayFavorites(data) {

    container.innerHTML = "";

    if(data.length === 0){

        container.innerHTML = `
            <h2>
                No favorite listings yet.
            </h2>
        `;

        return;
    }

    data.forEach(listing => {

        container.innerHTML += `
            <div class="card">

                <img
                class="listing-image"
                src="${
                    listing.image ||
                    'https://placehold.co/400x250'
                }"
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

function removeFavorite(id){

    favorites =
    favorites.filter(
        fav => fav !== id
    );

    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );

    loadFavorites();
}

loadFavorites();