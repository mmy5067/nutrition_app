function readSecret(name: string, minLength: number) {
  const value = process.env[name] ?? "";
  if (value.length < minLength || /^(change[_-]?me|dev-secret|admin123456|your[_-])/i.test(value)) {
    throw new Error(`${name} must be a unique value with at least ${minLength} characters. Run npm run setup for local configuration.`);
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
  sessionSecret: readSecret("SECRET_KEY", 32),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  modelName: process.env.MODEL_NAME ?? "gpt-4o-mini",
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@example.com",
  adminPassword: readSecret("ADMIN_PASSWORD", 12),
  emailFrom: process.env.EMAIL_FROM?.trim() ?? "",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:5000").replace(/\/$/, ""),
  smtpHost: process.env.SMTP_HOST?.trim() ?? "",
  smtpPort: process.env.SMTP_PORT?.trim() ?? "465",
  smtpUser: process.env.SMTP_USER?.trim() ?? "",
  smtpPass: process.env.SMTP_PASS?.trim() ?? "",
};
