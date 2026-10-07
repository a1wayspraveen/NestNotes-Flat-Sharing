const form = document.getElementById("profileForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const token = localStorage.getItem("token");

    const profile = {
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        occupation: document.getElementById("occupation").value,
        budget: document.getElementById("budget").value,
        food_preference: document.getElementById("food_preference").value,
        smoking: document.getElementById("smoking").value,
        drinking: document.getElementById("drinking").value,
        bio: document.getElementById("bio").value
    };

    const response = await fetch(
        "http://localhost:3000/api/profile",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(profile)
        }
    );

    const data = await response.json();

    alert(data.message);
});