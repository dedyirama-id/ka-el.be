import { env } from "@/commons/config/env";
import winston from "winston";

const { combine, timestamp, printf, colorize, errors, splat, align, json } = winston.format;

const isProd = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

const consoleFormat = combine(
  errors({ stack: true }),
  splat(),
  timestamp(),
  align(),
  colorize({ all: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return stack
      ? `${timestamp} ${level}: ${message}\n${stack}${metaStr}`
      : `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

const prodFormat = combine(errors({ stack: true }), splat(), timestamp(), json());

export const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: isProd ? prodFormat : consoleFormat,
  transports: [
    new winston.transports.Console({
      silent: isTest,
    }),
  ],
});

winston.addColors({
  error: "bold red",
  warn: "yellow",
  info: "green",
  http: "cyan",
  verbose: "blue",
  debug: "grey",
});
