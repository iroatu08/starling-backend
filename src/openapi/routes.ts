import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from './document';

export const openApiRouter = Router();

const document = generateOpenApiDocument();

// Raw spec, matching Nest's implicit `/api/docs-json`.
openApiRouter.get('/docs-json', (_req, res) => {
  res.json(document);
});

openApiRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(document, { swaggerOptions: { persistAuthorization: true } }));
