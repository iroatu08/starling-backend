process.env.DOTENV_CONFIG_QUIET ??= 'true';
import 'dotenv/config';
import * as Joi from 'joi';

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

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  FRONTEND_URL: string;
  ALLOWED_ORIGINS?: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  DATABASE_URL: string;
  DB_SSL?: string;
  RESEND_API_KEY: string;
  MAIL_FROM: string;
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  PAYSTACK_WEBHOOK_SECRET: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  ADMIN_EMAIL: string;
}

/**
 * Validates process.env against the same Joi schema the NestJS app used
 * (`ConfigModule.forRoot({validationSchema})` in the old `app.module.ts`).
 * Exits the process on failure, matching Nest's default boot behavior.
 */
export function loadEnv(): Env {
  const { error, value } = schema.validate(process.env, { abortEarly: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:', error.details.map((d) => d.message).join(', '));
    process.exit(1);
  }
  return value as Env;
}

export const env = loadEnv();
