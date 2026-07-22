import { z } from "zod";

/**
 * Validação de variáveis de ambiente em runtime.
 * Falha rápido no boot se algo estiver faltando — evita erros
 * silenciosos em produção.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres — gere um com `openssl rand -base64 32`"),
  // URL pública do app — usada pelo Better Auth para validar a origem das
  // requisições (CSRF) e pelo Playwright/healthchecks.
  BASE_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = envSchema.parse(process.env);
