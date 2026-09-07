"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = void 0;
const express_1 = require("express");
const bookingsService = __importStar(require("./bookings.service"));
const error_handler_1 = require("../../middleware/error-handler");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const schemas_1 = require("./schemas");
exports.bookingsRouter = (0, express_1.Router)();
exports.bookingsRouter.use(auth_1.requireAuth);
exports.bookingsRouter.post('/', (0, validate_1.validateBody)(schemas_1.createBookingSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await bookingsService.createFromCart(req.user, req.body));
}));
exports.bookingsRouter.get('/me', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await bookingsService.findMyBookings(req.user.id));
}));
exports.bookingsRouter.get('/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await bookingsService.findOneForUser(req.params.id, req.user.id, req.user.role));
}));
exports.bookingsRouter.post('/:id/refund-requests', (0, validate_1.validateBody)(schemas_1.requestRefundSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await bookingsService.requestRefund(req.params.id, req.user, req.body.reason));
}));
exports.bookingsRouter.get('/:id/receipt.pdf', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { fileName, buffer } = await bookingsService.generateReceiptPdf(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
}));
//# sourceMappingURL=routes.js.map