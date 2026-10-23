import dotenv from "dotenv";

dotenv.config();

const requiredInProduction = [
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "FLW_SECRET_KEY",
  "FLW_SECRET_HASH",
  "FRONTEND_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
  "CONTACT_TO",
  "CORS_ORIGIN",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export function validateEnv(): void {
  if (process.env.NODE_ENV === "production") {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
    if (
      !process.env.DATABASE_URL &&
      ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"].some(
        (key) => !process.env[key],
      )
    ) {
      throw new Error(
        "Production requires DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.",
      );
    }
    if ((process.env.JWT_SECRET || "").length < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters in production.");
    }
    if ((process.env.ADMIN_PASSWORD || "").length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    }
    try {
      const frontendUrl = new URL(process.env.FRONTEND_URL || "");
      if (!["http:", "https:"].includes(frontendUrl.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error("FRONTEND_URL must be a valid HTTP or HTTPS URL.");
    }

    const corsOrigins = (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim());
    if (
      corsOrigins.some((origin) => {
        try {
          const url = new URL(origin);
          return !["http:", "https:"].includes(url.protocol) || url.origin !== origin;
        } catch {
          return true;
        }
      })
    ) {
      throw new Error(
        "CORS_ORIGIN must contain comma-separated HTTP or HTTPS origins without paths.",
      );
    }
  }

  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const proxyHops = process.env.TRUST_PROXY_HOPS;
  if (
    proxyHops !== undefined &&
    (!/^\d+$/.test(proxyHops) || !Number.isSafeInteger(Number(proxyHops)))
  ) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer.");
  }

  const smtpPort = process.env.SMTP_PORT;
  if (
    smtpPort &&
    (!/^\d+$/.test(smtpPort) ||
      Number(smtpPort) > 65535 ||
      Number(smtpPort) < 1)
  ) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }
}

validateEnv();
