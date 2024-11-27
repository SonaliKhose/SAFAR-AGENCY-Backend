const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
  logo: { type: String, required: false }, // URL or path to the uploaded image
  name: { type: String, required: true },
  email: { type: String, required: true },
  contactNo: { type: String, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  address: { type: String, required: false },
  country: { type: String, required: false },  
  pincode: { type: String, required: false },
  travelUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Store reference to user who created it
}, { timestamps: true });

const Travel = mongoose.model('TravelDetails', travelSchema);
module.exports = Travel;
