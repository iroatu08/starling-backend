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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const error_handler_1 = require("../../middleware/error-handler");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const roles_1 = require("../../middleware/roles");
const adminService = __importStar(require("./admin.service"));
const usersService = __importStar(require("../users/users.service"));
const bookingsService = __importStar(require("../bookings/bookings.service"));
const paymentsService = __importStar(require("../payments/payments.service"));
const destinationsService = __importStar(require("../destinations/destinations.service"));
const galleryService = __importStar(require("../gallery/gallery.service"));
const contactService = __importStar(require("../contact/contact.service"));
const schemas_1 = require("./schemas");
const schemas_2 = require("../destinations/schemas");
const schemas_3 = require("../packages/schemas");
const schemas_4 = require("../gallery/schemas");
const schemas_5 = require("../payments/schemas");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use(auth_1.requireAuth, (0, roles_1.requireRole)(client_1.UserRole.admin));
// ─── STATS ─────────────────────────────────────────────
exports.adminRouter.get('/stats', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    res.success(await adminService.getStats());
}));
// ─── EMAIL ─────────────────────────────────────────────
exports.adminRouter.post('/email/send', (0, validate_1.validateBody)(schemas_1.adminSendEmailSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await adminService.sendEmail(req.body));
}));
// ─── USERS ─────────────────────────────────────────────
exports.adminRouter.get('/users', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { page, limit, search } = req.query;
    res.success(await usersService.findAll(page ? Number(page) : undefined, limit ? Number(limit) : undefined, search));
}));
exports.adminRouter.patch('/users/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await usersService.updateUserAdmin(req.params.id, req.body));
}));
// ─── BOOKINGS ────────────────────────────────────────────
exports.adminRouter.get('/bookings', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { page, limit, status, destinationId, userId, from, to } = req.query;
    res.success(await bookingsService.findAll(page ? Number(page) : undefined, limit ? Number(limit) : undefined, status, { destinationId, userId, from, to }));
}));
exports.adminRouter.get('/bookings/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await bookingsService.findOne(req.params.id));
}));
exports.adminRouter.patch('/bookings/:id/status', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await bookingsService.updateStatus(req.params.id, req.body.status, req.user));
}));
// ─── PAYMENTS ────────────────────────────────────────────
exports.adminRouter.get('/payments', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { page, limit, status, search } = req.query;
    res.success(await paymentsService.getAllPayments({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status,
        search,
    }));
}));
exports.adminRouter.patch('/payments/:id/status', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await paymentsService.updateStatus(req.params.id, req.body.status));
}));
exports.adminRouter.get('/refund-requests', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { page, limit, status } = req.query;
    res.success(await paymentsService.getRefundRequests({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status,
    }));
}));
exports.adminRouter.patch('/refund-requests/:id/approve', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await paymentsService.approveRefundRequest(req.params.id, req.user));
}));
exports.adminRouter.patch('/refund-requests/:id/reject', (0, validate_1.validateBody)(schemas_5.rejectRefundSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await paymentsService.rejectRefundRequest(req.params.id, req.user, req.body.reason));
}));
// ─── DESTINATIONS ────────────────────────────────────────
exports.adminRouter.post('/destinations', (0, validate_1.validateBody)(schemas_2.createDestinationSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.create(req.body));
}));
exports.adminRouter.get('/destinations', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    res.success(await destinationsService.findAllAdmin());
}));
exports.adminRouter.get('/destinations/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.findOneAdmin(req.params.id));
}));
exports.adminRouter.patch('/destinations/:id', (0, validate_1.validateBody)(schemas_2.updateDestinationSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.update(req.params.id, req.body));
}));
exports.adminRouter.delete('/destinations/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.remove(req.params.id));
}));
// ─── PACKAGES ────────────────────────────────────────────
exports.adminRouter.post('/destinations/:id/packages', (0, validate_1.validateBody)(schemas_3.createPackageSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.addPackage(req.params.id, req.body));
}));
exports.adminRouter.patch('/destinations/:id/packages/:packageId', (0, validate_1.validateBody)(schemas_3.updatePackageSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.updatePackage(req.params.id, req.params.packageId, req.body));
}));
exports.adminRouter.delete('/destinations/:id/packages/:packageId', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await destinationsService.removePackage(req.params.id, req.params.packageId));
}));
// ─── GALLERY ─────────────────────────────────────────────
exports.adminRouter.post('/gallery/upload', upload.single('file'), (0, validate_1.validateBody)(schemas_4.uploadImageSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await galleryService.uploadImage(req.file, req.body));
}));
exports.adminRouter.delete('/gallery/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await galleryService.remove(req.params.id));
}));
// ─── CONTACT ─────────────────────────────────────────────
exports.adminRouter.get('/contact', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { page, limit } = req.query;
    res.success(await contactService.findAll(page ? Number(page) : undefined, limit ? Number(limit) : undefined));
}));
exports.adminRouter.patch('/contact/:id/read', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await contactService.markRead(req.params.id));
}));
//# sourceMappingURL=routes.js.map