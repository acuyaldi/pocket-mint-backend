"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// `./config` loads dotenv (side effect) and parses/validates env before any
// other module reads process.env, so it must be imported first.
const config_1 = require("./config");
const app_1 = __importDefault(require("./app"));
(0, config_1.validateConfig)();
app_1.default.listen(config_1.serverConfig.port, () => {
    console.log(`🚀 Server running on http://localhost:${config_1.serverConfig.port}`);
    console.log(`📦 Environment: ${config_1.serverConfig.nodeEnv}`);
});
//# sourceMappingURL=server.js.map