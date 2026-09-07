import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { resolveCorsOrigins } from './config/cors-origins';
import { responseEnvelope } from './middleware/response-envelope';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

import { authRouter } from './modules/auth/routes';
import { usersRouter } from './modules/users/routes';
import { destinationsRouter } from './modules/destinations/routes';
import { reviewsRouter } from './modules/reviews/routes';
import { packagesRouter } from './modules/packages/routes';
import { cartRouter } from './modules/cart/routes';
import { bookingsRouter } from './modules/bookings/routes';
import { paymentsRouter } from './modules/payments/routes';
import { galleryRouter } from './modules/gallery/routes';
import { contactRouter } from './modules/contact/routes';
import { newsletterRouter } from './modules/newsletter/routes';
import { adminRouter } from './modules/admin/routes';
import { openApiRouter } from './openapi/routes';

const app = express();

// Swagger UI needs inline <script>/<style> to render, which helmet's default CSP blocks.
// Apply the strict default everywhere except `/api/docs*`, rather than weakening it app-wide.
const strictHelmet = helmet();
const relaxedHelmet = helmet({ contentSecurityPolicy: false });
app.use((req, res, next) => (req.path.startsWith('/api/docs') ? relaxedHelmet(req, res, next) : strictHelmet(req, res, next)));
app.use(cookieParser());

app.use(
  cors({
    origin: resolveCorsOrigins({
      allowedOriginsRaw: env.ALLOWED_ORIGINS,
      frontendUrl: env.FRONTEND_URL,
      nodeEnv: env.NODE_ENV,
    }),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());
app.use(responseEnvelope);

// Global throttle — matches the old `ThrottlerModule.forRoot([{name:'global', ttl:60000, limit:100}])`.
// The auth router applies its own stricter 10/min limit on top of this.
app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: true, legacyHeaders: false }));

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/destinations', destinationsRouter);
app.use('/destinations', reviewsRouter);
app.use('/packages', packagesRouter);
app.use('/cart', cartRouter);
app.use('/bookings', bookingsRouter);
app.use('/payments', paymentsRouter);
app.use('/gallery', galleryRouter);
app.use('/contact', contactRouter);
app.use('/newsletter', newsletterRouter);
app.use('/admin', adminRouter);
app.use('/api', openApiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = env.PORT;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Starlings API (Express) running on http://localhost:${port}`);
});
