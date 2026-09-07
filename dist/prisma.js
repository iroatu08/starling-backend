"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("./config/env");
const pg_ssl_1 = require("./config/pg-ssl");
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: (0, pg_ssl_1.resolvePrismaDatabaseUrl)({
                databaseUrl: env_1.env.DATABASE_URL,
                nodeEnv: env_1.env.NODE_ENV,
                dbSsl: env_1.env.DB_SSL,
            }),
        },
    },
    log: env_1.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
});
//# sourceMappingURL=prisma.js.map