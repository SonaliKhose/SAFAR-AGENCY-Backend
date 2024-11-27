const express = require("express");
const Car = require("../model/cars");
const Travel = require("../model/travel");
const User = require("../model/user");
const { upload, uploadToS3, deleteFromS3 } = require("../middlewear/upload");
const carRouter = express.Router();
const auth = require("../middlewear/auth");

// POST to create a new car
carRouter.post("/create", auth, upload.single("image"), async (req, res) => {
  try {
    const { carName, carType, price, pricePerKm, travelUserId } = req.body;

    // Check if the image file is present
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    // Ensure the User collection has a valid userId
    const user = await User.findById(travelUserId);
    if (!user) {
      return res.status(400).json({ message: "User ID is invalid" });
    }

    // Upload the image to S3
    const imageUploadResponse = await uploadToS3(req.file);

    // Create a new Car entry
    const newCar = new Car({
      image: imageUploadResponse.Location, // Use the S3 image URL from the response
      carName,
      carType,
      price,
      pricePerKm,
      travelUserId, // Store the userId, not travelUserId
    });

    const savedCar = await newCar.save();
    res.status(201).json(savedCar);
  } catch (error) {
    console.error("Error creating car:", error);
    res
      .status(500)
      .json({ message: "Failed to create car", error: error.message });
  }
});

// GET all cars by userId
carRouter.get("/:travelUserId", auth, async (req, res) => {
  try {
    const { travelUserId } = req.params;

    // Validate if the userId exists in the User collection
    const user = await User.findById(travelUserId);
    if (!user) {
      return res
        .status(404)
        .json({ message: "Invalid userId, user not found" });
    }

    // Find cars by userId
    const cars = await Car.find({ travelUserId });

    if (cars.length === 0) {
      return res.status(404).json({ message: "No cars found for this userId" });
    }

    // Return the list of cars
    res.status(200).json(cars);
  } catch (error) {
    console.error("Error fetching cars by userId:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve cars", error: error.message });
  }
});

// UPDATE car by carId (including image)
carRouter.put("/:carId", auth, upload.single("image"), async (req, res) => {
  try {
    const { carId } = req.params;
    const { carName, carType, price, pricePerKm } = req.body;

    // Find the car by carId
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    // Update the fields
    car.carName = carName || car.carName;
    car.carType = carType || car.carType;
    car.price = price || car.price;
    car.pricePerKm = pricePerKm || car.pricePerKm;

    // If a new image is uploaded, update the image and delete the old one from S3
    if (req.file) {
      // Delete the old image from S3
      await deleteFromS3(car.image);

      // Upload the new image to S3
      const imageUploadResponse = await uploadToS3(req.file);
      car.image = imageUploadResponse.Location; // Update the image URL in the car document
    }

    const updatedCar = await car.save();
    res.status(200).json(updatedCar);
  } catch (error) {
    console.error("Error updating car:", error);
    res
      .status(500)
      .json({ message: "Failed to update car", error: error.message });
  }
});

// DELETE car by carId (including image)
carRouter.delete("/:carId", auth, async (req, res) => {
  try {
    const { carId } = req.params;

    // Find the car by carId
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    // Delete the image from S3
    await deleteFromS3(car.image);

    // Delete the car from the database
    await Car.findByIdAndDelete(carId); // Corrected line
    res.status(200).json({ message: "Car deleted successfully" });
  } catch (error) {
    console.error("Error deleting car:", error);
    res
      .status(500)
      .json({ message: "Failed to delete car", error: error.message });
  }
});

module.exports = carRouter;
