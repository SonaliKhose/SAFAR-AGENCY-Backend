const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const User = require("../model/user");
const session = require("express-session");
const cors = require("cors"); 
require("dotenv").config();
const logger = require('../utils/logger');

const userRouter = express.Router();

userRouter.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// AWS SES client setup
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Session configuration
userRouter.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true for production with HTTPS
  })
);

// Register User
userRouter.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  logger.info("Inside register API");
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.error("User already exists");
      return res.status(400).json({ message: "User already exists" });
    }

    const token = jwt.sign({ username, email, password }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verificationLink = `http://localhost:3000/verify?token=${token}`;
    console.log(verificationLink);

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

    res.status(200).json({ message: "Verification email sent! Please check your inbox." });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Verify User
userRouter.get("/verify", async (req, res) => {
  const { token } = req.query;
  console.log("Token received for verification:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { username, email, password } = decoded;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
    });

    await newUser.save();
    res.status(200).json({ message: "User verified and saved successfully!" });
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// User Login
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

// Forgot Password
userRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    console.log(`Password reset link: ${resetLink}`);

    const mailOptions = {
      Source: process.env.EMAIL_FROM,
      Destination: { ToAddresses: [user.email] },
      Message: {
        Subject: { Data: "Password Reset Request", Charset: "UTF-8" },
        Body: {
          Text: {
            Data:
              `You have requested to reset your password. Please click the following link to reset your password:\n\n${resetLink}\n\n` +
              `If you did not request this, please ignore this email.`,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(mailOptions);
    await sesClient.send(command);

    res.status(200).json({ message: "Password reset link has been sent to your email" });
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully!" });
  } catch (error) {
    console.error("Error in resetting password:", error);
    res.status(500).json({ message: "Error in resetting password" });
  }
});

module.exports = userRouter;
