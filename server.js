const app = require('./app');
const { connectDB } = require('./config/db');
const config = require('./config');

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start the server after successful database connection
    const server = app.listen(config.server.port, () => {
      console.log(`Server running in ${config.server.env} mode on port ${config.server.port}`);
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', err => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
