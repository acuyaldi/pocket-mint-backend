// `./config` loads dotenv (side effect) and parses/validates env before any
// other module reads process.env, so it must be imported first.
import { serverConfig, validateConfig } from './config';
import app from './app';

validateConfig();

app.listen(serverConfig.port, () => {
  console.log(`🚀 Server running on http://localhost:${serverConfig.port}`);
  console.log(`📦 Environment: ${serverConfig.nodeEnv}`);
});
