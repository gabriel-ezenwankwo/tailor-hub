/**
 * Database Connection Module
 * 
 * Provides a generic database connection function that uses configuration
 * from config/index.js. This is a placeholder implementation that can be
 * extended with specific database driver code in the future.
 */

const config = require('./index');

/**
 * Connect to the database
 * 
 * @returns {Promise<void>} Resolves when connection is established
 * @throws {Error} If connection fails
 */
const connectDB = async () => {
  try {
    // Log connection attempt
    console.log(`Attempting to connect to database at ${maskConnectionString(config.database.url)}`);
    
    // This is where specific database driver connection code would go
    // For example: await mongoose.connect(config.database.url, config.database.options);
    
    // Simulate connection delay for demonstration purposes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Log successful connection
    console.log(`Database connection established successfully in ${config.app.environment} environment`);
    
    return { success: true, message: 'Database connected' };
  } catch (error) {
    // Log connection failure with error details
    console.error('Database connection failed');
    console.error(error);
    
    // Re-throw the error for the caller to handle
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

/**
 * Masks sensitive information in database connection string 
 * for safe logging
 * 
 * @param {string} connectionString - The database connection string
 * @returns {string} Masked connection string
 */
const maskConnectionString = (connectionString) => {
  try {
    // This is a simple implementation that works for common connection string formats
    // It can be expanded to handle various database connection string formats
    
    // For URLs with authentication information
    if (connectionString.includes('@')) {
      const parts = connectionString.split('@');
      const credentialsPart = parts[0];
      const hostPart = parts[1];
      
      // Find where the credentials start (after ://)
      const protocolSplit = credentialsPart.split('://');
      const protocol = protocolSplit.length > 1 ? `${protocolSplit[0]}://` : '';
      const credentials = protocolSplit.length > 1 ? protocolSplit[1] : credentialsPart;
      
      // If there's a password, mask it
      if (credentials.includes(':')) {
        const [username, _] = credentials.split(':');
        return `${protocol}${username}:******@${hostPart}`;
      }
      
      // Just a username, no need to mask
      return connectionString;
    }
    
    // For connection strings without authentication, return as is
    return connectionString;
  } catch (error) {
    // If any parsing error occurs, return a fully masked string
    return 'Connection string (masked for security)';
  }
};

/**
 * Close database connection
 * 
 * @returns {Promise<void>} Resolves when connection is closed
 */
const closeDB = async () => {
  try {
    // This is where specific database driver disconnection code would go
    // For example: await mongoose.connection.close();
    
    console.log('Database connection closed successfully');
    return { success: true, message: 'Database disconnected' };
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  closeDB,
  maskConnectionString
};