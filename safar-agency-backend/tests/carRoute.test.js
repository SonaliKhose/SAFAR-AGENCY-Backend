// carRouter.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const carRouter = require('../routes/cars'); // Adjust the path as needed
const Car = require('../model/cars'); // Adjust the path as needed
const User = require('../model/user'); // Adjust the path as needed
const { uploadToS3, deleteFromS3 } = require('../middlewear/upload'); // Mock these functions

const app = express();
app.use(express.json()); // Middleware to parse JSON
app.use('/cars', carRouter);

// Mocking the S3 upload and delete functions
jest.mock('../middlewear/upload', () => ({
  uploadToS3: jest.fn(),
  deleteFromS3: jest.fn(),
}));

// Mock authentication middleware
jest.mock('../middlewear/auth', () => (req, res, next) => {
  req.user = { id: 'testUserId' }; // Mock user ID
  next();
})

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

describe('Car Router', () => {
  let user;
  let car;

  beforeEach(async () => {
    // Create a sample user before each test
    user = await User.create({
      _id: 'testUserId',
      name: 'Test User',
      email: 'test@example.com',
      // Include any other fields that your model requires
    });

    // Create a sample car before each test
    car = await Car.create({
      carName: 'Test Car',
      carType: 'SUV',
      price: 10000,
      pricePerKm: 5,
      travelUserId: user._id,
      image: 'https://example.com/test-car.jpg', // Mock image URL
    });
  });

  afterEach(async () => {
    await Car.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/cars/create', () => {
    it('should create a new car', async () => {
      const response = await request(app)
        .post('/cars/create')
        .set('Content-Type', 'multipart/form-data')
        .field('carName', 'New Car')
        .field('carType', 'Sedan')
        .field('price', 12000)
        .field('pricePerKm', 6)
        .field('travelUserId', user._id)
        .attach('image', 'path/to/test-image.jpg'); // Provide an actual image file path

      expect(response.status).toBe(201);
      expect(response.body.carName).toBe('New Car');
      expect(response.body.carType).toBe('Sedan');
      expect(uploadToS3).toHaveBeenCalled(); // Check if uploadToS3 was called
    });

    it('should return 400 if image is missing', async () => {
      const response = await request(app)
        .post('/cars/create')
        .send({
          carName: 'New Car',
          carType: 'Sedan',
          price: 12000,
          pricePerKm: 6,
          travelUserId: user._id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Image file is required');
    });

    it('should return 400 if user ID is invalid', async () => {
      const response = await request(app)
        .post('/cars/create')
        .set('Content-Type', 'multipart/form-data')
        .field('carName', 'New Car')
        .field('carType', 'Sedan')
        .field('price', 12000)
        .field('pricePerKm', 6)
        .field('travelUserId', 'invalidUserId')
        .attach('image', 'path/to/test-image.jpg'); // Provide an actual image file path

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User ID is invalid');
    });

    it('should return 500 on creation error', async () => {
      jest.spyOn(User, 'findById').mockResolvedValueOnce(null); // Mock user not found
      const response = await request(app)
        .post('/cars/create')
        .set('Content-Type', 'multipart/form-data')
        .field('carName', 'New Car')
        .field('carType', 'Sedan')
        .field('price', 12000)
        .field('pricePerKm', 6)
        .field('travelUserId', user._id)
        .attach('image', 'path/to/test-image.jpg'); // Provide an actual image file path

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to create car');
    });
  });

  describe('GET /cars/:travelUserId', () => {
    it('should get cars by user ID', async () => {
      const response = await request(app).get(`/api/cars/${user._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1); // Should return one car
      expect(response.body[0].carName).toBe(car.carName);
    });

    it('should return 404 if user ID is invalid', async () => {
      const response = await request(app).get('/api/cars/invalidUserId');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Invalid userId, user not found');
    });

    it('should return 404 if no cars found for the user', async () => {
      await Car.deleteMany({}); // Delete the existing car

      const response = await request(app).get(`/api/cars/${user._id}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No cars found for this userId');
    });

    it('should return 500 on fetch error', async () => {
      jest.spyOn(User, 'findById').mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(`/api/cars/${user._id}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to retrieve cars');
    });
  });

  describe('PUT /cars/:carId', () => {
    it('should update a car', async () => {
      const response = await request(app)
        .put(`/cars/${car._id}`)
        .set('Content-Type', 'multipart/form-data')
        .field('carName', 'Updated Car')
        .field('carType', 'Coupe')
        .field('price', 13000)
        .field('pricePerKm', 7)
        .attach('image', 'path/to/test-image.jpg'); // Provide an actual image file path

      expect(response.status).toBe(200);
      expect(response.body.carName).toBe('Updated Car');
      expect(deleteFromS3).toHaveBeenCalledWith(car.image); // Check if the old image is deleted
      expect(uploadToS3).toHaveBeenCalled(); // Check if a new image is uploaded
    });

    it('should return 404 if car not found', async () => {
      const response = await request(app).put('/api/cars/invalidCarId')
        .send({ carName: 'Updated Car' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Car not found');
    });

    it('should return 500 on update error', async () => {
      jest.spyOn(Car, 'findById').mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/cars/${car._id}`)
        .set('Content-Type', 'multipart/form-data')
        .field('carName', 'Updated Car')
        .attach('image', 'path/to/test-image.jpg'); // Provide an actual image file path

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to update car');
    });
  });

  describe('DELETE /cars/:carId', () => {
    it('should delete a car', async () => {
      const response = await request(app).delete(`/api/cars/${car._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Car deleted successfully');
      expect(deleteFromS3).toHaveBeenCalledWith(car.image); // Check if the image is deleted
    });

    it('should return 404 if car not found', async () => {
      const response = await request(app).delete('/api/cars/invalidCarId');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Car not found');
    });

    it('should return 500 on deletion error', async () => {
      jest.spyOn(Car, 'findByIdAndDelete').mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete(`/api/cars/${car._id}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to delete car');
    });
  });
});
