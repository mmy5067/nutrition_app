function read(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  databaseUrl: read("DATABASE_URL").replace("postgresql+psycopg2://", "postgresql://"),
  sessionSecret: read("SECRET_KEY", "dev-secret-change-me"),
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
  modelName: process.env.MODEL_NAME ?? "gpt-4o-mini"
};
