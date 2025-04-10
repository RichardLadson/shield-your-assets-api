// File: /src/config/logger.ts
import winston from "winston";

const { combine, timestamp, printf, colorize, simple } = winston.format;

// Define log format with timestamp and level formatting.
const logFormat = combine(
  timestamp(),
  printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create an array of transports including console and file outputs.
const transports: winston.transport[] = [
  new winston.transports.Console(),
  new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  new winston.transports.File({ filename: "logs/combined.log" })
];

// Create logger instance with desired level and format.
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports
});

// If we're not in production, add additional console transport with colorized output.
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), simple())
    })
  );
}

export { logger };
