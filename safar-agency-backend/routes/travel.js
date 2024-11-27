const express = require("express");
const Travel = require("../model/travel");
const session = require("express-session");
const multer = require("multer");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const { randomUUID } = require("crypto");
const auth = require('../middlewear/auth'); 

const travelRouter = express.Router();

// AWS S3 configuration using SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer storage configuration using memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to upload to S3
const uploadToS3 = async (file) => {
  const uniqueSuffix = Date.now() + "-" + randomUUID();
  const fileName = `images/travel-logos/${uniqueSuffix}${path.extname(file.originalname)}`; // Updated to include folder structure
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME, // Replace with your S3 bucket name
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  
  await s3Client.send(command);

  // Get public URL of the uploaded file
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};

const deleteFromS3 = async (logoUrl) => {
  // Remove the base S3 URL to get the file path in S3
  const filePath = logoUrl.replace(`https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`, '');

  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filePath,  // Use the correct file path for deletion
  });

  try {
    await s3Client.send(command);
   // console.log(`Deleted file from S3: ${filePath}`);
  } catch (error) {
    console.error(`Error deleting from S3: ${error.message}`);
  }
};

// Initialize session
travelRouter.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Create a new travel agency with userId and logo upload to AWS S3
travelRouter.post("/",auth, upload.single("logo"), async (req, res) => {
  try {
    const logoUrl = req.file ? await uploadToS3(req.file) : null;
    const travelData = {
      logo: logoUrl, // URL from S3
      name: req.body.name,
      email: req.body.email,
      contactNo: req.body.contactNo,
      city: req.body.city,
      state: req.body.state,
      address: req.body.address,
      country: req.body.country,
      pincode: req.body.pincode,
      travelUserId: req.body.travelUserId, // Capture userId from request body
    };

    const travel = new Travel(travelData);
    await travel.save();

    // Store the newly created travel ID in the session
    req.session.travelUserId = travel._id;

    res.status(201).json(travel);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all travel agencies
travelRouter.get("/",auth, async (req, res) => {
  try {
    const travels = await Travel.find();
    res.status(200).json(travels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get travel agencies by user ID
travelRouter.get("/:travelUserId",auth, async (req, res) => {
  const travelUserId = req.params.travelUserId;
  try {
    const travels = await Travel.find({ travelUserId }); // Fetch travels for the specific userId
    if (!travels || travels.length === 0) {
      return res.status(404).json({ message: "No travel agencies found for this user" });
    }
    res.status(200).json(travels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

travelRouter.put("/:travelUserId",auth, upload.single("logo"), async (req, res) => {
  try {
    const userIdFromParams = req.params.travelUserId;

    // Fetch the existing travel agency using the userId
    const travel = await Travel.findOne({ travelUserId: userIdFromParams });
    if (!travel) {
      return res.status(404).json({ message: "Travel agency not found for this user" });
    }

    // Prepare the updated data object
    const updatedData = {
      name: req.body.name,
      email: req.body.email,
      contactNo: req.body.contactNo,
      city: req.body.city,
      state: req.body.state,
      address: req.body.address,
      country: req.body.country,
      pincode: req.body.pincode,
    };

    // Check if a new logo is uploaded
    if (req.file) {
      // If there's an existing logo, delete it from S3
      if (travel.logo) {
        //console.log(`Deleting old logo: ${travel.logo}`);
        await deleteFromS3(travel.logo); // Ensure you delete the old logo
      }

      // Upload new logo and set the URL
      updatedData.logo = await uploadToS3(req.file);
     // console.log(`Uploaded new logo: ${updatedData.logo}`);
    }

    // Update the travel agency in the database
    const updatedTravel = await Travel.findOneAndUpdate(
      { travelUserId: userIdFromParams },
      { $set: updatedData },  // Ensure full update
      { new: true }  // Return the updated document
    );

    //console.log("Successfully updated travel agency:", updatedTravel);
    res.status(200).json(updatedTravel);
  } catch (error) {
    console.error("Error updating travel agency:", error.message);
    res.status(400).json({ message: error.message });
  }
});



module.exports = travelRouter;
