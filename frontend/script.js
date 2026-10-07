const API_URL =
"https://nestnotes-flat-sharing.onrender.com/api/listings";

const container =
document.getElementById("listingContainer");

const form =
document.getElementById("listingForm");

const searchInput =
document.getElementById("search");

const token =
localStorage.getItem("token");

if (!token) {

    window.location.href =
    "login.html";
}

let listings = [];

let favorites =
JSON.parse(
localStorage.getItem("favorites")
) || [];

async function fetchListings() {

    try {

        document.getElementById("loader").style.display = "block";

        const response =
        await fetch(API_URL);

        listings =
        await response.json();

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

    data.forEach(listing => {
        console.log(listing);
    });

    if(data.length === 0){

    container.innerHTML = `
        <div class="empty-state">
            <h2>No Listings Found</h2>
            <p>Try adding a new listing.</p>
        </div>
    `;

    return;
}

    const listingCount =
    document.getElementById("listingCount");

if (listingCount) {
    listingCount.textContent =
    `${data.length} Listing(s) Found`;
}

const favoriteCount =
document.getElementById("favoriteCount");

if (favoriteCount) {
    favoriteCount.textContent =
    `Saved Listings: ${favorites.length}`;
}

    container.innerHTML = "";

const currentUserId =
localStorage.getItem("userId");

    data.forEach(async listing => {

        const card =
        document.createElement("div");

        card.classList.add("card");

        const isOwner =
        listing.userId === localStorage.getItem("userId");

        console.log("Listing ID:", listing.id);

        console.log("Listing object:", listing);
        console.log("Listing ID:", listing.id);

        const interestCount =
    await getInterestCount(listing.id);

    card.innerHTML = `

    <div class="favorite-btn"
    onclick="toggleFavorite(${listing.id})">
    ${favorites.includes(listing.id) ? "❤️" : "🤍"}
    </div>

    <img
    class="listing-image"
    src="${listing.image || 'https://placehold.co/400x250?text=No+Image'}"
    alt="${listing.title}"
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

   ${isOwner ? `
    <div class="owner-actions">

   <button
    class="edit-btn"
    onclick="editListing(${listing.id})">
    Edit
    </button>

    ${listing.userId === localStorage.getItem("userId") ? `
    <button onclick="viewInterests(${listing.id})">
        View Interests
    </button>
    ` : ""}

    <button
    class="delete-btn"
    onclick="deleteListing(${listing.id})">
    Delete
    </button>

    </div>
    ` : ""}

    </div>
    `;
        
        container.appendChild(card);
    });
}



function toggleFavorite(id) {

    if (favorites.includes(id)) {

        favorites = favorites.filter(
            item => item !== id
        );

    } else {

        favorites.push(id);
    }

    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );

    fetchListings();
}

form.addEventListener(
"submit",
async (e) => {

    e.preventDefault();

    const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
}

    try {

        const imageFile =
        document.getElementById("image")
        .files[0];

        const formData =
        new FormData();

        formData.append(
            "image",
            imageFile
        );

        const uploadResponse =
        await fetch(
            "https://nestnotes-flat-sharing.onrender.com/api/listings/upload",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            }
        );

        const uploadData =
        await uploadResponse.json();

        const newListing = {
            title: document.getElementById("title").value,
            rent: document.getElementById("rent").value,
            location: document.getElementById("location").value,
            category: document.getElementById("category").value,
            image: uploadData.image,
            description: document.getElementById("description").value
        };

        const response = await fetch(
            API_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newListing)
            }
        );

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

searchInput.addEventListener("input",()=>{

    const keyword =
    searchInput.value.toLowerCase();

    const filtered =
    listings.filter(item=>

        item.title
        .toLowerCase()
        .includes(keyword)

        ||

        item.location
        .toLowerCase()
        .includes(keyword)
    );

    displayListings(filtered);
});

async function deleteListing(id){

    const token =
    localStorage.getItem("token");

    if(!confirm("Delete this listing?")){
        return;
    }

    try{

        const response =
        await fetch(
            `${API_URL}/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data =
        await response.json();

        console.log(data);

        fetchListings();

    }catch(error){

        console.error(error);
    }
}

async function editListingPrompt(id) {

    const listing =
    listings.find(item => item.id === id);

    if (!listing) return;

    const title =
    prompt("Title", listing.title);

    const rent =
    prompt("Rent", listing.rent);

    const location =
    prompt("Location", listing.location);

    const image =
    prompt("Image URL", listing.image);

    const description =
    prompt("Description", listing.description);

    try {

        await fetch(
            `${API_URL}/${id}`,
            {
                method: "PUT",

                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

                body: JSON.stringify({
                    title,
                    rent,
                    location,
                    description
                })
            }
        );

        fetchListings();

    } catch (error) {

        console.error(error);
    }
}

async function expressInterest(id, button) {

    const token = localStorage.getItem("token");

    try {

        const response = await fetch(
            "https://nestnotes-flat-sharing.onrender.com/api/interests",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    listingId: id
                })
            }
        );

        if (!response.ok) {

    const data = await response.json();

    alert(data.message);

    return;
}

        button.innerText = "Interested ✓";
        button.style.background = "#28a745";
        button.disabled = true;

    } catch (error) {

        console.error(error);
        alert("Unable to express interest");

    }
}

fetchListings();
loadStats();

document
.getElementById("sortRent")
.addEventListener("change", e => {

    let sorted = [...listings];

    if (e.target.value === "low") {

        sorted.sort(
            (a, b) => a.rent - b.rent
        );

    } else if (
        e.target.value === "high"
    ) {

        sorted.sort(
            (a, b) => b.rent - a.rent
        );
    }

    displayListings(sorted);
});

document
.getElementById("categoryFilter")
.addEventListener("change", e => {

    const category = e.target.value;

    if (
        category === "All Categories" ||
        category === ""
    ) {
        displayListings(listings);
        return;
    }

    const filtered =
    listings.filter(item =>
        item.category === category
    );

    displayListings(filtered);
});

async function loadStats(){

    const response = await fetch(
        "https://nestnotes-flat-sharing.onrender.com/api/listings/stats/summary"
    );

    const stats = await response.json();

    document.getElementById("totalListings").textContent =
        stats.totalListings || 0;

    document.getElementById("averageRent").textContent =
        "₹" + Math.round(stats.averageRent || 0);

    document.getElementById("highestRent").textContent =
        "₹" + (stats.highestRent || 0);
}

const logoutBtn =
document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("userId");

            window.location.href =
            "login.html";
        }
    );
}


const toggleBtn =
document.getElementById("toggleFormBtn");

const formContainer =
document.getElementById("formContainer");
formContainer.style.display = "none";

toggleBtn.addEventListener("click", () => {

    if(formContainer.style.display === "none"){
        formContainer.style.display = "block";

        toggleBtn.textContent =
        "− Hide Form";

    }else{

        formContainer.style.display = "none";
        toggleBtn.textContent =
        "+ Add New Listing";
    }
});

function logout(){

    localStorage.removeItem("token");
    localStorage.removeItem("userId");

    window.location.href = "login.html";
}

const authToken =
localStorage.getItem("token");

if(authToken){

    document.querySelector(
        'a[href="login.html"]'
    ).style.display = "none";

    document.querySelector(
        'a[href="register.html"]'
    ).style.display = "none";

}

function editListing(id) {
    console.log("Edit clicked, ID =", id);

    if (!id) {
        alert("Listing ID is missing!");
        return;
    }

    window.location.href =
        `edit-listing.html?id=${id}`;
}

async function viewInterests(id){

    try{

        const response =
        await fetch(
            `https://nestnotes-flat-sharing.onrender.com/api/interests/listing/${id}`
        );

        const interests =
        await response.json();

        let text = "";

    interests.forEach(user => {
    text += `User ID: ${user.userId}\n`;
    });

     alert(text || "No interests yet");

    }catch(error){

        console.error(error);

        alert("Unable to load interests");
    }
}

async function viewMessages(listingId) {

    try {

        const response =
        await fetch(
            `https://nestnotes-flat-sharing.onrender.com/api/messages/${listingId}`
        );

        const messages =
        await response.json();

        if(messages.length === 0){

            alert("No messages yet");

            return;
        }

        let text = "";

        messages.forEach(msg => {

            text +=
            `${msg.sender}: ${msg.text}\n`;
        });

        alert(text);

    } catch(error){

        console.error(error);

        alert("Unable to load messages");
    }
}

async function getInterestCount(listingId) {

    try {

        const response = await fetch(
            `https://nestnotes-flat-sharing.onrender.com/api/interests/count/${listingId}`
        );

        const data = await response.json();

        return data.count;

    } catch (error) {

        console.error(error);

        return 0;
    }
}

function openChatPage(listingId){

    window.location.href =
    `chat.html?listingId=${listingId}`;
}
