const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const carSchema = new Schema(
  {
    image: {
      type: String,
      required: true,
    },
    carName: {
      type: String,
    },
    carType: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    pricePerKm: {
      type: Number,
    },

    travelUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Car", carSchema);
