// userModel.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../model/user'); // Adjust this path as necessary

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Ensure indexes are created
  await User.init();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('User Model Test', () => {
  it('should create a user with required fields', async () => {
    const userData = { username: 'testuser', email: 'test@example.com', password: 'testpassword' };
    const validUser = new User(userData);
    const savedUser = await validUser.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
  });

  it('should fail to create a user without required fields', async () => {
    const userWithoutRequiredFields = new User({ username: 'testuser' });
    let err;
    try {
      await userWithoutRequiredFields.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it('should not allow duplicate email', async () => {
    const userData1 = { username: 'testuser1', email: 'test@example.com', password: 'password1' };
    const userData2 = { username: 'testuser2', email: 'test@example.com', password: 'password2' };
    await new User(userData1).save();
    
    let err;
    try {
      await new User(userData2).save();
    } catch (error) {
      err = error;
    }

    // Check if error is defined and has the expected duplicate key error code
    expect(err).toBeDefined();
    expect(err).toBeInstanceOf(mongoose.mongo.MongoServerError);
    expect(err.code).toBe(11000); // Duplicate key error code for MongoDB
  });
});
