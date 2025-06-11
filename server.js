const app = require('./app');
const config = require('./config');

app.listen(config.server.port, () => {
  console.log(`${config.app.name} API running in ${config.app.environment} mode on port ${config.server.port}`);
});