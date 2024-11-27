const express = require("express");
const bookingRouter = express.Router();
const TravelBooking = require("../model/bookings"); // Ensure correct model import
const auth = require("../middlewear/auth"); // Correct path to the auth middleware

// GET /api/travel-bookings - Fetch all travel bookings
bookingRouter.get("/", auth, async (req, res) => {
  try {
    const bookings = await TravelBooking.find(); // Fetch all documents from collection
    res.status(200).json(bookings); // Send the data as JSON
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bookings. Please try again later." });
  }
});

// PUT /api/travel-bookings/:id - Update a specific travel booking by ID
bookingRouter.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { bookingStatus } = req.body; // Assuming you're updating the booking status

  if (!bookingStatus) {
    return res.status(400).json({ message: "Booking status is required." });
  }

  try {
    // Find the booking by ID and update the booking status
    const updatedBooking = await TravelBooking.findByIdAndUpdate(
      id,
      { bookingStatus }, // Update the booking status with the new value
      { new: true } // Return the updated booking
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res
      .status(200)
      .json({
        message: "Booking updated successfully.",
        booking: updatedBooking,
      });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating booking. Please try again later." });
  }
});

module.exports = bookingRouter;