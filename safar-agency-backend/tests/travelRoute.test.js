const request = require("supertest");
const express = require("express");
const travelRouter = require("../routes/travel");
const Travel = require("../model/travel");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const session = require("express-session");
const auth = require("../middlewear/auth");

// Mock dependencies
jest.mock("@aws-sdk/client-s3");
jest.mock("../middlewear/auth");
jest.mock("../model/travel");

const app = express();
app.use(express.json());
app.use(session({ secret: "test", resave: false, saveUninitialized: true }));
app.use("/travel", travelRouter);

// Mock authentication middleware
auth.mockImplementation((req, res, next) => next());

// Test Suite
describe("Travel Router", () => {
  // Mock S3 upload function
  S3Client.prototype.send = jest.fn().mockImplementation((command) => {
    if (command instanceof PutObjectCommand) {
      return Promise.resolve();
    } else if (command instanceof DeleteObjectCommand) {
      return Promise.resolve();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // POST /api/travel - Create a new travel agency
  describe("POST /travel", () => {
    it("should create a new travel agency with logo upload", async () => {
      const travelData = { name: "Test Travel", travelUserId: "user123" };
      Travel.prototype.save = jest.fn().mockResolvedValue(travelData);

      const response = await request(app)
        .post("/travel")
        .set("Content-Type", "multipart/form-data")
        .field("name", "Test Travel")
        .field("travelUserId", "user123")
        .attach("logo", Buffer.from("filecontent"), "test-logo.png");

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Test Travel");
      expect(Travel.prototype.save).toHaveBeenCalled();
    });

    it("should return 400 if error occurs during creation", async () => {
      Travel.prototype.save = jest.fn().mockRejectedValue(new Error("Save error"));

      const response = await request(app)
        .post("/travel")
        .send({ name: "Test Travel", travelUserId: "user123" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Save error");
    });
  });

  // GET /api/travel - Get all travel agencies
  describe("GET /travel", () => {
    it("should retrieve all travel agencies", async () => {
      const travels = [{ name: "Travel One" }, { name: "Travel Two" }];
      Travel.find = jest.fn().mockResolvedValue(travels);

      const response = await request(app).get("/travel");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(travels);
    });

    it("should return 500 if error occurs", async () => {
      Travel.find = jest.fn().mockRejectedValue(new Error("Find error"));

      const response = await request(app).get("/travel");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Find error");
    });
  });

  // GET /api/travel/:travelUserId - Get travel agencies by user ID
  describe("GET /travel/:travelUserId", () => {
    it("should retrieve travel agency by user ID", async () => {
      const travels = [{ name: "Travel One" }];
      Travel.find = jest.fn().mockResolvedValue(travels);

      const response = await request(app).get("/travel/user123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(travels);
    });

    it("should return 404 if no travel agencies found", async () => {
      Travel.find = jest.fn().mockResolvedValue([]);

      const response = await request(app).get("/travel/user123");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("No travel agencies found for this user");
    });
  });

  // PUT /api/travel/:travelUserId - Update travel agency by user ID
  describe("PUT /travel/:travelUserId", () => {
    it("should update a travel agency with new logo", async () => {
      const travel = { _id: "travelId", name: "Old Travel", logo: "old-logo-url" };
      const updatedTravel = { ...travel, name: "Updated Travel", logo: "new-logo-url" };

      Travel.findOne = jest.fn().mockResolvedValue(travel);
      Travel.findOneAndUpdate = jest.fn().mockResolvedValue(updatedTravel);

      const response = await request(app)
        .put("/travel/user123")
        .send({ name: "Updated Travel" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Updated Travel");
      expect(Travel.findOneAndUpdate).toHaveBeenCalled();
    });

    it("should return 404 if travel agency not found", async () => {
      Travel.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put("/travel/user123")
        .send({ name: "Updated Travel" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Travel agency not found for this user");
    });

    it("should return 400 if error occurs during update", async () => {
      Travel.findOne = jest.fn().mockResolvedValue({});
      Travel.findOneAndUpdate = jest.fn().mockRejectedValue(new Error("Update error"));

      const response = await request(app)
        .put("/travel/user123")
        .send({ name: "Updated Travel" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Update error");
    });
  });
});
