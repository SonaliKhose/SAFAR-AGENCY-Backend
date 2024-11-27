const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const User = require("../model/user");
const session = require("express-session");
const cors = require("cors");  // Import cor
require("dotenv").config();
const logger = require('../utils/logger');

const userRouter = express.Router();

userRouter.use(cors({
  origin: 'http://localhost:3000', // Allow your frontend origin
  credentials: true, // Allow credentials (if needed)
  
}));
// Create SES client instance
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure session middleware
userRouter.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
userRouter.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
logger.info("Inside reguster api")
  try {
  
    // Check if a user with the same email already exists (optional)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.error("user Already exists")
      return res.status(400).json({ message: "User already exists" });
    }

    // Create JWT token for verification
    const token = jwt.sign({ username, email, password }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verificationLink = `http://localhost:3000/verify?token=${token}`;
console.log(verificationLink);

    // Send verification email
    const mailOptions = {
      Source: process.env.EMAIL_FROM,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Email Verification", Charset: "UTF-8" },
        Body: {
          Text: {
            Data: `Please verify your email by clicking the link: ${verificationLink}`,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(mailOptions);
    await sesClient.send(command);

    // Respond to client
    res.status(200).json({ message: "Verification email sent! Please check your inbox." });
  } catch (error) {
    logger.error(error)
    res.status(500).json({ message: error.message });
  }
});




userRouter.get("/verify", async (req, res) => {
  console.log("Token received for verification:", req.query.token);
  const { token } = req.query;

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("Decoded token:", decoded);

    const { username, email, password } = decoded;

    // Check if the user already exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // If user doesn't exist, create a new user and save it
    const newUser = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),  // Hash the password before saving
    });

    await newUser.save();

    // Send a success response
    res.status(200).json({ message: "User verified and saved successfully!" });
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});












// User Login with JWT
userRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password with Email Sending (AWS SES)
userRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist" });
    }

    // Generate JWT reset token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Construct the reset password link with token as a query parameter
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    // Log the reset link to the console
    console.log(`Password reset link: ${resetLink}`);

    // Setup email options with token as a query parameter
    const mailOptions = {
      Source: process.env.EMAIL_FROM,
      Destination: { ToAddresses: [user.email] },
      Message: {
        Subject: { Data: "Password Reset Request", Charset: "UTF-8" },
        Body: {
          Text: {
            Data:
              `You have requested to reset your password. Please click the following link to reset your password:\n\n` +
              `http://localhost:3000/reset-password?token=${token}\n\n` +
              `If you did not request this, please ignore this email.`,
            Charset: "UTF-8",
          },
        },
      },
    };

    // Send email using AWS SES
    const command = new SendEmailCommand(mailOptions);
    const response = await sesClient.send(command);
    console.log(`Email sent: ${JSON.stringify(response, null, 2)}`);
    // console.log(token);

    res
      .status(200)
      .json({ message: "Password reset link has been sent to your email" });
  } catch (error) {
    console.error("Error in sending password reset link:", error);
    res.status(500).json({ message: "Error in sending password reset link" });
  }
});

// Reset Password
userRouter.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    //console.log(token);
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully!" });
  } catch (error) {
    console.error("Error in resetting password:", error);
    res.status(500).json({ message: "Error in resetting password" });
  }
});

module.exports = userRouter;
