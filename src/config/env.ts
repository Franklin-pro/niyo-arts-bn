import dotenv from "dotenv";

dotenv.config();

const requiredInProduction = ["JWT_SECRET"];

export function validateEnv(): void {
  if (process.env.NODE_ENV === "production") {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }
}
