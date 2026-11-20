require("dotenv").config();
const request = require("supertest");
const jwt = require("jsonwebtoken");

describe("Listings security", () => {
  let app;
  let mockDb;

  beforeAll(() => {
    jest.resetModules();

    // Mock database: protects real listing records.
    mockDb = {
      get: jest.fn((sql, params, callback) => {
        callback(null, {
          id: 7,
          user_id: 1,
        });
      }),
      all: jest.fn(),
      run: jest.fn(),
    };

    jest.doMock("../database", () => mockDb);

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from backend/.env");
    }

    app = require("../server");
  });

  afterAll(() => {
    jest.dontMock("../database");
    jest.resetModules();
  });

  test("User A cannot delete User B's listing", async () => {
    const token = jwt.sign({ id: 3 }, process.env.JWT_SECRET);

    const response = await request(app)
      .delete("/api/listings/7")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Not authorized.");

    const deleteCalls = mockDb.run.mock.calls.filter(([sql]) =>
      /^\s*DELETE\s+FROM\s+listings\b/i.test(sql),
    );

    expect(deleteCalls).toHaveLength(0);
  });

  test("User A cannot update User B's listing", async () => {
    const token = jwt.sign({ id: 3 }, process.env.JWT_SECRET);

    const response = await request(app)
      .put("/api/listings/7")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Unauthorized Update",
        rent: 6000,
        location: "Bengaluru",
        category: "Single Room",
        image: "",
        description: "Security test",
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Not authorized.");

    const updateCalls = mockDb.run.mock.calls.filter(([sql]) =>
      /^\s*UPDATE\s+listings\b/i.test(sql),
    );

    expect(updateCalls).toHaveLength(0);
  });

  test("Ordinary users cannot access admin listings", async () => {
    const token = jwt.sign(
      {
        id: 3,
        email: "user@example.com",
        role: "user",
      },
        process.env.JWT_SECRET,
    );

    const response = await request(app)
      .get("/api/admin/listings")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Admin access required.");

    // The database must not be queried for admin listings.
    expect(mockDb.all).not.toHaveBeenCalled();
  });
});
