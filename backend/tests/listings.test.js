const request = require("supertest");
const app = require("../server");

describe("Listings API", () => {
    test("GET /api/listings returns 200", async () => {
        const response = await request(app)
            .get("/api/listings");

        expect(response.statusCode).toBe(200);
    });

    test("DELETE /api/listings/:id rejects requests without a token", async () => {
        const response = await request(app)
            .delete("/api/listings/7");

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe(
            "Access denied. No token provided."
        );
    });
});
