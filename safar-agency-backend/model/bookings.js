const mongoose = require('mongoose');

const travelBookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobileNo: { type: String, required: true },
  pickupAdd: { type: String, required: true },  // Match with MongoDB field
  dropAdd: { type: String, required: true },    // Match with MongoDB field
  carType: { type: String, required: true },
  tripType: { type: String, required: true },   // Match with MongoDB field
  from: { type: String, required: true },
  to: { type: String, required: true },
  distance: { type: Number, required: false },  // Match with MongoDB field
  fare: { type: Number, required: false },      // Match with MongoDB field
  dateOfBooking: { type: Date, required: false, default:Date.now() },
  bookingStatus: { type: String, required: true },

}, 
{
  collection: 'travels_bookings',  // Exact collection name in MongoDB
  timestamps: true,
});

const TravelBooking = mongoose.model('TravelBooking', travelBookingSchema);

module.exports = TravelBooking;
