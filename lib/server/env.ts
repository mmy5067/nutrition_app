function read(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readDatabaseUrl() {
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured) {
    return "sqlite:./db/local.sqlite";
  }

  return configured.replace("postgresql+psycopg2://", "postgresql://");
}

export const env = {
  databaseUrl: readDatabaseUrl(),
  sessionSecret: read("SECRET_KEY", "dev-secret-change-me"),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  modelName: process.env.MODEL_NAME ?? "gpt-4o-mini",
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123456",
  resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
  emailFrom: process.env.EMAIL_FROM?.trim() ?? "",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:5000").replace(/\/$/, ""),
  smtpHost: process.env.SMTP_HOST?.trim() ?? "",
  smtpPort: process.env.SMTP_PORT?.trim() ?? "465",
  smtpUser: process.env.SMTP_USER?.trim() ?? "",
  smtpPass: process.env.SMTP_PASS?.trim() ?? "",
};