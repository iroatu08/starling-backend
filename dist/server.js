"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const cors_origins_1 = require("./config/cors-origins");
const response_envelope_1 = require("./middleware/response-envelope");
const error_handler_1 = require("./middleware/error-handler");
const routes_1 = require("./modules/auth/routes");
const routes_2 = require("./modules/users/routes");
const routes_3 = require("./modules/destinations/routes");
const routes_4 = require("./modules/reviews/routes");
const routes_5 = require("./modules/packages/routes");
const routes_6 = require("./modules/cart/routes");
const routes_7 = require("./modules/bookings/routes");
const routes_8 = require("./modules/payments/routes");
const routes_9 = require("./modules/gallery/routes");
const routes_10 = require("./modules/contact/routes");
const routes_11 = require("./modules/newsletter/routes");
const routes_12 = require("./modules/admin/routes");
const routes_13 = require("./openapi/routes");
const app = (0, express_1.default)();
// Swagger UI needs inline <script>/<style> to render, which helmet's default CSP blocks.
// Apply the strict default everywhere except `/api/docs*`, rather than weakening it app-wide.
const strictHelmet = (0, helmet_1.default)();
const relaxedHelmet = (0, helmet_1.default)({ contentSecurityPolicy: false });
app.use((req, res, next) => (req.path.startsWith('/api/docs') ? relaxedHelmet(req, res, next) : strictHelmet(req, res, next)));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: (0, cors_origins_1.resolveCorsOrigins)({
        allowedOriginsRaw: env_1.env.ALLOWED_ORIGINS,
        frontendUrl: env_1.env.FRONTEND_URL,
        nodeEnv: env_1.env.NODE_ENV,
    }),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use(response_envelope_1.responseEnvelope);
// Global throttle — matches the old `ThrottlerModule.forRoot([{name:'global', ttl:60000, limit:100}])`.
// The auth router applies its own stricter 10/min limit on top of this.
app.use((0, express_rate_limit_1.default)({ windowMs: 60_000, limit: 100, standardHeaders: true, legacyHeaders: false }));
app.use('/auth', routes_1.authRouter);
app.use('/users', routes_2.usersRouter);
app.use('/destinations', routes_3.destinationsRouter);
app.use('/destinations', routes_4.reviewsRouter);
app.use('/packages', routes_5.packagesRouter);
app.use('/cart', routes_6.cartRouter);
app.use('/bookings', routes_7.bookingsRouter);
app.use('/payments', routes_8.paymentsRouter);
app.use('/gallery', routes_9.galleryRouter);
app.use('/contact', routes_10.contactRouter);
app.use('/newsletter', routes_11.newsletterRouter);
app.use('/admin', routes_12.adminRouter);
app.use('/api', routes_13.openApiRouter);
app.use(error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
const port = env_1.env.PORT;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Starlings API (Express) running on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map