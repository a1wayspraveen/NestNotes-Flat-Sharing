const params =
new URLSearchParams(window.location.search);

const userId =
params.get("id");

async function loadProfile() {

    const response =
    await fetch(
        `https://nestnotes-flat-sharing.onrender.com/api/profile/${userId}`
    );

    const profile =
    await response.json();

    const container =
    document.getElementById("profileContainer");

    container.innerHTML = `
        <p><strong>Age:</strong> ${profile.age || "Not specified"}</p>

        <p><strong>Gender:</strong> ${profile.gender || "Not specified"}</p>

        <p><strong>Occupation:</strong> ${profile.occupation || "Not specified"}</p>

        <p><strong>Budget:</strong> ₹${profile.budget || "Not specified"}</p>

        <p><strong>Food Preference:</strong> ${profile.food_preference || "Not specified"}</p>

        <p><strong>Smoking:</strong> ${profile.smoking || "Not specified"}</p>

        <p><strong>Drinking:</strong> ${profile.drinking || "Not specified"}</p>

        <p><strong>Bio:</strong></p>

        <p>${profile.bio || "No bio available"}</p>
    `;
}

document
.getElementById("messageBtn")
.addEventListener("click", () => {

    window.location.href =
    `chat.html?userId=${userId}`;
});

loadProfile();