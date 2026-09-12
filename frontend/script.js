function searchLocation() {

    const location =
        document.getElementById("searchBox").value;

    if(location === ""){

        alert("Please enter a location");

    }else{

        alert("Searching in " + location);

    }
}


const listings = [

    {
        title:"2BHK Koramangala",
        price:"₹12,000/month",
        image:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700"
    },

    {
        title:"Shared Room HSR",
        price:"₹8,000/month",
        image:"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=700"
    },

    {
        title:"1BHK Indiranagar",
        price:"₹15,000/month",
        image:"https://images.unsplash.com/photo-1494526585095-c41746248156?w=700"
    }
];

const listingContainer =
document.getElementById("listingContainer");

listings.forEach(listing => {

    const card =
    document.createElement("div");

    card.classList.add("card");

    card.innerHTML = `

        <img src="${listing.image}">

        <h3>${listing.title}</h3>

        <p>${listing.price}</p>

        <button>View Details</button>

    `;

    listingContainer.appendChild(card);

});


fetch(
"https://jsonplaceholder.typicode.com/users"
)
.then(response => response.json())
.then(users => {

    const usersContainer =
    document.getElementById("usersContainer");

    users.slice(0,4).forEach(user => {

        const card =
        document.createElement("div");

        card.classList.add("user-card");

        card.innerHTML = `

            <h3>${user.name}</h3>

            <p>${user.email}</p>

            <p>${user.address.city}</p>

        `;

        usersContainer.appendChild(card);

    });

})
.catch(error => {

    console.log(error);

});

