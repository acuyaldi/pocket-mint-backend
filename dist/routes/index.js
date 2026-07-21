"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const transaction_routes_1 = require("./transaction.routes");
const user_routes_1 = require("./user.routes");
const walletRoutes_1 = require("./walletRoutes");
const dashboardRoutes_1 = require("./dashboardRoutes");
const installmentRoutes_1 = require("./installmentRoutes");
const categoryRoutes_1 = require("./categoryRoutes");
const recurringTransaction_routes_1 = require("./recurringTransaction.routes");
const notification_routes_1 = require("./notification.routes");
const savingGoal_routes_1 = require("./savingGoal.routes");
const router = (0, express_1.Router)();
exports.router = router;
// API v1
router.use('/v1/dashboard', dashboardRoutes_1.dashboardRouter);
router.use('/v1/transactions', transaction_routes_1.transactionRouter);
router.use('/v1/wallets', walletRoutes_1.walletRouter);
router.use('/v1/users', user_routes_1.userRouter);
router.use('/v1/categories', categoryRoutes_1.categoryRouter);
router.use('/v1/bills', installmentRoutes_1.installmentRouter);
router.use('/v1/installments', installmentRoutes_1.installmentRouter);
router.use('/v1/recurring-transactions', recurringTransaction_routes_1.recurringTransactionRouter);
router.use('/v1/notifications', notification_routes_1.notificationRouter);
router.use('/v1/saving-goals', savingGoal_routes_1.savingGoalRouter);
//# sourceMappingURL=index.js.map