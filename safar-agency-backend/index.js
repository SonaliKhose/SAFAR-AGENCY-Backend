const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const travelRouter = require('./routes/travel');
const userRouter = require('./routes/user');
const carRoutes=require('./routes/cars');
const bookingRouter = require('./routes/bookings');

const app = express();
const port = process.env.PORT || 5000;


// Create a write stream for morgan logs
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs/access.log'), { flags: 'a' });

// Use Morgan middleware to log HTTP requests
app.use(morgan('combined', { stream: accessLogStream }));

// Basic route to test
app.get('/', (req, res) => {
    res.send('Hello, World!');
    logger.info('Root URL Accessed');  // Winston logs
});

// Error handling route (simulate error)
app.get('/error', (req, res) => {
    const error = new Error('Something went wrong');
    logger.error(error.message);  // Winston logs the error
    res.status(500).send('Error occurred!');
});



// Middleware
app.use(bodyParser.json());
const corsOptions = {
  origin: 'http://localhost:3000', 
  credentials: true, 
};
// Middleware to parse cookies
app.use(cookieParser());
// Set up express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true, // Helps prevent XSS attacks
      secure: false, // Set to true in production with HTTPS
      maxAge: 600000 // Session cookie expiration in milliseconds
  }
}));
app.use(cors(corsOptions));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

app.use('/travel', travelRouter); // Routes
app.use('/cars', carRoutes);
app.use('/users', userRouter);
app.use('/travelbookings',bookingRouter)
// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB connection error:', err));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});