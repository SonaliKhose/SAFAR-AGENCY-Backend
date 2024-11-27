const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Unique username for the user
  email: { type: String, required: true, unique: true },    // Unique email for the user
  password: { type: String, required: true },               // Password for authentication
 
}, { timestamps: true });

const User = mongoose.model('TravelUser', userSchema);
module.exports = User;
