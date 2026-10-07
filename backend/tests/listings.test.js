const request = require("supertest");
const app = require("../server");

describe("Listings API", () => {

    test("GET /api/listings returns 200", async () => {

        const response =
            await request(app)
                .get("/api/listings");

        expect(response.statusCode)
            .toBe(200);
    });

});