const API_URL =
"https://nestnotes-flat-sharing.onrender.com/api/listings";

const params =
new URLSearchParams(window.location.search);

const id = params.get("id");

if (!id) {
    alert("Listing not found");
    window.location.href = "index.html";
}

fetch(`${API_URL}/${id}`)
.then(res => res.json())
.then(listing => {

    document.getElementById("title").textContent =
        listing.title;

    document.getElementById("rent").textContent =
        listing.rent;

    document.getElementById("location").textContent =
        listing.location;

    document.getElementById("category").textContent =
        listing.category;

    document.getElementById("description").textContent =
        listing.description;

    document.getElementById("propertyImage").src =
        listing.image ||
        "https://via.placeholder.com/800x400?text=No+Image";
});