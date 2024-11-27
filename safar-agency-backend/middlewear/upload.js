const multer = require('multer');
const { PutObjectCommand ,DeleteObjectCommand} = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');
require('dotenv').config();

// Use multer for file handling (stored in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToS3 = async (file) => {
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME, // Ensure this is the correct bucket name
    Key: `images/cars/${Date.now()}-${file.originalname}`, // Use a unique name for the file
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    // Return the S3 URL after upload
    return {
      Location: `https://${uploadParams.Bucket}.s3.amazonaws.com/${uploadParams.Key}`,
      ETag: data.ETag, // Include ETag if needed for validation
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
};


async function deleteFromS3(imageUrl) {
  // Extract file key from the S3 URL
  const imageKey = imageUrl.split('.s3.amazonaws.com/')[1];  // Extract the key part after .s3.amazonaws.com/

  const deleteParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: imageKey, // Use the extracted key, e.g., 'images/cars/your-file.jpg'
  };

  try {
    // Use DeleteObjectCommand to delete the file
    const data = await s3.send(new DeleteObjectCommand(deleteParams));
    console.log("File deleted successfully:", data);
    return data;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file from S3");
  }
}


module.exports = { upload, uploadToS3 ,deleteFromS3};
