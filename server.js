// server.js
const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const session = require('express-session');

// Load environment variables
dotenv.config();

// Check for essential environment variables
if (!process.env.PORT || !process.env.MONGO_URI) {
  console.error("Missing essential environment variables (PORT, MONGO_URI)");
  process.exit(1);
}

// Connect to the database
connectDB();

// Initialize Passport
require('./config/passport')(passport);

// Create Express app
const app = express();

// Middleware
app.use(express.json()); // for JSON payload parsing

// Add session middleware before passport initialization
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize()); // Initialize Passport middleware
app.use(passport.session()); // Enable Passport session support

// Set security-related HTTP headers
const helmet = require('helmet');
app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS)
const cors = require('cors');
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/googleAuth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/segments', require('./routes/segments'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/communicationLog', require('./routes/communicationLog'));

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Process Uncaught Exceptions & Unhandled Rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception: ', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection: ', err);
  process.exit(1);
});
