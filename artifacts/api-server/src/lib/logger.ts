import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

function redactSensitiveText(value: string) {
  return value
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi, "mongodb://[REDACTED]")
    .replace(/\b(password|passwd|token|secret|authorization)\b(\s*[:=]\s*)[^\s,;"'`]+/gi, "$1$2[REDACTED]");
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  serializers: {
    err(error: Error) {
      return {
        type: error?.name,
        message: redactSensitiveText(error?.message ?? String(error)),
        stack: error?.stack ? redactSensitiveText(error.stack) : undefined,
      };
    },
  },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
