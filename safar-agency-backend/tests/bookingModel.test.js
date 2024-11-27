// bookingRouter.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const bookingRouter = require('../model/bookings'); // Adjust path as needed
const TravelBooking = require('../model/travel'); // Adjust path as needed
const auth = require('../middlewear/auth'); // Adjust path as needed

const app = express();
app.use(express.json()); // Middleware to parse JSON
app.use('/travelbookings', bookingRouter);

// Mock authentication middleware
jest.mock('../middlewear/auth', () => (req, res, next) => {
  req.user = { id: 'testUserId' }; // Mock user ID
  next();
});

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Booking Router', () => {
  let booking;

  beforeEach(async () => {
    // Adjust the fields to match your TravelBooking model
    booking = await TravelBooking.create({
      bookingStatus: 'Pending',
      travelUserId: 'testUserId', // Ensure this is set
      email: 'test@example.com', // Ensure this is set
      name: 'Test Traveler', // Ensure this is set
      // Include other necessary fields for your TravelBooking model
    });
  });

  afterEach(async () => {
    await TravelBooking.deleteMany({});
  });

  describe('GET /travelbookings', () => {
    it('should fetch all travel bookings', async () => {
      const response = await request(app).get('/travelbookings');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1); // Should return one booking
      expect(response.body[0].bookingStatus).toBe(booking.bookingStatus);
    });

    it('should return 500 if fetching bookings fails', async () => {
      jest.spyOn(TravelBooking, 'find').mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/travelbookings');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to fetch bookings. Please try again later.');
    });
  });

  describe('PUT /travelbookings/:id', () => {
    it('should update a booking status', async () => {
      const response = await request(app)
        .put(`/travelbookings/${booking._id}`)
        .send({ bookingStatus: 'Confirmed' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Booking updated successfully.');
      expect(response.body.booking.bookingStatus).toBe('Confirmed');
    });

    it('should return 400 if booking status is missing', async () => {
      const response = await request(app)
        .put(`/travelbookings/${booking._id}`)
        .send({}); // No bookingStatus sent

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Booking status is required.');
    });

    it('should return 404 if booking not found', async () => {
      const response = await request(app)
        .put(`/travelbookings/invalidBookingId`)
        .send({ bookingStatus: 'Confirmed' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Booking not found.');
    });

    it('should return 500 if updating booking fails', async () => {
      jest.spyOn(TravelBooking, 'findByIdAndUpdate').mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/travelbookings/${booking._id}`)
        .send({ bookingStatus: 'Confirmed' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error updating booking. Please try again later.');
    });
  });
});
