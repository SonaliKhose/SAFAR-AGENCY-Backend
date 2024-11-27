// carModel.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Car = require('../model/cars'); // Adjust path as needed
const User = require('../model/user'); // Adjust path as needed

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Ensure indexes are created for unique fields
  await Car.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Car Model Test', () => {
  let user;

  beforeEach(async () => {
    // Create a user to associate with travelUserId
    user = await User.create({ username: 'testuser', email: 'user@example.com', password: 'testpassword' });
  });

  afterEach(async () => {
    // Clear Car and User collections after each test
    await Car.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a Car document with required fields', async () => {
    const carData = {
      image: 'car-image-url.jpg',
      carType: 'SUV',
      price: 5000,
      travelUserId: user._id, // Reference to the user
    };

    const carDoc = new Car(carData);
    const savedCar = await carDoc.save();

    expect(savedCar._id).toBeDefined();
    expect(savedCar.image).toBe(carData.image);
    expect(savedCar.carType).toBe(carData.carType);
    expect(savedCar.price).toBe(carData.price);
    expect(savedCar.travelUserId).toEqual(user._id);
  });

  it('should fail to create a Car document without required fields', async () => {
    const carData = { carType: 'Sedan', travelUserId: user._id }; // Missing 'image' and 'price'
    let err;
    try {
      await new Car(carData).save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.image).toBeDefined();
    expect(err.errors.price).toBeDefined();
  });

  it('should allow optional fields to be saved', async () => {
    const carData = {
      image: 'optional-car-image-url.jpg',
      carName: 'Test Car',
      carType: 'Sedan',
      price: 4000,
      pricePerKm: 10,
      travelUserId: user._id,
    };

    const carDoc = new Car(carData);
    const savedCar = await carDoc.save();

    expect(savedCar.carName).toBe(carData.carName);
    expect(savedCar.pricePerKm).toBe(carData.pricePerKm);
  });
});
