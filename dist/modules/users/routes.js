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
exports.usersRouter = void 0;
const express_1 = require("express");
const usersService = __importStar(require("./users.service"));
const error_handler_1 = require("../../middleware/error-handler");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const schemas_1 = require("./schemas");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_1.requireAuth);
exports.usersRouter.get('/me', (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await usersService.getMe(req.user.id));
}));
exports.usersRouter.patch('/me', (0, validate_1.validateBody)(schemas_1.updateUserSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.success(await usersService.updateMe(req.user.id, req.body));
}));
//# sourceMappingURL=routes.js.map