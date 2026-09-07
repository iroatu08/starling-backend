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
exports.env = void 0;
exports.loadEnv = loadEnv;
process.env.DOTENV_CONFIG_QUIET ??= 'true';
require("dotenv/config");
const Joi = __importStar(require("joi"));
const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3001),
    FRONTEND_URL: Joi.string().required(),
    ALLOWED_ORIGINS: Joi.string().optional().allow(''),
    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
    DATABASE_URL: Joi.string().required(),
    DB_SSL: Joi.string().optional().allow(''),
    RESEND_API_KEY: Joi.string().required(),
    MAIL_FROM: Joi.string().required(),
    PAYSTACK_SECRET_KEY: Joi.string().required(),
    PAYSTACK_PUBLIC_KEY: Joi.string().required(),
    PAYSTACK_WEBHOOK_SECRET: Joi.string().required(),
    CLOUDINARY_CLOUD_NAME: Joi.string().optional().allow(''),
    CLOUDINARY_API_KEY: Joi.string().optional().allow(''),
    CLOUDINARY_API_SECRET: Joi.string().optional().allow(''),
    ADMIN_EMAIL: Joi.string().email().required(),
}).unknown(true);
/**
 * Validates process.env against the same Joi schema the NestJS app used
 * (`ConfigModule.forRoot({validationSchema})` in the old `app.module.ts`).
 * Exits the process on failure, matching Nest's default boot behavior.
 */
function loadEnv() {
    const { error, value } = schema.validate(process.env, { abortEarly: false });
    if (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Invalid environment configuration:', error.details.map((d) => d.message).join(', '));
        process.exit(1);
    }
    return value;
}
exports.env = loadEnv();
//# sourceMappingURL=env.js.map