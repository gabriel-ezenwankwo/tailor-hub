// config/db.js
const mongoose = require('mongoose');
const config = require('./index');

// Mask sensitive info in connection string for logging
const getMaskedUri = uri => {
  if (!uri) return 'undefined';

  try {
    // Replace password in URI with asterisks
    return uri.replace(/(:.*@)/g, ':***@');
  } catch (err) {
    return 'Unable to mask URI';
  }
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Set mongoose debug mode based on configuration
    mongoose.set('debug', config.database.debug);

    // Log connection attempt (with masked URI)
    console.log(`Connecting to MongoDB: ${getMaskedUri(config.database.uri)}`);

    // Create MongoDB connection
    const conn = await mongoose.connect(config.database.uri, config.database.options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Return connection for potential further use
    return conn;
  } catch (err) {
    console.error(`Error: MongoDB connection failed - ${err.message}`);
    process.exit(1);
  }
};

// Close MongoDB connection
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    return true;
  } catch (err) {
    console.error(`Error: Failed to close MongoDB connection - ${err.message}`);
    return false;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  closeDB,
  connection: mongoose.connection,
};
