const app = require('./app');
const { connectDB } = require('./config/db');
const config = require('./config');

// Connect to database before starting the server
const startServer = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Start the Express server
    app.listen(config.server.port, () => {
      console.log(
        `${config.app.name} API running in ${config.app.environment} mode on port ${config.server.port}`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start server with database connection
startServer();
