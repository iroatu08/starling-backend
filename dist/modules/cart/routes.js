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
exports.cartRouter = void 0;
const express_1 = require("express");
const cartService = __importStar(require("./cart.service"));
const error_handler_1 = require("../../middleware/error-handler");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const schemas_1 = require("./schemas");
exports.cartRouter = (0, express_1.Router)();
exports.cartRouter.use(auth_1.requireAuth);
exports.cartRouter.get('/', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await cartService.getOrCreateCart(req.user.id));
}));
exports.cartRouter.post('/items', (0, validate_1.validateBody)(schemas_1.addCartItemSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await cartService.addItem(req.user.id, req.body));
}));
exports.cartRouter.patch('/items/:id', (0, validate_1.validateBody)(schemas_1.updateCartItemSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await cartService.updateItem(req.user.id, req.params.id, req.body));
}));
exports.cartRouter.delete('/items/:id', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await cartService.removeItem(req.user.id, req.params.id));
}));
exports.cartRouter.delete('/', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await cartService.clearCart(req.user.id));
}));
//# sourceMappingURL=routes.js.map