import dotenv from 'dotenv'

dotenv.config()

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function parsePort(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3001
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return DEFAULT_CORS_ORIGINS
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS
}

export const config = {
  port: parsePort(process.env.PORT),
  jwtSecret: process.env.JWT_SECRET ?? 'supersecretkey_change_in_prod',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
}
