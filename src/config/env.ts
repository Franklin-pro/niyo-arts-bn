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
];

export function validateEnv(): void {
  if (process.env.NODE_ENV === "production") {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
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
  }
}

validateEnv();
