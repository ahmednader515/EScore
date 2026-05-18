import { PrismaClient as PrismaClientNode } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientInstance | undefined;
};

const isEdgeRuntime = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined";

function isPrismaAccelerateUrl(url: string): boolean {
    return (
        url.startsWith("https://") &&
        (url.includes("accelerate.prisma-data.net") || url.includes("prisma-data.net"))
    );
}

function isPostgresUrl(url: string): boolean {
    return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * Resolves the database URL for Prisma Client.
 * - Real Accelerate URLs (https://accelerate...) use the Accelerate extension.
 * - Postgres URLs (Neon pooler/direct) connect without Accelerate.
 * PRISMA_ACCELERATE_URL may hold either format for backward compatibility.
 */
function resolveDatabaseUrl(): string {
    const accelerateUrl = process.env.PRISMA_ACCELERATE_URL?.trim();
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const directDatabaseUrl = process.env.DIRECT_DATABASE_URL?.trim();

    if (accelerateUrl && isPrismaAccelerateUrl(accelerateUrl)) {
        return accelerateUrl;
    }

    const postgresUrl =
        [accelerateUrl, databaseUrl, directDatabaseUrl].find(
            (url) => url && isPostgresUrl(url)
        ) ?? null;

    if (!postgresUrl) {
        throw new Error(
            "Missing database URL. Set DATABASE_URL, DIRECT_DATABASE_URL, or PRISMA_ACCELERATE_URL to a PostgreSQL connection string."
        );
    }

    return postgresUrl;
}

function createPrismaClient() {
    const databaseUrl = resolveDatabaseUrl();
    const useAccelerate = isPrismaAccelerateUrl(databaseUrl);

    if (isEdgeRuntime) {
        const client = new PrismaClientEdge({
            datasourceUrl: databaseUrl,
        });
        return useAccelerate ? client.$extends(withAccelerate()) : client;
    }

    if (useAccelerate) {
        return new PrismaClientNode({
            datasources: {
                db: { url: databaseUrl },
            },
        }).$extends(withAccelerate());
    }

    const urlWithPooling = addConnectionPooling(databaseUrl);

    return new PrismaClientNode({
        datasources: {
            db: { url: urlWithPooling },
        },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}

/**
 * Adds connection pooling parameters to the database URL if they don't already exist.
 * This prevents "too many connections" errors by limiting the connection pool size.
 */
function addConnectionPooling(url: string): string {
    try {
        const urlObj = new URL(url);

        if (!urlObj.searchParams.has("connection_limit")) {
            urlObj.searchParams.set("connection_limit", "10");
        }

        if (!urlObj.searchParams.has("pool_timeout")) {
            urlObj.searchParams.set("pool_timeout", "10");
        }

        if (!urlObj.searchParams.has("connect_timeout")) {
            urlObj.searchParams.set("connect_timeout", "10");
        }

        return urlObj.toString();
    } catch {
        const separator = url.includes("?") ? "&" : "?";
        const hasConnectionLimit = url.includes("connection_limit");
        const hasPoolTimeout = url.includes("pool_timeout");
        const hasConnectTimeout = url.includes("connect_timeout");

        const params: string[] = [];
        if (!hasConnectionLimit) params.push("connection_limit=10");
        if (!hasPoolTimeout) params.push("pool_timeout=10");
        if (!hasConnectTimeout) params.push("connect_timeout=10");

        return params.length > 0 ? `${url}${separator}${params.join("&")}` : url;
    }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!isEdgeRuntime && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
