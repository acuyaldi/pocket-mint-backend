"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = require("./routes");
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
// --------------- Middleware ---------------
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
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