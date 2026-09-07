"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiRouter = void 0;
const express_1 = require("express");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const document_1 = require("./document");
exports.openApiRouter = (0, express_1.Router)();
const document = (0, document_1.generateOpenApiDocument)();
// Raw spec, matching Nest's implicit `/api/docs-json`.
exports.openApiRouter.get('/docs-json', (_req, res) => {
    res.json(document);
});
exports.openApiRouter.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(document, { swaggerOptions: { persistAuthorization: true } }));
//# sourceMappingURL=routes.js.map