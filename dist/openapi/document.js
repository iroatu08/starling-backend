"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpenApiDocument = generateOpenApiDocument;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
const schemas_1 = require("../modules/auth/schemas");
const schemas_2 = require("../modules/users/schemas");
const schemas_3 = require("../modules/destinations/schemas");
const schemas_4 = require("../modules/packages/schemas");
const schemas_5 = require("../modules/cart/schemas");
const schemas_6 = require("../modules/bookings/schemas");
const schemas_7 = require("../modules/payments/schemas");
const schemas_8 = require("../modules/contact/schemas");
const schemas_9 = require("../modules/newsletter/schemas");
const schemas_10 = require("../modules/reviews/schemas");
const schemas_11 = require("../modules/admin/schemas");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
const registry = new zod_to_openapi_1.OpenAPIRegistry();
registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
});
const bearerAuth = [{ bearerAuth: [] }];
const idParam = registry.registerParameter('IdParam', zod_1.z.string().uuid().openapi({ param: { name: 'id', in: 'path' } }));
function jsonBody(schema) {
    return { body: { content: { 'application/json': { schema } } } };
}
const okResponse = { description: 'Success' };
const errorResponses = {
    400: { description: 'Validation error' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
};
// ─── AUTH ──────────────────────────────────────────────────────────────
registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['auth'],
    summary: 'Register a new user',
    request: jsonBody(schemas_1.registerSchema),
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['auth'],
    summary: 'Login and get access token',
    request: jsonBody(schemas_1.loginSchema),
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags: ['auth'],
    summary: 'Rotate refresh token (reads the httpOnly `refresh_token` cookie)',
    responses: { 200: okResponse, 401: errorResponses[401] },
});
registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['auth'],
    summary: 'Logout and clear refresh cookie',
    security: bearerAuth,
    responses: { 200: okResponse, 401: errorResponses[401] },
});
registry.registerPath({
    method: 'get',
    path: '/auth/verify/{token}',
    tags: ['auth'],
    summary: 'Verify email address',
    request: { params: zod_1.z.object({ token: zod_1.z.string() }) },
    responses: { 200: okResponse, 404: errorResponses[404] },
});
registry.registerPath({
    method: 'post',
    path: '/auth/forgot-password',
    tags: ['auth'],
    summary: 'Send password reset email',
    request: jsonBody(schemas_1.forgotPasswordSchema),
    responses: { 200: okResponse },
});
registry.registerPath({
    method: 'post',
    path: '/auth/reset-password',
    tags: ['auth'],
    summary: 'Reset password with token',
    request: jsonBody(schemas_1.resetPasswordSchema),
    responses: { 200: okResponse, 400: errorResponses[400] },
});
registry.registerPath({
    method: 'patch',
    path: '/auth/password',
    tags: ['auth'],
    summary: 'Change password (authenticated)',
    security: bearerAuth,
    request: jsonBody(schemas_1.changePasswordSchema),
    responses: { 200: okResponse, ...errorResponses },
});
// ─── USERS ─────────────────────────────────────────────────────────────
registry.registerPath({
    method: 'get',
    path: '/users/me',
    tags: ['users'],
    summary: 'Get the current user profile',
    security: bearerAuth,
    responses: { 200: okResponse, 401: errorResponses[401] },
});
registry.registerPath({
    method: 'patch',
    path: '/users/me',
    tags: ['users'],
    summary: 'Update the current user profile',
    security: bearerAuth,
    request: jsonBody(schemas_2.updateUserSchema),
    responses: { 200: okResponse, ...errorResponses },
});
// ─── DESTINATIONS ────────────────────────────────────────────────────
registry.registerPath({
    method: 'get',
    path: '/destinations',
    tags: ['destinations'],
    summary: 'List active destinations',
    request: {
        query: zod_1.z.object({
            country: zod_1.z.string().optional(),
            featured: zod_1.z.string().optional(),
            minPriceNgn: zod_1.z.string().optional(),
            maxPriceNgn: zod_1.z.string().optional(),
        }),
    },
    responses: { 200: okResponse },
});
registry.registerPath({
    method: 'get',
    path: '/destinations/{id}',
    tags: ['destinations'],
    summary: 'Get a destination by id',
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, 404: errorResponses[404] },
});
// ─── REVIEWS (nested under destinations) ──────────────────────────────
registry.registerPath({
    method: 'get',
    path: '/destinations/{destinationId}/reviews',
    tags: ['reviews'],
    summary: 'List reviews for a destination',
    request: { params: zod_1.z.object({ destinationId: zod_1.z.string().uuid() }) },
    responses: { 200: okResponse, 404: errorResponses[404] },
});
registry.registerPath({
    method: 'post',
    path: '/destinations/{destinationId}/reviews',
    tags: ['reviews'],
    summary: 'Create a review (one per user per destination)',
    security: bearerAuth,
    request: { params: zod_1.z.object({ destinationId: zod_1.z.string().uuid() }), ...jsonBody(schemas_10.createReviewSchema) },
    responses: { 200: okResponse, ...errorResponses, 409: { description: 'Already reviewed' } },
});
// ─── PACKAGES ────────────────────────────────────────────────────────
registry.registerPath({
    method: 'get',
    path: '/packages',
    tags: ['packages'],
    summary: 'List packages, optionally filtered by destination',
    request: { query: zod_1.z.object({ destinationId: zod_1.z.string().uuid().optional() }) },
    responses: { 200: okResponse },
});
registry.registerPath({
    method: 'get',
    path: '/packages/{id}',
    tags: ['packages'],
    summary: 'Get a package by id',
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, 404: errorResponses[404] },
});
// ─── CART ──────────────────────────────────────────────────────────────
registry.registerPath({
    method: 'get',
    path: '/cart',
    tags: ['cart'],
    summary: "Get the current user's cart",
    security: bearerAuth,
    responses: { 200: okResponse, 401: errorResponses[401] },
});
registry.registerPath({
    method: 'post',
    path: '/cart/items',
    tags: ['cart'],
    summary: 'Add an item to the cart',
    security: bearerAuth,
    request: jsonBody(schemas_5.addCartItemSchema),
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/cart/items/{id}',
    tags: ['cart'],
    summary: 'Update a cart item',
    security: bearerAuth,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(schemas_5.updateCartItemSchema) },
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'delete',
    path: '/cart/items/{id}',
    tags: ['cart'],
    summary: 'Remove a cart item',
    security: bearerAuth,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'delete',
    path: '/cart',
    tags: ['cart'],
    summary: 'Clear the cart',
    security: bearerAuth,
    responses: { 200: okResponse, 401: errorResponses[401] },
});
// ─── BOOKINGS ────────────────────────────────────────────────────────
registry.registerPath({
    method: 'post',
    path: '/bookings',
    tags: ['bookings'],
    summary: 'Create a booking from the current cart',
    security: bearerAuth,
    request: jsonBody(schemas_6.createBookingSchema),
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/bookings/me',
    tags: ['bookings'],
    summary: "List the current user's bookings",
    security: bearerAuth,
    responses: { 200: okResponse, 401: errorResponses[401] },
});
registry.registerPath({
    method: 'get',
    path: '/bookings/{id}',
    tags: ['bookings'],
    summary: 'Get a booking by id',
    security: bearerAuth,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/bookings/{id}/refund-requests',
    tags: ['bookings'],
    summary: 'Request a refund for a booking',
    security: bearerAuth,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(schemas_6.requestRefundSchema) },
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/bookings/{id}/receipt.pdf',
    tags: ['bookings'],
    summary: 'Download the booking receipt as a PDF',
    security: bearerAuth,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: {
        200: { description: 'PDF file', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
        ...errorResponses,
    },
});
// ─── PAYMENTS ────────────────────────────────────────────────────────
registry.registerPath({
    method: 'post',
    path: '/payments/initialize',
    tags: ['payments'],
    summary: 'Initialize a Paystack transaction for a booking',
    security: bearerAuth,
    request: jsonBody(schemas_7.initializePaymentSchema),
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/payments/verify/{reference}',
    tags: ['payments'],
    summary: 'Verify a Paystack transaction by reference',
    security: bearerAuth,
    request: { params: zod_1.z.object({ reference: zod_1.z.string() }) },
    responses: { 200: okResponse, ...errorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/payments/webhook',
    tags: ['payments'],
    summary: 'Paystack webhook (HMAC-SHA512 signature verified via the `x-paystack-signature` header)',
    responses: { 200: okResponse, 401: errorResponses[401] },
});
registry.registerPath({
    method: 'get',
    path: '/payments/history',
    tags: ['payments'],
    summary: "List the current user's payment history",
    security: bearerAuth,
    responses: { 200: okResponse, 401: errorResponses[401] },
});
// ─── GALLERY ─────────────────────────────────────────────────────────
registry.registerPath({
    method: 'get',
    path: '/gallery',
    tags: ['gallery'],
    summary: 'List gallery images (paginated)',
    request: {
        query: zod_1.z.object({
            destinationId: zod_1.z.string().uuid().optional(),
            page: zod_1.z.string().optional(),
            limit: zod_1.z.string().optional(),
        }),
    },
    responses: { 200: okResponse },
});
// ─── CONTACT ─────────────────────────────────────────────────────────
registry.registerPath({
    method: 'post',
    path: '/contact',
    tags: ['contact'],
    summary: 'Submit the contact form',
    request: jsonBody(schemas_8.createContactSchema),
    responses: { 200: okResponse, 400: errorResponses[400] },
});
// ─── NEWSLETTER ──────────────────────────────────────────────────────
registry.registerPath({
    method: 'post',
    path: '/newsletter/subscribe',
    tags: ['newsletter'],
    summary: 'Subscribe to the newsletter',
    request: jsonBody(schemas_9.subscribeNewsletterSchema),
    responses: { 200: okResponse, 400: errorResponses[400] },
});
// ─── ADMIN ───────────────────────────────────────────────────────────
const adminSecurity = bearerAuth;
const adminErrorResponses = { ...errorResponses, 403: { description: 'Admin role required' } };
registry.registerPath({
    method: 'get',
    path: '/admin/stats',
    tags: ['admin'],
    summary: 'Dashboard stats',
    security: adminSecurity,
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/admin/email/send',
    tags: ['admin'],
    summary: 'Send an admin email (single recipient or broadcast to all verified users)',
    security: adminSecurity,
    request: jsonBody(schemas_11.adminSendEmailSchema),
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/users',
    tags: ['admin'],
    summary: 'List users (paginated, searchable)',
    security: adminSecurity,
    request: {
        query: zod_1.z.object({ page: zod_1.z.string().optional(), limit: zod_1.z.string().optional(), search: zod_1.z.string().optional() }),
    },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/users/{id}',
    tags: ['admin'],
    summary: 'Update a user (role, isActive, isVerified, profile fields)',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/bookings',
    tags: ['admin'],
    summary: 'List bookings (paginated, filterable)',
    security: adminSecurity,
    request: {
        query: zod_1.z.object({
            page: zod_1.z.string().optional(),
            limit: zod_1.z.string().optional(),
            status: zod_1.z.string().optional(),
            destinationId: zod_1.z.string().uuid().optional(),
            userId: zod_1.z.string().uuid().optional(),
            from: zod_1.z.string().optional(),
            to: zod_1.z.string().optional(),
        }),
    },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/bookings/{id}',
    tags: ['admin'],
    summary: 'Get a booking by id (admin)',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/bookings/{id}/status',
    tags: ['admin'],
    summary: 'Update a booking status',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(zod_1.z.object({ status: zod_1.z.string() })) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/payments',
    tags: ['admin'],
    summary: 'List payments (paginated, filterable, searchable)',
    security: adminSecurity,
    request: {
        query: zod_1.z.object({
            page: zod_1.z.string().optional(),
            limit: zod_1.z.string().optional(),
            status: zod_1.z.string().optional(),
            search: zod_1.z.string().optional(),
        }),
    },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/payments/{id}/status',
    tags: ['admin'],
    summary: 'Update a payment status',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(zod_1.z.object({ status: zod_1.z.string() })) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/refund-requests',
    tags: ['admin'],
    summary: 'List refund requests (paginated, filterable)',
    security: adminSecurity,
    request: {
        query: zod_1.z.object({ page: zod_1.z.string().optional(), limit: zod_1.z.string().optional(), status: zod_1.z.string().optional() }),
    },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/refund-requests/{id}/approve',
    tags: ['admin'],
    summary: 'Approve a refund request and initiate the Paystack refund',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/refund-requests/{id}/reject',
    tags: ['admin'],
    summary: 'Reject a refund request',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(schemas_7.rejectRefundSchema) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/admin/destinations',
    tags: ['admin'],
    summary: 'Create a destination with its packages',
    security: adminSecurity,
    request: jsonBody(schemas_3.createDestinationSchema),
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/destinations',
    tags: ['admin'],
    summary: 'List all destinations (including inactive) with booking counts',
    security: adminSecurity,
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/destinations/{id}',
    tags: ['admin'],
    summary: 'Get a destination with its bookings (admin)',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/destinations/{id}',
    tags: ['admin'],
    summary: 'Update a destination',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(schemas_3.updateDestinationSchema) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'delete',
    path: '/admin/destinations/{id}',
    tags: ['admin'],
    summary: 'Deactivate a destination',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'post',
    path: '/admin/destinations/{id}/packages',
    tags: ['admin'],
    summary: 'Add a package to a destination',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }), ...jsonBody(schemas_4.createPackageSchema) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/destinations/{id}/packages/{packageId}',
    tags: ['admin'],
    summary: 'Update a destination package',
    security: adminSecurity,
    request: {
        params: zod_1.z.object({ id: idParam, packageId: zod_1.z.string().uuid() }),
        ...jsonBody(schemas_4.updatePackageSchema),
    },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'delete',
    path: '/admin/destinations/{id}/packages/{packageId}',
    tags: ['admin'],
    summary: 'Delete a destination package (blocked if used by a confirmed booking)',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam, packageId: zod_1.z.string().uuid() }) },
    responses: { 200: okResponse, ...adminErrorResponses, 409: { description: 'Package in use by a confirmed booking' } },
});
registry.registerPath({
    method: 'post',
    path: '/admin/gallery/upload',
    tags: ['admin'],
    summary: 'Upload a gallery image (multipart/form-data, field name `file`)',
    security: adminSecurity,
    request: {
        body: {
            content: {
                'multipart/form-data': {
                    schema: zod_1.z.object({
                        file: zod_1.z.string().openapi({ type: 'string', format: 'binary' }),
                        destinationId: zod_1.z.string().uuid().optional(),
                        altText: zod_1.z.string().optional(),
                        isFeatured: zod_1.z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'delete',
    path: '/admin/gallery/{id}',
    tags: ['admin'],
    summary: 'Delete a gallery image',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'get',
    path: '/admin/contact',
    tags: ['admin'],
    summary: 'List contact form submissions (paginated)',
    security: adminSecurity,
    request: { query: zod_1.z.object({ page: zod_1.z.string().optional(), limit: zod_1.z.string().optional() }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
registry.registerPath({
    method: 'patch',
    path: '/admin/contact/{id}/read',
    tags: ['admin'],
    summary: 'Mark a contact submission as read',
    security: adminSecurity,
    request: { params: zod_1.z.object({ id: idParam }) },
    responses: { 200: okResponse, ...adminErrorResponses },
});
function generateOpenApiDocument() {
    const generator = new zod_to_openapi_1.OpenApiGeneratorV3(registry.definitions);
    return generator.generateDocument({
        openapi: '3.0.0',
        info: {
            title: 'Starlings Hospitality API',
            description: 'Complete travel booking platform API',
            version: '1.0',
        },
        tags: [
            { name: 'auth', description: 'Authentication endpoints' },
            { name: 'users', description: 'User profile management' },
            { name: 'destinations', description: 'Travel destinations' },
            { name: 'reviews', description: 'Destination reviews' },
            { name: 'packages', description: 'Travel packages' },
            { name: 'cart', description: 'Shopping cart' },
            { name: 'bookings', description: 'Booking management' },
            { name: 'payments', description: "Paystack payment integration" },
            { name: 'gallery', description: 'Media gallery' },
            { name: 'contact', description: 'Contact form' },
            { name: 'newsletter', description: 'Newsletter subscriptions' },
            { name: 'admin', description: 'Admin-only endpoints' },
        ],
    });
}
//# sourceMappingURL=document.js.map