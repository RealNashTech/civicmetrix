const requiredEnv = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

export function validateEnv() {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
