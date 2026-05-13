import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { config } from '../config'

export interface TokenUser {
  userId: string
  email: string
}

interface StoredRefreshToken extends TokenUser {
  expiresAt: number
}

const refreshTokens = new Map<string, StoredRefreshToken>()

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000

function signToken(user: TokenUser, expiresIn: SignOptions['expiresIn']): string {
  return jwt.sign({ userId: user.userId, email: user.email }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn,
  })
}

export function signAccessToken(user: TokenUser): string {
  return signToken(user, ACCESS_TOKEN_TTL)
}

export function signRefreshToken(user: TokenUser): string {
  const token = signToken(user, REFRESH_TOKEN_TTL)
  refreshTokens.set(token, {
    ...user,
    expiresAt: Date.now() + REFRESH_TOKEN_MS,
  })
  return token
}

export function verifyRefreshToken(token: string): TokenUser | null {
  const stored = refreshTokens.get(token)
  if (!stored || stored.expiresAt <= Date.now()) {
    refreshTokens.delete(token)
    return null
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    if (!isTokenUserPayload(decoded)) return null
    return { userId: decoded.userId, email: decoded.email }
  } catch {
    refreshTokens.delete(token)
    return null
  }
}

export function revokeRefreshToken(token: string): void {
  refreshTokens.delete(token)
}

export function revokeUserRefreshTokens(userId: string): void {
  for (const [token, stored] of refreshTokens.entries()) {
    if (stored.userId === userId) refreshTokens.delete(token)
  }
}

export function isTokenUserPayload(value: unknown): value is TokenUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'userId' in value &&
    'email' in value &&
    typeof value.userId === 'string' &&
    typeof value.email === 'string'
  )
}
