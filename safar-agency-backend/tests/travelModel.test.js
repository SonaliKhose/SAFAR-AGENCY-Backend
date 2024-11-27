// travelModel.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Travel = require('../model/travel'); // Adjust path as needed
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
  await Travel.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Travel Model Test', () => {
  let user;

  beforeEach(async () => {
    // Create a user to associate with travelUserId
    user = await User.create({ username: 'testuser', email: 'user@example.com', password: 'testpassword' });
  });

  afterEach(async () => {
    // Clear Travel and User collections after each test
    await Travel.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a Travel document with required fields', async () => {
    const travelData = {
      name: 'Test Travel Agency',
      email: 'contact@travelagency.com',
      travelUserId: user._id, // Reference to the user
    };

    const travelDoc = new Travel(travelData);
    const savedTravel = await travelDoc.save();

    expect(savedTravel._id).toBeDefined();
    expect(savedTravel.name).toBe(travelData.name);
    expect(savedTravel.email).toBe(travelData.email);
    expect(savedTravel.travelUserId).toEqual(user._id);
  });

  it('should fail to create a Travel document without required fields', async () => {
    const travelData = { email: 'contact@travelagency.com' }; // Missing 'name' and 'travelUserId'
    let err;
    try {
      await new Travel(travelData).save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.travelUserId).toBeDefined();
  });

  it('should allow optional fields to be saved', async () => {
    const travelData = {
      name: 'Optional Fields Travel',
      email: 'optional@travelagency.com',
      contactNo: '1234567890',
      city: 'CityName',
      state: 'StateName',
      address: '123 Street Name',
      country: 'CountryName',
      pincode: '000000',
      travelUserId: user._id,
    };

    const travelDoc = new Travel(travelData);
    const savedTravel = await travelDoc.save();

    expect(savedTravel.contactNo).toBe(travelData.contactNo);
    expect(savedTravel.city).toBe(travelData.city);
    expect(savedTravel.state).toBe(travelData.state);
    expect(savedTravel.address).toBe(travelData.address);
    expect(savedTravel.country).toBe(travelData.country);
    expect(savedTravel.pincode).toBe(travelData.pincode);
  });
});
