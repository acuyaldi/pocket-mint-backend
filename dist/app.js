"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = require("./routes");
const error_middleware_1 = require("./middlewares/error.middleware");
const config_1 = require("./config");
const rateLimit_1 = require("./middleware/rateLimit");
const cors_1 = require("./middleware/cors");
const app = (0, express_1.default)();
// Trust proxy governs how req.ip is derived (and thus rate-limit keying).
// Defaults to false; set TRUST_PROXY to the reverse-proxy hop count in prod.
app.set('trust proxy', config_1.trustProxy);
// --------------- Middleware ---------------
app.use((0, helmet_1.default)());
app.use(cors_1.corsMiddleware);
app.use((0, morgan_1.default)('dev'));
// --------------- Rate limiting (before body parsing to reject early) ---------------
if (config_1.rateLimitConfig.enabled) {
    app.use('/api', rateLimit_1.generalLimiter);
    app.use('/api', rateLimit_1.mutationLimiter);
}
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// --------------- Routes ---------------
app.use('/api', routes_1.router);
// --------------- Health Check ---------------
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// --------------- Error Handler (must be last) ---------------
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map