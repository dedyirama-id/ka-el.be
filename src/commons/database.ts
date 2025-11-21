import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const prismaLogger = logger.child({ service: "Prisma" });

export const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

prisma.$on("query", (e) => {
  prismaLogger.debug("Prisma query", {
    query: e.query,
    params: e.params,
    durationMs: e.duration,
    target: e.target,
  });
});

prisma.$on("error", (e) => {
  prismaLogger.error("Prisma error", {
    message: e.message,
    target: e.target,
  });
});

prisma.$on("info", (e) => {
  prismaLogger.info("Prisma info", {
    message: e.message,
    target: e.target,
  });
});

prisma.$on("warn", (e) => {
  prismaLogger.warn("Prisma warn", {
    message: e.message,
    target: e.target,
  });
});
