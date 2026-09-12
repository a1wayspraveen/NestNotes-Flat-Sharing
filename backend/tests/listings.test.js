const request = require("supertest");
const app = require("../server");

describe("Listings API", () => {

  test("GET /api/listings should return all listings", async () => {
    const res = await request(app).get("/api/listings");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/listings/1 should return a listing", async () => {
    const res = await request(app).get("/api/listings/1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title");
    expect(res.body).toHaveProperty("price");
  });

});